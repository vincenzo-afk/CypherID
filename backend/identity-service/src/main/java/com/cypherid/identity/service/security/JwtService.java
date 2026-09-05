package com.cypherid.identity.service.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;

/**
 * JwtService — issues, validates, and revokes JWT tokens.
 * <p>
 * Token structure:
 * - sub: DID (did:cypherid:0x...)
 * - org: organization (DRDO, BEL, etc.)
 * - roles: comma-separated roles (CLEARANCE_LEVEL_3,...)
 * - jti: unique token ID (for revocation tracking in Redis)
 * <p>
 * Refresh tokens stored as httpOnly cookies.
 * JWT blacklist maintained in Redis (keyed by jti).
 */
@Service
public class JwtService {

    private static final Logger logger = LoggerFactory.getLogger(JwtService.class);

    private static final String REDIS_BLACKLIST_PREFIX = "jwt:blacklist:";
    private static final String REDIS_REFRESH_PREFIX   = "jwt:refresh:";

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration-seconds:900}")
    private long expirationSeconds;

    @Value("${jwt.refresh-expiration-seconds:86400}")
    private long refreshExpirationSeconds;

    private final RedisTemplate<String, String> redisTemplate;

    public JwtService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Issues a signed JWT access token for the given DID.
     */
    public String issueAccessToken(String did, String org, List<String> roles) {
        String jti = UUID.randomUUID().toString();
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(expirationSeconds);

        return Jwts.builder()
                .id(jti)
                .subject(did)
                .claim("org", org)
                .claim("roles", String.join(",", roles))
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Issues a refresh token (opaque UUID stored in Redis).
     */
    public String issueRefreshToken(String did) {
        String refreshToken = UUID.randomUUID().toString();
        String key = REDIS_REFRESH_PREFIX + refreshToken;
        redisTemplate.opsForValue().set(key, did, Duration.ofSeconds(refreshExpirationSeconds));
        return refreshToken;
    }

    /**
     * Validates a JWT access token. Returns Claims if valid.
     * Throws JwtException if invalid or expired.
     * Throws RuntimeException if token is blacklisted.
     */
    public Claims validateToken(String token) {
        Jws<Claims> claimsJws = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token);

        Claims claims = claimsJws.getPayload();

        // Check Redis blacklist
        String jti = claims.getId();
        if (jti != null && Boolean.TRUE.equals(redisTemplate.hasKey(REDIS_BLACKLIST_PREFIX + jti))) {
            throw new RuntimeException("Token has been revoked");
        }

        return claims;
    }

    /**
     * Validates a refresh token. Returns the DID it belongs to.
     */
    public String validateRefreshToken(String refreshToken) {
        String key = REDIS_REFRESH_PREFIX + refreshToken;
        String did = redisTemplate.opsForValue().get(key);
        if (did == null) {
            throw new RuntimeException("Invalid or expired refresh token");
        }
        return did;
    }

    /**
     * Blacklists an access token by its JTI in Redis.
     * Used during logout.
     */
    public void revokeAccessToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            String jti = claims.getId();
            long remainingSeconds = (claims.getExpiration().getTime() - System.currentTimeMillis()) / 1000;

            if (jti != null && remainingSeconds > 0) {
                redisTemplate.opsForValue().set(
                        REDIS_BLACKLIST_PREFIX + jti,
                        "revoked",
                        Duration.ofSeconds(remainingSeconds));
                logger.info("Access token revoked: jti={}", jti);
            }
        } catch (JwtException e) {
            logger.warn("Could not revoke token (already invalid): {}", e.getMessage());
        }
    }

    /**
     * Invalidates a refresh token.
     */
    public void revokeRefreshToken(String refreshToken) {
        redisTemplate.delete(REDIS_REFRESH_PREFIX + refreshToken);
    }

    /**
     * Extracts DID from token without full validation (for logging purposes only).
     */
    public String extractDid(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload()
                    .getSubject();
        } catch (Exception e) {
            return "unknown";
        }
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public long getExpirationSeconds()        { return expirationSeconds; }
    public long getRefreshExpirationSeconds() { return refreshExpirationSeconds; }
}
