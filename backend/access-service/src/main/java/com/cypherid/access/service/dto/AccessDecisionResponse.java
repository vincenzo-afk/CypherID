package com.cypherid.access.service.dto;

/**
 * AccessDecisionResponse — decision body returned by
 * POST /api/v1/access/request.
 * <p>
 * sessionToken / expiresAt are issued by the ProtectedSessionService
 * (Phase 7) and are null until that service is integrated.
 */
public record AccessDecisionResponse(
    String decision,     // GRANTED | DENIED
    String sessionToken, // issued by ProtectedSessionService (Phase 7)
    String txHash,       // on-chain access log transaction hash
    String expiresAt,    // ISO-8601 session expiry (Phase 7)
    String reason        // denial reason code (DENIED only)
) {}