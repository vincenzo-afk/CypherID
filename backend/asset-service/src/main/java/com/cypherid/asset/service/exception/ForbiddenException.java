package com.cypherid.asset.service.exception;

/**
 * ForbiddenException — maps to HTTP 403 with a documented error code
 * (e.g., ASSET_NOT_OWNED).
 */
public class ForbiddenException extends RuntimeException {

    private final String code;

    public ForbiddenException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() { return code; }
}