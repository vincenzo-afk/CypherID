package com.cypherid.access.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * MultiSigCreateRequest — body for POST /api/v1/access/multisig.
 * requiredApprovers are the DIDs that must approve; threshold = all approvers.
 */
public record MultiSigCreateRequest(
    @NotBlank String resourceId,
    @NotEmpty List<@NotBlank String> requiredApprovers
) {}