package com.cypherid.access.service.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.Map;

/**
 * AccessRequest — body for POST /api/v1/access/request
 * (see docs/api/05_ACCESS_CONTROL_APIS.md).
 */
public record AccessRequest(
    @NotBlank String resourceId,
    @NotBlank String action,
    Map<String, String> contextAttributes
) {}