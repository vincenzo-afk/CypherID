package com.cypherid.asset.service.dto;

/**
 * BurnResponse — response for DELETE /api/v1/assets/{assetId}.
 */
public record BurnResponse(String txHash, String status) {}