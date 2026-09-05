package com.cypherid.access.service.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * RevokeDelegateRequest — body for PUT /api/v1/access/delegate/revoke.
 */
public record RevokeDelegateRequest(
    @NotBlank String toDID,
    @NotBlank String resourceId
) {}