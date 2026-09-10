package com.cypherid.identity.service.demo;

import com.cypherid.identity.service.security.JwtService;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Demo JWT service — stores refresh tokens and blacklist in memory
 * instead of Redis. Overrides JwtService when demo profile is active.
 */
@Service
@Primary
@Profile("demo")
public class DemoJwtService extends JwtService {

    private static final Logger logger = LoggerFactory.getLogger(DemoJwtService.class);

    private final Map<String, String> refreshTokens = new ConcurrentHashMap<>();
    private final Map<String, Long> blacklisted = new ConcurrentHashMap<>();

    public DemoJwtService() {
        // We need to call super(null) but JwtService doesn't allow null RedisTemplate.
        // So we override all methods that use Redis.
        super(null);
    }

    @Override
    public String issueRefreshToken(String did) {
        String refreshToken = UUID.randomUUID().toString();
        refreshTokens.put(refreshToken, did);
        logger.debug("Demo: stored refresh token for DID={}", did);
        return refreshToken;
    }

    @Override
    public String validateRefreshToken(String refreshToken) {
        String did = refreshTokens.get(refreshToken);
        if (did == null) {
            throw new RuntimeException("Invalid or expired refresh token");
        }
        return did;
    }

    @Override
    public void revokeAccessToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSecretKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            String jti = claims.getId();
            long remainingMs = claims.getExpiration().getTime() - System.currentTimeMillis();
            if (jti != null && remainingMs > 0) {
                blacklisted.put(jti, System.currentTimeMillis() + remainingMs);
                logger.debug("Demo: blacklisted token jti={}", jti);
            }
        } catch (JwtException e) {
            logger.warn("Could not revoke token: {}", e.getMessage());
        }
    }

    @Override
    public void revokeRefreshToken(String refreshToken) {
        refreshTokens.remove(refreshToken);
    }

    private SecretKey getSecretKey() {
        return Keys.hmacShaKeyFor("CypherID-SIH-2026-Super-Secret-Key-Must-Be-At-Least-256-Bits-Long!".getBytes(StandardCharsets.UTF_8));
    }
}
