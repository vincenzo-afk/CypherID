package com.cypherid.access.service.dto;

import java.time.Instant;

/**
 * DelegationListItemResponse — one row of a user's delegation history
 * (GET /api/v1/access/delegations). Active AND revoked rows are returned
 * so the UI can show real status counts.
 */
public record DelegationListItemResponse(
    String fromDID,
    String toDID,
    String resourceId,
    String action,
    Instant expiresAt,
    boolean active,
    Instant createdAt
) {}
