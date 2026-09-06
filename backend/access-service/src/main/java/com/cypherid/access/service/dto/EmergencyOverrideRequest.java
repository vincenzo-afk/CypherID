package com.cypherid.access.service.dto;

import jakarta.validation.constraints.NotBlank;

/** Request for emergency override (SUPER_ADMIN only). */
public record EmergencyOverrideRequest(
    @NotBlank String resourceId,
    @NotBlank String reason
) {}
