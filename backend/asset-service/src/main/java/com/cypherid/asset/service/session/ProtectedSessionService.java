package com.cypherid.asset.service.session;

import com.cypherid.asset.service.config.ProtectionConfigurationService;
import com.cypherid.asset.service.domain.ProtectedSessionEntity;
import com.cypherid.asset.service.dto.IssueSessionResponse;
import com.cypherid.asset.service.dto.WatermarkDto;
import com.cypherid.asset.service.exception.FabricUnavailableException;
import com.cypherid.asset.service.exception.ForbiddenException;
import com.cypherid.asset.service.exception.InvalidSessionException;
import com.cypherid.asset.service.fabric.FabricAssetClient;
import com.cypherid.asset.service.repository.ProtectedSessionRepository;
import com.cypherid.asset.service.watermark.SessionWatermark;
import com.cypherid.asset.service.watermark.WatermarkService;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.hyperledger.fabric.client.GatewayException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Type;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * ProtectedSessionService — issues and manages protected sessions
 * (docs/backend/10_PROTECTED_SESSION_SERVICE.md,
 * docs/protection/07_PROTECTED_SESSION_LIFECYCLE.md).
 * <p>
 * Hot state lives in Redis (session:{sessionId}) with the session TTL;
 * every transition is mirrored to PostgreSQL for audit. Session tokens are
 * short-lived HS256 JWTs signed with a session-specific secret.
 */
@Service
public class ProtectedSessionService {

    private static final Logger logger = LoggerFactory.getLogger(ProtectedSessionService.class);

    private static final String SESSION_KEY_PREFIX = "session:";
    private static final String EVENT_WINDOW_SEP   = ":events:";
    private static final String CHUNK_LOG_SUFFIX   = ":chunks";

    private static final Type STRING_MAP_TYPE = new TypeToken<Map<String, String>>() {}.getType();

    private final StringRedisTemplate redis;
    private final ProtectedSessionRepository sessionRepository;
    private final SessionTokenService tokenService;
    private final WatermarkService watermarkService;
    private final ProtectionConfigurationService config;
    private final FabricAssetClient fabricClient;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Gson gson = new Gson();

    public ProtectedSessionService(StringRedisTemplate redis,
                                   ProtectedSessionRepository sessionRepository,
                                   SessionTokenService tokenService,
                                   WatermarkService watermarkService,
                                   ProtectionConfigurationService config,
                                   FabricAssetClient fabricClient) {
        this.redis = redis;
        this.sessionRepository = sessionRepository;
        this.tokenService = tokenService;
        this.watermarkService = watermarkService;
        this.config = config;
        this.fabricClient = fabricClient;
    }

    // =========================================================================
    // Issuance
    // =========================================================================

    /**
     * Issues a protected session after access has been granted.
     * Profile is derived from the asset's on-chain classification.
     */
    @Transactional
    public IssueSessionResponse issueSession(String userDid, String contentId, String contentType) {
        String classification = fetchClassification(contentId);
        String profile = config.profileForClassification(classification);
        long ttlMinutes = config.sessionTtlMinutes(profile);

        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(ttlMinutes * 60);
        String sessionId = UUID.randomUUID().toString();

        // Watermark for this session (persisted)
        SessionWatermark watermark = watermarkService.generate(sessionId, userDid, contentId);

        // PostgreSQL audit mirror
        ProtectedSessionEntity entity = new ProtectedSessionEntity();
        entity.setId(UUID.fromString(sessionId));
        entity.setUserDid(userDid);
        entity.setContentId(contentId);
        entity.setContentType(contentType);
        entity.setProtectionProfile(profile);
        entity.setSessionSeed(randomBytes(32));
        entity.setWatermarkId(watermark.id());
        entity.setState(SessionStateMachine.STATE_AUTHORIZED);
        entity.setIssuedAt(now);
        entity.setExpiresAt(expiresAt);
        sessionRepository.save(entity);

        // Redis hot state
        SessionState state = new SessionState(sessionId, userDid, contentId, contentType, profile,
                SessionStateMachine.STATE_AUTHORIZED, 0, 0, expiresAt.toString());
        redis.opsForValue().set(key(sessionId), gson.toJson(state), Duration.ofMinutes(ttlMinutes));

        // Session token
        String token = tokenService.issue(sessionId, userDid, contentId, contentType, profile, expiresAt);

        logger.info("Protected session issued: {} for user: {} content: {} profile: {}",
                sessionId, userDid, contentId, profile);

        return new IssueSessionResponse(sessionId, token, expiresAt.toString(),
                SessionStateMachine.STATE_AUTHORIZED,
                new WatermarkDto(watermark.displayId(), watermark.userDisplay(), watermark.timestampLabel()));
    }

