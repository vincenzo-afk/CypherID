package com.cypherid.asset.service.watermark;

import com.cypherid.asset.service.domain.WatermarkEntity;
import com.cypherid.asset.service.exception.ResourceNotFoundException;
import com.cypherid.asset.service.repository.ProtectedSessionRepository;
import com.cypherid.asset.service.repository.WatermarkRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.UUID;

/**
 * WatermarkService — generates and persists session watermarks, and provides
 * admin forensic lookup (docs/backend/11_WATERMARK_SERVICE.md).
 * <p>
 * Privacy: the full DID never appears in the watermark. Forensic lookup maps
 * displayId → session → DID and requires admin access.
 */
@Service
public class WatermarkService {

    private static final Logger logger = LoggerFactory.getLogger(WatermarkService.class);

    private static final DateTimeFormatter TIMESTAMP_FORMAT =
            DateTimeFormatter.ofPattern("yyyyMMdd-HHmm");
    private static final char[] TOKEN_ALPHABET =
            "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray(); // no ambiguous chars

    private final WatermarkRepository watermarkRepository;
    private final ProtectedSessionRepository sessionRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public WatermarkService(WatermarkRepository watermarkRepository,
                            ProtectedSessionRepository sessionRepository) {
        this.watermarkRepository = watermarkRepository;
        this.sessionRepository = sessionRepository;
    }

    /**
     * Generates a watermark for a session, persists it, and returns it.
     */
    @Transactional
    public SessionWatermark generate(String sessionId, String userDid, String contentId) {
        String displayId = sessionId.substring(0, Math.min(8, sessionId.length())).toUpperCase();
        String userDisplay = "U:" + hashAndTruncate(userDid, 6);
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMAT);
        String token = generateToken(8);

        WatermarkEntity entity = new WatermarkEntity();
        entity.setId(UUID.randomUUID());
        entity.setSessionId(UUID.fromString(sessionId));
        entity.setDisplayId(displayId);
        entity.setUserDisplay(userDisplay);
        entity.setContentId(contentId);
        entity.setTimestampLabel(timestamp);
        entity.setRandomToken(token);
        watermarkRepository.save(entity);

        logger.info("Watermark generated for session {}: {}", sessionId, displayId);
        return new SessionWatermark(entity.getId(), displayId, userDisplay, contentId, timestamp, token);
    }

    /**
     * Forensic lookup by displayId (admin only). Returns the watermark record
     * and the owning session's user DID.
     */
    @Transactional(readOnly = true)
    public WatermarkForensic lookup(String displayId) {
        WatermarkEntity watermark = watermarkRepository.findByDisplayId(displayId)
                .orElseThrow(() -> new ResourceNotFoundException("WATERMARK_NOT_FOUND",
                        "No watermark found for displayId: " + displayId));

        String userDid = sessionRepository.findById(watermark.getSessionId())
                .map(e -> e.getUserDid())
                .orElse(null);
        return new WatermarkForensic(watermark).withUserDid(userDid);
    }

    /**
     * Forensic lookup result: watermark display info + resolved user/session.
     */
    public record WatermarkForensic(
        String displayId,
        UUID sessionId,
        String userDid,
        String contentId,
        String timestampLabel,
        String createdAt
    ) {
        WatermarkForensic(WatermarkEntity w) {
            this(w.getDisplayId(), w.getSessionId(), null, w.getContentId(),
                    w.getTimestampLabel(), w.getCreatedAt().toString());
        }
        public WatermarkForensic withUserDid(String did) {
            return new WatermarkForensic(displayId, sessionId, did, contentId, timestampLabel, createdAt);
        }
    }

    private String hashAndTruncate(String input, int chars) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash).substring(0, chars);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private String generateToken(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(TOKEN_ALPHABET[secureRandom.nextInt(TOKEN_ALPHABET.length)]);
        }
        return sb.toString();
    }
}