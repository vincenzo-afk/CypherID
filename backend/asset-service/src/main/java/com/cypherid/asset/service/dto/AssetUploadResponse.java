package com.cypherid.asset.service.dto;

/**
 * AssetUploadResponse — response for POST /api/v1/assets
 * (docs/api/06_ASSET_APIS.md).
 */
public record AssetUploadResponse(
    String assetId,
    String ipfsHash,
    String txHash,
    String ownerDID
) {}