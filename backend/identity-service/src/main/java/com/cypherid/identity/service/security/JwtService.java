package com.cypherid.identity.service.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
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
 * RedisTemplate is optional: in demo mode, DemoJwtService overrides all
 * Redis-backed methods with in-memory alternatives.
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

    @Autowired(required = false)
    protected RedisTemplate<String, String> redisTemplate;

    public JwtService() {}

    @Autowired(required = false)
    public JwtService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

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

    public String issueRefreshToken(String did) {
        String refreshToken = UUID.randomUUID().toString();
        if (redisTemplate != null) {
            String key = REDIS_REFRESH_PREFIX + refreshToken;
            redisTemplate.opsForValue().set(key, did, Duration.ofSeconds(refreshExpirationSeconds));
        }
        return refreshToken;
    }

    public Claims validateToken(String token) {
        Jws<Claims> claimsJws = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token);

        Claims claims = claimsJws.getPayload();

        if (redisTemplate != null) {
            String jti = claims.getId();
            if (jti != null && Boolean.TRUE.equals(redisTemplate.hasKey(REDIS_BLACKLIST_PREFIX + jti))) {
                throw new RuntimeException("Token has been revoked");
            }
        }

        return claims;
    }

    public String validateRefreshToken(String refreshToken) {
        if (redisTemplate != null) {
            String key = REDIS_REFRESH_PREFIX + refreshToken;
            String did = redisTemplate.opsForValue().get(key);
            if (did == null) {
                throw new RuntimeException("Invalid or expired refresh token");
            }
            return did;
        }
        throw new RuntimeException("Redis not available in demo mode");
    }

    public void revokeAccessToken(String token) {
        if (redisTemplate == null) return;
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

    public void revokeRefreshToken(String refreshToken) {
        if (redisTemplate != null) {
            redisTemplate.delete(REDIS_REFRESH_PREFIX + refreshToken);
        }
    }

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
