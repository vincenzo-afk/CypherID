package com.cypherid.identity.service.dto;

import java.util.List;
import java.util.Map;

/** Response listing VCs for a DID. */
public record CredentialListResponse(
    List<Map<String, Object>> credentials
) {}
