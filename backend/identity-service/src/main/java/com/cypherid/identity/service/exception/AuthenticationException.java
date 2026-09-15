package com.cypherid.identity.service.exception;

import org.springframework.http.HttpStatus;

/**
 * AuthenticationException — auth failures with their documented status codes
 * (docs/api/02_AUTHENTICATION_APIS.md): 401 for bad credentials/tokens,
 * 403 for suspended/revoked DIDs.
 */
public class AuthenticationException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public AuthenticationException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }
}
