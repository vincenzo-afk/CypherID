package com.cypherid.asset.service.dto;

import java.util.List;

/**
 * AssetHistoryResponse — full provenance chain for an asset
 * (GET /api/v1/assets/{assetId}/history).
 */
public record AssetHistoryResponse(List<HistoryEntry> history) {

    /**
     * A single provenance event derived from on-chain state history.
     */
    public record HistoryEntry(
        String event,     // MINTED | TRANSFERRED | BURNED | UPDATED
        String actor,     // DID responsible for the event
        String timestamp,
        String txHash
    ) {}
}