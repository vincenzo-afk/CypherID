package com.cypherid.identity.service.dto;

import java.util.Map;

/** Response after issuing a Verifiable Credential. */
public record IssueCredentialResponse(
    String vcId,
    Map<String, Object> vc,
    String txHash
) {}
