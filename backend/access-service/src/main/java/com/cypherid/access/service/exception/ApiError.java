package com.cypherid.access.service.exception;

/**
 * ApiError — error body following docs/api/18_ERROR_RESPONSE_MODEL.md
 * and docs/api/01_API_CONVENTIONS.md.
 */
public record ApiError(
    String code,
    String message,
    java.util.Map<String, Object> details
) {}