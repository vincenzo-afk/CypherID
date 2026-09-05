package com.cypherid.access.service.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.Map;

/**
 * CreatePolicyRequest — body for POST /api/v1/access/policies (admin only).
 */
public record CreatePolicyRequest(
    @NotBlank String resourceId,
    @NotBlank String requiredRole,
    Map<String, String> abacAttributes,
    @NotBlank String action
) {}