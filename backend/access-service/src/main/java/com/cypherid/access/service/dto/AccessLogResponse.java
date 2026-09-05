package com.cypherid.access.service.dto;

/**
 * AccessLogResponse — immutable on-chain access log entry.
 * Mirrors the on-chain AccessLog structure.
 */
public record AccessLogResponse(
    String logId,
    String did,
    String resourceId,
    String action,
    String decision,
    String reason,
    String policyId,
    String timestamp
) {}