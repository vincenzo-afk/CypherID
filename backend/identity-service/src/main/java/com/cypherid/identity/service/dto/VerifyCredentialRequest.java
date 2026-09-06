package com.cypherid.identity.service.dto;

import jakarta.validation.constraints.NotNull;
import java.util.Map;

/** Request to verify a presented Verifiable Credential. */
public record VerifyCredentialRequest(
    @NotNull Map<String, Object> vc
) {}
