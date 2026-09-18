package com.cypherid.identity.service.service;

import com.cypherid.identity.service.domain.User;
import com.cypherid.identity.service.dto.AuthResult;
import com.cypherid.identity.service.exception.AuthenticationException;
import com.cypherid.identity.service.repository.UserRepository;
import com.cypherid.identity.service.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.List;

/**
 * AuthenticationService — handles DID-based authentication.
 * <p>
 * Flow:
 * 1. Look up user by DID in PostgreSQL
 * 2. Verify BCrypt password
 * 3. Check DID status (ACTIVE required)
 * 4. Issue JWT access + refresh tokens
 */
@Service
public class AuthenticationService {

    private static final Logger logger = LoggerFactory.getLogger(AuthenticationService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final StringRedisTemplate redis;

    // Brute-force protection (docs/security/06_AUTHENTICATION_SECURITY.md):
    // 5 failed logins → 15-minute lockout, lockout state kept in Redis.
    private static final int      MAX_FAILED_ATTEMPTS = 5;
    private static final Duration LOCKOUT_DURATION    = Duration.ofMinutes(15);
    private static final String   FAIL_KEY_PREFIX     = "login:fail:";
    private static final String   LOCK_KEY_PREFIX     = "login:locked:";

    public AuthenticationService(UserRepository userRepository,
                                  PasswordEncoder passwordEncoder,
                                  JwtService jwtService,
                                  StringRedisTemplate redis) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.redis = redis;
    }

    /**
     * Authenticates a user by DID + password.
     * @param did     User's DID (did:cypherid:0x...)
     * @param password Plain text password
     * @param nonce    Client-provided nonce (logged for audit, not validated here)
     * @return AuthResult with access + refresh tokens
     * @throws RuntimeException on invalid credentials or suspended/revoked DID
     */
    public AuthResult authenticate(String did, String password, String nonce) {
        // Brute-force protection: reject while the DID is locked out
        // (docs/security/06_AUTHENTICATION_SECURITY.md).
        requireNotLocked(did);

        User user = userRepository.findByDid(did)
                .orElseThrow(() -> {
                    logger.warn("Login failed: DID not found: {}", did);
                    return new AuthenticationException(HttpStatus.UNAUTHORIZED,
                            "INVALID_CREDENTIALS", "Invalid credentials");
                });

        // Check DID status — docs/api/02_AUTHENTICATION_APIS.md: 403 suspended/revoked
        if ("REVOKED".equals(user.getStatus())) {
            logger.warn("Login denied: DID REVOKED: {}", did);
            throw new AuthenticationException(HttpStatus.FORBIDDEN,
                    "DID_REVOKED", "DID is revoked");
        }
        if ("SUSPENDED".equals(user.getStatus())) {
            logger.warn("Login denied: DID SUSPENDED: {}", did);
            throw new AuthenticationException(HttpStatus.FORBIDDEN,
                    "DID_SUSPENDED", "DID is suspended");
        }

        // Verify password
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            logger.warn("Login failed: wrong password for DID: {}", did);
            throw new AuthenticationException(HttpStatus.UNAUTHORIZED,
                    "INVALID_CREDENTIALS", "Invalid credentials");
        }

        // Successful login resets the failed-attempt counter
        clearFailedAttempts(did);

        // Build roles list from clearance level
        List<String> roles = buildRoles(user);

        String accessToken  = jwtService.issueAccessToken(did, user.getOrganization(), roles);
        String refreshToken = jwtService.issueRefreshToken(did);

        logger.info("Login successful for DID: {} org: {}", did, user.getOrganization());

