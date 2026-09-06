package com.cypherid.identity.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;

/** Request to issue a Verifiable Credential (docs/api/04_CREDENTIAL_APIS.md). */
public record IssueCredentialRequest(
    @NotBlank String subjectDID,
    @NotBlank String credentialType,
    @NotNull Map<String, Object> attributes,
    String expirationDate
) {}
