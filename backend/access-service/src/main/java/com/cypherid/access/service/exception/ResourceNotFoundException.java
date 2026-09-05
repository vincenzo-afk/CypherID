package com.cypherid.access.service.exception;

/**
 * ResourceNotFoundException — maps to HTTP 404 with a documented
 * error code (e.g., POLICY_NOT_FOUND).
 */
public class ResourceNotFoundException extends RuntimeException {

    private final String code;

    public ResourceNotFoundException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() { return code; }
}