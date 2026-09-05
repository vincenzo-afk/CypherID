package com.cypherid.access.service.dto;

import java.util.Map;

/**
 * PolicyResponse — access policy representation for GET endpoints.
 * Mirrors the on-chain AccessPolicy structure.
 */
public record PolicyResponse(
    String policyId,
    String resourceId,
    String requiredRole,
    Map<String, String> abacAttributes,
    String action,
    boolean active,
    String createdBy,
    String createdAt,
    String updatedAt
) {}