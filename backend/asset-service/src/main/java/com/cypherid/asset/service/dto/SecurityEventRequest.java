package com.cypherid.asset.service.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.Map;

/**
 * SecurityEventRequest — body for POST /api/v1/protected-content/session/{sessionId}/event
 * (docs/api/09_PROTECTED_CONTENT_APIS.md).
 */
public record SecurityEventRequest(
    @NotBlank String eventType,
    String timestamp,          // ISO-8601; server time used if absent
    Map<String, Object> metadata
) {}