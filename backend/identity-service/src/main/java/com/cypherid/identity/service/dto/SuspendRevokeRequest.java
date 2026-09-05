package com.cypherid.identity.service.dto;

import jakarta.validation.constraints.NotBlank;

public record SuspendRevokeRequest(@NotBlank String reason) {}
