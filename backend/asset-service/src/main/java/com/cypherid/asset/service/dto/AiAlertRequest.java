package com.cypherid.asset.service.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.Map;

/**
 * AiAlertRequest — body for POST /api/security/ai-alert, sent by the AI
 * anomaly detection service when an Isolation Forest score falls below the
 * threshold (docs/ai/01_AI_ARCHITECTURE.md).
 */
public record AiAlertRequest(
    @NotBlank String did,
    double anomalyScore,
    Map<String, Object> features,
    String patternDescription
) {}