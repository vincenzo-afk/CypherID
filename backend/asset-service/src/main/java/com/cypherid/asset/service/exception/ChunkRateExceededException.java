package com.cypherid.asset.service.exception;

/**
 * ChunkRateExceededException — maps to HTTP 429 RATE_LIMIT_EXCEEDED when a
 * session exceeds the protected-content chunk request rate limit.
 */
public class ChunkRateExceededException extends RuntimeException {

    public ChunkRateExceededException(String message) {
        super(message);
    }
}