package com.cypherid.access.service.dto;

/**
 * DelegationResponse — result of delegate / revoke operations.
 */
public record DelegationResponse(
    String fromDid,
    String toDid,
    String resourceId,
    String action,
    String expiresAt, // ISO-8601 (null on revoke)
    String status     // DELEGATED | DELEGATION_REVOKED
) {}