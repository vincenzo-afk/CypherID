package com.cypherid.asset.service.exception;

/**
 * GoneException — maps to HTTP 410 with a documented error code
 * (e.g., ASSET_BURNED, per docs/api/18_ERROR_RESPONSE_MODEL.md).
 */
public class GoneException extends RuntimeException {

    private final String code;

    public GoneException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() { return code; }
}