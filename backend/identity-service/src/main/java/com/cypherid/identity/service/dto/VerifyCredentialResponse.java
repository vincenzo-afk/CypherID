package com.cypherid.identity.service.dto;

/** Response for VC verification. */
public record VerifyCredentialResponse(
    boolean valid,
    String reason
) {}
