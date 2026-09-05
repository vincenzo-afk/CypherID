package com.cypherid.asset.service.dto;

/**
 * IssueSessionResponse — response for POST /api/v1/assets/{assetId}/protected-session.
 */
public record IssueSessionResponse(
    String sessionId,
    String sessionToken,   // short-lived session JWT (Bearer for chunk requests)
    String expiresAt,      // ISO-8601
    String state,          // AUTHORIZED
    WatermarkDto watermark
) {}