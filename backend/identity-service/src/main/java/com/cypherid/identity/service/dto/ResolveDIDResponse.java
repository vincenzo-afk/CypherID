package com.cypherid.identity.service.dto;

import com.fasterxml.jackson.annotation.JsonRawValue;

/** Response for DID resolution. */
public record ResolveDIDResponse(
    @JsonRawValue String didDocument,
    String status,
    String resolvedAt
) {}
