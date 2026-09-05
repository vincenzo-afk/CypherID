package com.cypherid.access.service.exception;

/**
 * AccessDeniedException — thrown when the on-chain decision is DENIED
 * or the caller is not authorized (e.g., missing admin role).
 * <p>
 * Carries the chaincode denial reason code and the immutable log txHash,
 * and is mapped to HTTP 403 with an AccessDecisionResponse body
 * per docs/api/05_ACCESS_CONTROL_APIS.md.
 */
public class AccessDeniedException extends RuntimeException {

    private final String decision; // always "DENIED"
    private final String reason;
    private final String txHash;

    public AccessDeniedException(String reason, String txHash) {
        super("Access denied: " + reason);
        this.decision = "DENIED";
        this.reason = reason;
        this.txHash = txHash;
    }

    public String getDecision() { return decision; }
    public String getReason()   { return reason; }
    public String getTxHash()   { return txHash; }
}