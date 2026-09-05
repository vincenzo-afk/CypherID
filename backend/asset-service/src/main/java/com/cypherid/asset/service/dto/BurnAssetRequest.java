package com.cypherid.asset.service.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * BurnAssetRequest — body for DELETE /api/v1/assets/{assetId}.
 * ownerSignature is produced by the owner's DID private key.
 */
public record BurnAssetRequest(
    @NotBlank String ownerSignature
) {}