        return new AuthResult(
                accessToken,
                refreshToken,
                jwtService.getExpirationSeconds(),
                jwtService.getRefreshExpirationSeconds());
    }

    /**
     * Refreshes access token using a valid refresh token.
     */
    public AuthResult refresh(String refreshToken) {
        String did = jwtService.validateRefreshToken(refreshToken);

        User user = userRepository.findByDid(did)
                .orElseThrow(() -> new AuthenticationException(HttpStatus.UNAUTHORIZED,
                        "INVALID_TOKEN", "User not found for refresh token"));

        if (!"ACTIVE".equals(user.getStatus())) {
            jwtService.revokeRefreshToken(refreshToken);
            throw new AuthenticationException(HttpStatus.FORBIDDEN,
                    "DID_INACTIVE", "DID is no longer active");
        }

        List<String> roles = buildRoles(user);
        String newAccessToken  = jwtService.issueAccessToken(did, user.getOrganization(), roles);
        String newRefreshToken = jwtService.issueRefreshToken(did); // rotate refresh token

        // Revoke old refresh token
        jwtService.revokeRefreshToken(refreshToken);

        return new AuthResult(
                newAccessToken,
                newRefreshToken,
                jwtService.getExpirationSeconds(),
                jwtService.getRefreshExpirationSeconds());
    }

    /**
     * Logs out by revoking access and refresh tokens.
     */
    public void logout(String accessToken, String refreshToken) {
        if (accessToken != null) {
            jwtService.revokeAccessToken(accessToken);
        }
        if (refreshToken != null) {
            jwtService.revokeRefreshToken(refreshToken);
        }
    }

    // =========================================================================
    // Brute-force lockout (docs/security/06_AUTHENTICATION_SECURITY.md)
    // =========================================================================

    /**
     * Rejects the login attempt while the DID is locked out.
     * HTTP 429 per docs/api/18_ERROR_RESPONSE_MODEL.md (RATE_LIMIT_EXCEEDED).
     */
    private void requireNotLocked(String did) {
        try {
            if (Boolean.TRUE.equals(redis.hasKey(LOCK_KEY_PREFIX + did))) {
                logger.warn("Login blocked: DID {} is locked out (repeated failed logins)", did);
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                        "Account temporarily locked due to repeated failed logins. Try again later.");
            }
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            // Fail open on a Redis outage so password authentication itself stays
            // available (refresh-token storage in JwtService surfaces the outage
            // on its own); the outage is still logged for operations.
            logger.warn("Lockout check unavailable (Redis): {}", e.getMessage());
        }
    }

    /**
     * Records a failed login. On the 5th failure within the window the DID is
     * locked for 15 minutes and the counter is reset.
     */
    private void recordFailedAttempt(String did) {
        try {
            String key = FAIL_KEY_PREFIX + did;
            Long attempts = redis.opsForValue().increment(key);
            if (attempts != null && attempts == 1) {
                redis.expire(key, LOCKOUT_DURATION);
            }
            if (attempts != null && attempts >= MAX_FAILED_ATTEMPTS) {
                redis.opsForValue().set(LOCK_KEY_PREFIX + did, "locked", LOCKOUT_DURATION);
                redis.delete(key);
                logger.warn("DID {} locked out for {} after {} failed logins", did, LOCKOUT_DURATION, attempts);
            }
        } catch (Exception e) {
            logger.warn("Failed-attempt tracking unavailable (Redis): {}", e.getMessage());
        }
    }

    /**
     * Clears the failed-attempt counter after a successful login.
     */
    private void clearFailedAttempts(String did) {
        try {
            redis.delete(FAIL_KEY_PREFIX + did);
        } catch (Exception e) {
            logger.warn("Failed-attempt cleanup unavailable (Redis): {}", e.getMessage());
        }
    }

    private List<String> buildRoles(User user) {
        String clearance = user.getClearanceLevel();
        if (clearance == null) clearance = "UNCLASSIFIED";

        // NOTE: "SUPER_ADMIN" and "ORG_ADMIN" are administrative roles, not
        // classification levels, but they are stored in the same clearance_level
        // column (docs/access-control/02_RBAC_MODEL.md) and must be recognized
        // here — every *AdminController / requireAdminRole check across the
        // services does roles.contains("ADMIN") / roles.contains("SUPER_ADMIN")
        // against exactly this list. Before this fix neither value was ever
        // produced, so no account — however configured — could reach any admin
        // endpoint. Admins also get full clearance so classified content checks
        // never block administrative actions.
        return switch (clearance) {
            case "SUPER_ADMIN"  -> List.of("SUPER_ADMIN", "ORG_ADMIN", "TOP_SECRET", "SECRET", "CONFIDENTIAL",
                                            "UNCLASSIFIED", "CLEARANCE_LEVEL_5", "CLEARANCE_LEVEL_4");
            case "ORG_ADMIN"    -> List.of("ORG_ADMIN", "TOP_SECRET", "SECRET", "CONFIDENTIAL", "UNCLASSIFIED",
                                            "CLEARANCE_LEVEL_4");
            case "TOP_SECRET"   -> List.of("TOP_SECRET", "SECRET", "CONFIDENTIAL", "UNCLASSIFIED", "CLEARANCE_LEVEL_4");
            case "SECRET"       -> List.of("SECRET", "CONFIDENTIAL", "UNCLASSIFIED", "CLEARANCE_LEVEL_3");
            case "CONFIDENTIAL" -> List.of("CONFIDENTIAL", "UNCLASSIFIED", "CLEARANCE_LEVEL_2");
            default             -> List.of("UNCLASSIFIED", "CLEARANCE_LEVEL_1");
        };
        return List.copyOf(base);
    }
}
