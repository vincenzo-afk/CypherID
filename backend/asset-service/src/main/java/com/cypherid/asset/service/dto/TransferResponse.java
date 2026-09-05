package com.cypherid.asset.service.dto;

/**
 * TransferResponse — response for POST /api/v1/assets/{assetId}/transfer.
 */
public record TransferResponse(String txHash, String newOwner) {}