package com.cypherid.asset.service.controller;

import com.cypherid.asset.service.content.ProtectedContentService;
import com.cypherid.asset.service.dto.*;
import com.cypherid.asset.service.exception.ForbiddenException;
import com.cypherid.asset.service.security.SecurityEventService;
import com.cypherid.asset.service.session.ProtectedSessionService;
import com.cypherid.asset.service.session.SessionState;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * ProtectedContentController — chunked protected content delivery and session
 * events (docs/api/09_PROTECTED_CONTENT_APIS.md).
 * <p>
 * Endpoints:
 * GET    /api/v1/protected-content/chunk?chunk={n}   → binary chunk (Bearer session JWT)
 * GET    /api/v1/protected-content/session-info      → session metadata
 * POST   /api/v1/protected-content/session/{id}/event → report browser security event
 * DELETE /api/v1/protected-content/session/{id}      → close/invalidate session
 */
@RestController
@RequestMapping("/api/v1/protected-content")
public class ProtectedContentController {

    private final ProtectedContentService contentService;
    private final ProtectedSessionService sessionService;
    private final SecurityEventService securityEventService;

    public ProtectedContentController(ProtectedContentService contentService,
                                      ProtectedSessionService sessionService,
                                      SecurityEventService securityEventService) {
        this.contentService = contentService;
        this.sessionService = sessionService;
        this.securityEventService = securityEventService;
    }

    /**
     * GET /api/v1/protected-content/chunk?chunk={index}
     * Authorization: Bearer {sessionToken}
     */
    @GetMapping("/chunk")
    public ResponseEntity<byte[]> getChunk(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authHeader,
            @RequestParam("chunk") int chunk) {

        byte[] chunkBytes = contentService.getChunk(extractBearer(authHeader), chunk);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(chunkBytes);
    }

    /**
     * GET /api/v1/protected-content/session-info
     * Authorization: Bearer {sessionToken}
     */
    @GetMapping("/session-info")
    public ResponseEntity<SessionInfoResponse> sessionInfo(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authHeader) {

        return ResponseEntity.ok(contentService.sessionInfo(extractBearer(authHeader)));
    }

    /**
     * POST /api/v1/protected-content/session/{sessionId}/event
     * Reports a browser security event. The caller's DID (gateway header)
     * must own the session.
     */
    @PostMapping("/session/{sessionId}/event")
    public ResponseEntity<SecurityEventResponse> reportEvent(
            @PathVariable String sessionId,
            @RequestHeader("X-User-DID") String userDid,
            @Valid @RequestBody SecurityEventRequest request) {

        requireSessionOwnership(sessionId, userDid);
        return ResponseEntity.ok(securityEventService.recordEvent(sessionId, userDid, request));
    }

    /**
     * DELETE /api/v1/protected-content/session/{sessionId}
     * Manually close/invalidate a session (owner or admin).
     */
    @DeleteMapping("/session/{sessionId}")
    public ResponseEntity<MessageResponse> closeSession(
            @PathVariable String sessionId,
            @RequestHeader("X-User-DID") String userDid,
            @RequestHeader(value = "X-User-Roles", required = false) String roles) {

        sessionService.closeSession(sessionId, roles != null && roles.contains("ADMIN") ? null : userDid);
        return ResponseEntity.ok(new MessageResponse("Session closed"));
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private String extractBearer(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        throw new ForbiddenException("INVALID_SESSION_TOKEN", "Missing Bearer session token");
    }

    private void requireSessionOwnership(String sessionId, String userDid) {
        SessionState state = sessionService.getState(sessionId);
        if (!userDid.equals(state.userDID())) {
            throw new ForbiddenException("SESSION_NOT_OWNED", "Caller does not own session: " + sessionId);
        }
    }
}