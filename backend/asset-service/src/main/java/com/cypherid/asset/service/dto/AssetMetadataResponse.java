package com.cypherid.asset.service.dto;

/**
 * AssetMetadataResponse — asset metadata (never content) returned by
 * GET /api/v1/assets/{assetId}. Mirrors the on-chain Asset record.
 */
public record AssetMetadataResponse(
    String assetId,
    String ownerDID,
    String ipfsHash,
    String classification,
    String policyId,
    String status,
    String fileName,
    String fileType,
    long fileSizeBytes,
    String createdAt,
    String updatedAt
) {}