package com.cypherid.asset.service.session;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

/**
 * SessionTokenService — issues and validates protected session JWTs
 * (docs/backend/10_PROTECTED_SESSION_SERVICE.md).
 * <p>
 * Short-lived HS256 tokens signed with a session-specific secret
 * (NOT the main access-token JWT key). Claims: sub=sessionId, userDID,
 * contentId, contentType, profile, exp.
 */
@Service
public class SessionTokenService {

    private final String secret;
    private final String issuer;

    public SessionTokenService(
            @Value("${protection.session-jwt-secret:CypherID-Protected-Session-Secret-2026!!}") String secret,
            @Value("${protection.session-token-issuer:cypherid-protected-session}") String issuer) {
        this.secret = secret;
        this.issuer = issuer;
    }

    /**
     * Issues a session token valid until expiresAt.
     */
    public String issue(String sessionId, String userDid, String contentId,
                        String contentType, String profile, Instant expiresAt) {
        return Jwts.builder()
                .issuer(issuer)
                .subject(sessionId)
                .claim("userDID", userDid)
                .claim("contentId", contentId)
                .claim("contentType", contentType)
                .claim("profile", profile)
                .issuedAt(new Date())
                .expiration(Date.from(expiresAt))
                .signWith(signingKey())
                .compact();
    }

    /**
     * Parses and verifies a session token.
     *
     * @throws io.jsonwebtoken.JwtException if invalid, expired, or tampered
     */
    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(signingKey())
                .requireIssuer(issuer)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
}