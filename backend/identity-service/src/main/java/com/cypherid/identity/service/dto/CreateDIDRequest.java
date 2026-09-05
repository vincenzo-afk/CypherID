package com.cypherid.identity.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;

/** Request to create a new DID. */
public record CreateDIDRequest(
    @NotBlank String organization,
    String department,
    @NotNull Map<String, String> kycData   // name, employeeId, etc.
) {}
