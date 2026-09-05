package com.cypherid.asset.service.dto;

/**
 * SecurityEventResponse — new session state + frontend action after a
 * browser security event (docs/api/09_PROTECTED_CONTENT_APIS.md).
 */
public record SecurityEventResponse(
    String newState,  // e.g. SUSPICIOUS_ACTIVITY, CONTENT_OBSCURED
    String action     // CONTINUE | OBSCURE | RESUME
) {}