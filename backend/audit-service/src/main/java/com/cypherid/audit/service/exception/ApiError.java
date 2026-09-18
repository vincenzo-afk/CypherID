package com.cypherid.audit.service.exception;

import java.util.Map;

/** ApiError — documented error body per docs/api/18_ERROR_RESPONSE_MODEL.md. */
public record ApiError(String code, String message, Map<String, Object> details) {}