    // =========================================================================
    // Validation / state access
    // =========================================================================

    /**
     * Validates a session token and returns the live session state.
     * Falls back to the PostgreSQL mirror if Redis state was lost (restart).
     */
    public SessionState validateSession(String token) {
        Claims claims;
        try {
            claims = tokenService.parse(token);
        } catch (JwtException | IllegalArgumentException e) {
            throw new InvalidSessionException("INVALID_SESSION_TOKEN", "Invalid session token");
        }

        String sessionId = claims.getSubject();
        return getState(sessionId);
    }

    /**
     * Loads the live session state by ID (from Redis, falling back to DB).
     */
    public SessionState getState(String sessionId) {
        String redisJson = redis.opsForValue().get(key(sessionId));
        if (redisJson != null) {
            SessionState state = gson.fromJson(redisJson, SessionState.class);
            if (isExpired(state)) {
                expireSession(sessionId);
                throw new InvalidSessionException("SESSION_EXPIRED", "Protected session has expired");
            }
            return state;
        }
        return rehydrateFromDb(sessionId);
    }

    /**
     * Updates session state in Redis (hot) and mirrors to PostgreSQL (audit).
     */
    public void updateState(String sessionId, String newState) {
        String redisJson = redis.opsForValue().get(key(sessionId));
        if (redisJson == null) {
            throw new InvalidSessionException("SESSION_NOT_FOUND", "Session not found: " + sessionId);
        }
        SessionState current = gson.fromJson(redisJson, SessionState.class);
        SessionState updated = current.withState(newState);
        redis.opsForValue().set(key(sessionId), gson.toJson(updated), remainingTtl(current));

        sessionRepository.findById(UUID.fromString(sessionId)).ifPresent(entity -> {
            entity.setState(newState);
            sessionRepository.save(entity);
        });
    }

    /**
     * Records a delivered chunk index on the session (audit + progress).
     */
    public void recordChunkDelivery(String sessionId, int chunkIndex) {
        String redisJson = redis.opsForValue().get(key(sessionId));
        if (redisJson == null) return;
        SessionState current = gson.fromJson(redisJson, SessionState.class);
        SessionState updated = current.withChunkCount(Math.max(current.chunkCount(), chunkIndex + 1));
        redis.opsForValue().set(key(sessionId), gson.toJson(updated), remainingTtl(current));

        sessionRepository.findById(UUID.fromString(sessionId)).ifPresent(entity -> {
            entity.setChunkCount(updated.chunkCount());
            entity.setLastChunkAt(Instant.now());
            sessionRepository.save(entity);
        });
    }

    /**
     * Closes a session (manual close / admin invalidation). Expires Redis state
     * and marks the PostgreSQL mirror closed.
     */
    public void closeSession(String sessionId, String callerDid) {
        SessionState state = getState(sessionId);
        if (callerDid != null && !callerDid.equals(state.userDID())) {
            throw new ForbiddenException("SESSION_NOT_OWNED", "Caller does not own session: " + sessionId);
        }
        redis.delete(key(sessionId));

        sessionRepository.findById(UUID.fromString(sessionId)).ifPresent(entity -> {
            entity.setState(SessionStateMachine.STATE_EXPIRED);
            entity.setClosedAt(Instant.now());
            sessionRepository.save(entity);
        });

        logger.info("Protected session closed: {}", sessionId);
    }

    // =========================================================================
    // Event windows & rate limiting (Redis ZSets)
    // =========================================================================

