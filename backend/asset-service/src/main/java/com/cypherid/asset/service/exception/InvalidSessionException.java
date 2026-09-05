package com.cypherid.asset.service.exception;

/**
 * InvalidSessionException — maps to HTTP 401 for missing, invalid, or
 * expired protected session tokens (SESSION_EXPIRED / INVALID_SESSION_TOKEN).
 */
public class InvalidSessionException extends RuntimeException {

    private final String code;

    public InvalidSessionException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() { return code; }
}