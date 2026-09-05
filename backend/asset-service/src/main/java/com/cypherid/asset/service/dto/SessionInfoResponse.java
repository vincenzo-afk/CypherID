package com.cypherid.asset.service.dto;

/**
 * SessionInfoResponse — session metadata for GET /api/v1/protected-content/session-info
 * (docs/api/09_PROTECTED_CONTENT_APIS.md).
 */
public record SessionInfoResponse(
    String sessionId,
    String contentId,
    String contentType,
    String profile,
    int totalChunks,
    String expiresAt,   // ISO-8601
    String state,
    WatermarkDto watermark
) {}