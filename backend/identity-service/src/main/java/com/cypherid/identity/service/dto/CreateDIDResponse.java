package com.cypherid.identity.service.dto;

import com.fasterxml.jackson.annotation.JsonRawValue;

/** One-time result of DID enrollment. */
public record CreateDIDResponse(
    String did,
    @JsonRawValue String didDocument,
    String txHash,
    String privateKey,
    String temporaryPassword
) {}
