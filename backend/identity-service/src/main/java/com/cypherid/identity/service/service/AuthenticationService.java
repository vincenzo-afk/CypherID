package com.cypherid.identity.service.service;

import com.cypherid.identity.service.domain.User;
import com.cypherid.identity.service.dto.AuthResult;
import com.cypherid.identity.service.repository.UserRepository;
import com.cypherid.identity.service.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

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

    public AuthenticationService(UserRepository userRepository,
                                  PasswordEncoder passwordEncoder,
                                  JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
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
        User user = userRepository.findByDid(did)
                .orElseThrow(() -> {
                    logger.warn("Login failed: DID not found: {}", did);
                    return new RuntimeException("Invalid credentials");
                });

        // Check DID status
        if ("REVOKED".equals(user.getStatus())) {
            logger.warn("Login denied: DID REVOKED: {}", did);
            throw new RuntimeException("DID is revoked");
        }
        if ("SUSPENDED".equals(user.getStatus())) {
            logger.warn("Login denied: DID SUSPENDED: {}", did);
            throw new RuntimeException("DID is suspended");
        }

        // Verify password
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            logger.warn("Login failed: wrong password for DID: {}", did);
            throw new RuntimeException("Invalid credentials");
        }

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
                .orElseThrow(() -> new RuntimeException("User not found for refresh token"));

        if (!"ACTIVE".equals(user.getStatus())) {
            jwtService.revokeRefreshToken(refreshToken);
            throw new RuntimeException("DID is no longer active");
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

    private List<String> buildRoles(User user) {
        String clearance = user.getClearanceLevel();
        if (clearance == null) clearance = "UNCLASSIFIED";

        return switch (clearance) {
            case "TOP_SECRET"   -> List.of("TOP_SECRET", "SECRET", "CONFIDENTIAL", "UNCLASSIFIED", "CLEARANCE_LEVEL_4");
            case "SECRET"       -> List.of("SECRET", "CONFIDENTIAL", "UNCLASSIFIED", "CLEARANCE_LEVEL_3");
            case "CONFIDENTIAL" -> List.of("CONFIDENTIAL", "UNCLASSIFIED", "CLEARANCE_LEVEL_2");
            default             -> List.of("UNCLASSIFIED", "CLEARANCE_LEVEL_1");
        };
    }
}
