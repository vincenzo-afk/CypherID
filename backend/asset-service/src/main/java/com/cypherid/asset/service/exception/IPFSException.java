package com.cypherid.asset.service.exception;

/**
 * IPFSException — maps to HTTP 503 IPFS_UPLOAD_FAILED
 * (docs/api/18_ERROR_RESPONSE_MODEL.md).
 */
public class IPFSException extends RuntimeException {

    public IPFSException(String message) {
        super(message);
    }

    public IPFSException(String message, Throwable cause) {
        super(message, cause);
    }
}