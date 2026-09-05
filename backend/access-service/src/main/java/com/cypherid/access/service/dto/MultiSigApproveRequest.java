package com.cypherid.access.service.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * MultiSigApproveRequest — body for POST /api/v1/access/multisig/{requestId}/approve.
 */
public record MultiSigApproveRequest(
    @NotBlank String signature
) {}