    /**
     * Records an event occurrence and returns how many times this event type
     * has occurred within the configured window (including this one).
     */
    public int incrementEventWindow(String sessionId, String eventType) {
        String zkey = eventWindowKey(sessionId, eventType);
        long now = System.currentTimeMillis();
        long windowStart = now - (long) config.getEventWindowMinutes() * 60_000;
        redis.opsForZSet().removeRangeByScore(zkey, 0, windowStart);
        redis.opsForZSet().add(zkey, String.valueOf(now), now);
        Long count = redis.opsForZSet().size(zkey);
        return count == null ? 0 : count.intValue();
    }

    /**
     * True if the session exceeds the chunk request rate limit.
     */
    public boolean exceedsChunkRate(String sessionId) {
        String zkey = chunkLogKey(sessionId);
        long now = System.currentTimeMillis();
        long windowStart = now - 60_000;
        redis.opsForZSet().removeRangeByScore(zkey, 0, windowStart);
        Long count = redis.opsForZSet().size(zkey);
        return count != null && count >= config.getChunkRateLimitPerMinute();
    }

    /**
     * Logs a chunk delivery for rate limiting / audit.
     */
    public void logChunkDelivery(String sessionId) {
        String zkey = chunkLogKey(sessionId);
        long now = System.currentTimeMillis();
        redis.opsForZSet().add(zkey, String.valueOf(now), now);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private String fetchClassification(String contentId) {
        try {
            String json = fabricClient.queryAsset(contentId);
            Map<String, String> asset = gson.fromJson(json, STRING_MAP_TYPE);
            return asset != null ? asset.getOrDefault("classification", "UNCLASSIFIED") : "UNCLASSIFIED";
        } catch (GatewayException e) {
            throw new FabricUnavailableException("Blockchain network unavailable", e);
        }
    }

    private SessionState rehydrateFromDb(String sessionId) {
        ProtectedSessionEntity entity = sessionRepository.findById(UUID.fromString(sessionId))
                .orElseThrow(() -> new InvalidSessionException("SESSION_NOT_FOUND",
                        "Protected session not found: " + sessionId));

        if (entity.getExpiresAt().isBefore(Instant.now())
                || SessionStateMachine.STATE_EXPIRED.equals(entity.getState())) {
            throw new InvalidSessionException("SESSION_EXPIRED", "Protected session has expired");
        }

        SessionState state = new SessionState(sessionId, entity.getUserDid(), entity.getContentId(),
                entity.getContentType(), entity.getProtectionProfile(), entity.getState(),
                entity.getChunkCount(), 0, entity.getExpiresAt().toString());

        long remainingSeconds = Math.max(1, Duration.between(Instant.now(), entity.getExpiresAt()).getSeconds());
        redis.opsForValue().set(key(sessionId), gson.toJson(state), Duration.ofSeconds(remainingSeconds));
        return state;
    }

    private void expireSession(String sessionId) {
        redis.delete(key(sessionId));
        sessionRepository.findById(UUID.fromString(sessionId)).ifPresent(entity -> {
            entity.setState(SessionStateMachine.STATE_EXPIRED);
            entity.setClosedAt(Instant.now());
            sessionRepository.save(entity);
        });
    }

    private boolean isExpired(SessionState state) {
        try {
            return Instant.parse(state.expiresAt()).isBefore(Instant.now());
        } catch (Exception e) {
            return true;
        }
    }

    private Duration remainingTtl(SessionState state) {
        try {
            long seconds = Duration.between(Instant.now(), Instant.parse(state.expiresAt())).getSeconds();
            return Duration.ofSeconds(Math.max(1, seconds));
        } catch (Exception e) {
            return Duration.ofMinutes(10);
        }
    }

    private byte[] randomBytes(int n) {
        byte[] bytes = new byte[n];
        secureRandom.nextBytes(bytes);
        return bytes;
    }

    private String key(String sessionId)                { return SESSION_KEY_PREFIX + sessionId; }
    private String eventWindowKey(String sessionId, String eventType) {
        return SESSION_KEY_PREFIX + sessionId + EVENT_WINDOW_SEP + eventType;
    }
    private String chunkLogKey(String sessionId)        { return SESSION_KEY_PREFIX + sessionId + CHUNK_LOG_SUFFIX; }
}