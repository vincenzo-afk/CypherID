package com.cypherid.identity.service.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Login response — access token + metadata. Refresh token sent as httpOnly cookie. */
public record LoginResponse(
    @JsonProperty("accessToken")  String accessToken,
    @JsonProperty("expiresIn")    long expiresIn,
    @JsonProperty("tokenType")    String tokenType
) {}

