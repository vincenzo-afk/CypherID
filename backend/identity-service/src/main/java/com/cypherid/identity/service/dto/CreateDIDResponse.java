package com.cypherid.identity.service.dto;

import com.fasterxml.jackson.annotation.JsonRawValue;

/** Response after DID creation. */
public record CreateDIDResponse(
    String did,
    @JsonRawValue String didDocument,
    String txHash,
    String privateKey   // Base64 encoded — client must store securely, backend never stores
) {}
