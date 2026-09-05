package com.cypherid.identity.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Login request DTO.
 */
public record LoginRequest(
    @NotBlank(message = "DID is required")
    @Pattern(regexp = "did:cypherid:.*", message = "DID must start with did:cypherid:")
    String did,

    @NotBlank(message = "Password is required")
    String password,

    @NotBlank(message = "Nonce is required for replay protection")
    String nonce
) {}
