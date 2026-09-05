package com.cypherid.asset.service.controller;

import com.cypherid.asset.service.dto.*;
import com.cypherid.asset.service.service.AssetService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * AssetController — REST endpoints for the digital asset lifecycle
 * (docs/api/06_ASSET_APIS.md).
 * <p>
 * Endpoints:
 * POST   /api/v1/assets                      → upload + mint (multipart)
 * GET    /api/v1/assets                      → list assets by owner (query param)
 * GET    /api/v1/assets/{assetId}            → asset metadata
 * POST   /api/v1/assets/{assetId}/transfer   → transfer ownership
 * DELETE /api/v1/assets/{assetId}            → burn asset
 * GET    /api/v1/assets/{assetId}/history    → provenance chain
 * <p>
 * The API Gateway validates JWTs and injects X-User-DID / X-User-Roles.
 */
@RestController
@RequestMapping("/api/v1/assets")
public class AssetController {

    private final AssetService assetService;

    public AssetController(AssetService assetService) {
        this.assetService = assetService;
    }

    /**
     * POST /api/v1/assets — upload + mint a new asset.
     * multipart/form-data: file, classification, policyId (optional).
     */
    @PostMapping
    public ResponseEntity<AssetUploadResponse> uploadAsset(
            @RequestHeader("X-User-DID") String ownerDid,
            @RequestParam("file") MultipartFile file,
            @RequestParam("classification") String classification,
            @RequestParam(value = "policyId", required = false) String policyId) {

        AssetUploadResponse response = assetService.uploadAsset(ownerDid, file, classification, policyId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /api/v1/assets?ownerDID={did} — list assets owned by a DID.
     */
    @GetMapping
    public ResponseEntity<List<AssetMetadataResponse>> listOwnerAssets(
            @RequestParam("ownerDID") String ownerDid) {

        return ResponseEntity.ok(assetService.listOwnerAssets(ownerDid));
    }

    /**
     * GET /api/v1/assets/{assetId} — asset metadata (never content).
     */
    @GetMapping("/{assetId}")
    public ResponseEntity<AssetMetadataResponse> getAsset(@PathVariable String assetId) {
        return ResponseEntity.ok(assetService.getAssetMetadata(assetId));
    }

    /**
     * POST /api/v1/assets/{assetId}/transfer — transfer ownership.
     */
    @PostMapping("/{assetId}/transfer")
    public ResponseEntity<TransferResponse> transfer(
            @PathVariable String assetId,
            @RequestHeader("X-User-DID") String fromDid,
            @Valid @RequestBody TransferAssetRequest request) {

        TransferResponse response = assetService.transfer(assetId, fromDid, request);
        return ResponseEntity.ok(response);
    }

    /**
     * DELETE /api/v1/assets/{assetId} — burn (destroy) an asset.
     */
    @DeleteMapping("/{assetId}")
    public ResponseEntity<BurnResponse> burn(
            @PathVariable String assetId,
            @RequestHeader("X-User-DID") String ownerDid,
            @Valid @RequestBody BurnAssetRequest request) {

        BurnResponse response = assetService.burn(assetId, ownerDid, request);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/assets/{assetId}/history — full provenance chain.
     */
    @GetMapping("/{assetId}/history")
    public ResponseEntity<AssetHistoryResponse> getHistory(@PathVariable String assetId) {
        return ResponseEntity.ok(assetService.getHistory(assetId));
    }
}