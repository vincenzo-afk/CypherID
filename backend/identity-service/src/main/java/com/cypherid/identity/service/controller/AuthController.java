package com.cypherid.identity.service.controller;

import com.cypherid.identity.service.domain.User;
import com.cypherid.identity.service.dto.*;
import com.cypherid.identity.service.service.AuthenticationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Arrays;

/**
 * AuthController — handles user authentication via DID + password.
 * <p>
 * Endpoints:
 * POST /api/v1/auth/login    → issue JWT (access + refresh)
 * POST /api/v1/auth/refresh  → refresh access token
 * POST /api/v1/auth/logout   → revoke tokens
 * GET  /api/v1/auth/me       → current user info from JWT
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthenticationService authService;

    public AuthController(AuthenticationService authService) {
        this.authService = authService;
    }

    /**
     * Login with DID + password.
     * Returns access token in body; refresh token as httpOnly cookie.
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {

        AuthResult result = authService.authenticate(request.did(), request.password(), request.nonce());

        // Set refresh token as httpOnly cookie
        Cookie refreshCookie = new Cookie("refresh_token", result.refreshToken());
        refreshCookie.setHttpOnly(true);
        refreshCookie.setSecure(true);  // HTTPS only in production
        refreshCookie.setPath("/api/v1/auth/refresh");
        refreshCookie.setMaxAge((int) result.refreshExpiresIn());
        response.addCookie(refreshCookie);

        return ResponseEntity.ok(new LoginResponse(
                result.accessToken(),
                result.expiresIn(),
                "Bearer"));
    }

    /**
     * Refresh access token using refresh token cookie.
     */
    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = extractRefreshCookie(request);
        if (refreshToken == null) {
            return ResponseEntity.status(401).build();
        }

        AuthResult result = authService.refresh(refreshToken);

        // Rotate refresh token
        Cookie refreshCookie = new Cookie("refresh_token", result.refreshToken());
        refreshCookie.setHttpOnly(true);
        refreshCookie.setSecure(true);
        refreshCookie.setPath("/api/v1/auth/refresh");
        refreshCookie.setMaxAge((int) result.refreshExpiresIn());
        response.addCookie(refreshCookie);

        return ResponseEntity.ok(new LoginResponse(
                result.accessToken(),
                result.expiresIn(),
                "Bearer"));
    }

    /**
     * Logout — invalidate access + refresh tokens.
     */
    @PostMapping("/logout")
    public ResponseEntity<MessageResponse> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request,
            HttpServletResponse response) {

        String accessToken = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            accessToken = authHeader.substring(7);
        }

        String refreshToken = extractRefreshCookie(request);
        authService.logout(accessToken, refreshToken);

        // Clear refresh cookie
        Cookie clearCookie = new Cookie("refresh_token", "");
        clearCookie.setHttpOnly(true);
        clearCookie.setSecure(true);
        clearCookie.setPath("/api/v1/auth/refresh");
        clearCookie.setMaxAge(0);
        response.addCookie(clearCookie);

        return ResponseEntity.ok(new MessageResponse("Logged out successfully"));
    }

    /**
     * Get current user info from JWT claims.
     * The gateway forwards X-User-DID, X-User-Org, X-User-Roles headers.
     */
    @GetMapping("/me")
    public ResponseEntity<UserInfoResponse> me(
            @RequestHeader("X-User-DID")   String did,
            @RequestHeader("X-User-Org")   String org,
            @RequestHeader("X-User-Roles") String roles) {

        return ResponseEntity.ok(new UserInfoResponse(did, org, roles.split(",")));
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private String extractRefreshCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> "refresh_token".equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
