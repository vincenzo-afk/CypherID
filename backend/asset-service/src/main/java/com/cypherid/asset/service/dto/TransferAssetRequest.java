package com.cypherid.asset.service.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * TransferAssetRequest — body for POST /api/v1/assets/{assetId}/transfer.
 * ownerSignature is produced by the current owner's DID private key.
 */
public record TransferAssetRequest(
    @NotBlank String toDID,
    @NotBlank String ownerSignature
) {}