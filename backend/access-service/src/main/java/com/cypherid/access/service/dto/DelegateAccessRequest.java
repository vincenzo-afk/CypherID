package com.cypherid.access.service.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * DelegateAccessRequest — body for POST /api/v1/access/delegate.
 * expiresAt must be an ISO-8601 timestamp in the future.
 */
public record DelegateAccessRequest(
    @NotBlank String toDID,
    @NotBlank String resourceId,
    @NotBlank String action,
    @NotBlank String expiresAt
) {}