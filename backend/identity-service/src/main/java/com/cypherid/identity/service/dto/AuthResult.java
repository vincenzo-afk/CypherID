package com.cypherid.identity.service.dto;

/** Auth result from AuthenticationService — internal use. */
public record AuthResult(
    String accessToken,
    String refreshToken,
    long expiresIn,
    long refreshExpiresIn
) {}
