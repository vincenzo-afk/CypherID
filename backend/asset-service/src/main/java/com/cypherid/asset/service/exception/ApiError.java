package com.cypherid.asset.service.exception;

import java.util.Map;

/**
 * ApiError — error body following docs/api/18_ERROR_RESPONSE_MODEL.md.
 */
public record ApiError(
    String code,
    String message,
    Map<String, Object> details
) {}