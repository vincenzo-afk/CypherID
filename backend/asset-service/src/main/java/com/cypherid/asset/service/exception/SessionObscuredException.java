package com.cypherid.asset.service.exception;

/**
 * SessionObscuredException — maps to HTTP 403 SESSION_OBSCURED when the
 * session is in CONTENT_OBSCURED state (docs/api/18_ERROR_RESPONSE_MODEL.md).
 */
public class SessionObscuredException extends RuntimeException {

    public SessionObscuredException(String message) {
        super(message);
    }
}