package com.cypherid.access.service.dto;

import java.util.List;

/**
 * MultiSigResponse — multi-signature request representation.
 * Mirrors the on-chain MultiSigRequest structure.
 */
public record MultiSigResponse(
    String requestId,
    String resourceId,
    String requesterDid,
    List<String> requiredApprovers,
    int requiredThreshold,
    List<Approval> approvals,
    String status,   // PENDING | APPROVED
    String createdAt,
    String updatedAt
) {
    /** A single approver's recorded approval. */
    public record Approval(String approverDid, String signature, String timestamp) {}
}