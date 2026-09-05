package com.cypherid.access.service.exception;

/**
 * FabricUnavailableException — maps to HTTP 503 FABRIC_UNAVAILABLE
 * when the blockchain network cannot be reached.
 */
public class FabricUnavailableException extends RuntimeException {

    public FabricUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}