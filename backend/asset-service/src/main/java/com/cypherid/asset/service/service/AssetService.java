package com.cypherid.asset.service.service;

import com.cypherid.asset.service.crypto.EncryptionService;
import com.cypherid.asset.service.domain.AssetEncryptionKeyEntity;
import com.cypherid.asset.service.dto.*;
import com.cypherid.asset.service.exception.*;
import com.cypherid.asset.service.fabric.FabricAssetClient;
import com.cypherid.asset.service.ipfs.IPFSService;
import com.cypherid.asset.service.kafka.AssetEventProducer;
import com.cypherid.asset.service.repository.AssetEncryptionKeyRepository;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import org.hyperledger.fabric.client.GatewayException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.lang.reflect.Type;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * AssetService — orchestrates the digital asset lifecycle
 * (docs/assets/01_DIGITAL_ASSET_ARCHITECTURE.md, docs/api/06_ASSET_APIS.md).
 * <p>
 * Upload flow: encrypt (AES-256-GCM per-asset key) → IPFS → mint on-chain.
 * The ledger holds ownership + provenance; the encrypted blob lives in IPFS;
 * the wrapped asset key lives in PostgreSQL.
 */
@Service
@Transactional
public class AssetService {

    private static final Logger logger = LoggerFactory.getLogger(AssetService.class);

    private static final Type STRING_MAP_TYPE = new TypeToken<Map<String, String>>() {}.getType();
    private static final Type RAW_HISTORY_TYPE = new TypeToken<List<Map<String, Object>>>() {}.getType();

    private static final List<String> VALID_CLASSIFICATIONS =
            List.of("UNCLASSIFIED", "CONFIDENTIAL", "SECRET", "TOP_SECRET");

    /** Maximum upload size: 50 MB */
    private static final long MAX_UPLOAD_BYTES = 50L * 1024 * 1024;

    private final FabricAssetClient fabricClient;
    private final EncryptionService encryptionService;
    private final IPFSService ipfsService;
    private final AssetEncryptionKeyRepository keyRepository;
    private final AssetEventProducer eventProducer;
    private final Gson gson = new Gson();

    public AssetService(FabricAssetClient fabricClient,
                        EncryptionService encryptionService,
                        IPFSService ipfsService,
                        AssetEncryptionKeyRepository keyRepository,
                        AssetEventProducer eventProducer) {
        this.fabricClient = fabricClient;
        this.encryptionService = encryptionService;
        this.ipfsService = ipfsService;
        this.keyRepository = keyRepository;
        this.eventProducer = eventProducer;
    }

    // =========================================================================
    // Upload + mint
    // =========================================================================

    /**
     * Uploads a file, encrypts it, stores it on IPFS, and mints the asset NFT
     * on-chain. Returns assetId + CID + txHash.
     */
    public AssetUploadResponse uploadAsset(String ownerDid, MultipartFile file,
                                           String classification, String policyId) {
        validateClassification(classification);
        validateFile(file);

        try {
            // 1. Per-asset encryption key
            byte[] assetKey = encryptionService.generateKey();

            // 2. Encrypt file content (IV || ciphertext || tag)
            byte[] encryptedBlob = encryptionService.encrypt(file.getBytes(), assetKey);

            // 3. Upload encrypted blob to IPFS
            String cid = ipfsService.upload(encryptedBlob);

            // 4. Mint on-chain
            String assetId = "ASSET-" + UUID.randomUUID();
            String nonce = FabricAssetClient.generateNonce();
            String timestamp = Instant.now().toString();

            FabricAssetClient.TxOutcome mintOutcome = fabricClient.mintAsset(
                    assetId, ownerDid, cid, classification,
                    policyId == null ? "" : policyId,
                    file.getOriginalFilename() != null ? file.getOriginalFilename() : "asset.bin",
                    file.getContentType() != null ? file.getContentType() : "application/octet-stream",
                    String.valueOf(file.getSize()),
                    nonce, timestamp);

            // 5. Wrap + persist the asset key (only after successful mint)
            EncryptionService.KeyBlob wrapped = encryptionService.wrapKey(assetKey);
            AssetEncryptionKeyEntity keyEntity = new AssetEncryptionKeyEntity();
            keyEntity.setAssetId(assetId);
            keyEntity.setEncryptedKey(wrapped.data());
            keyEntity.setIv(wrapped.iv());
            keyRepository.save(keyEntity);

            // 6. Feed the event pipeline (best-effort)
            eventProducer.publishAssetEvent("ASSET_MINTED", assetId, ownerDid,
                    classification, cid, timestamp);

            String txHash = mintOutcome.txId();  // real on-chain transaction ID
            logger.info("Asset minted: {} owner: {} cid: {} class: {} (tx: {})",
                    assetId, ownerDid, cid, classification, txHash);

            return new AssetUploadResponse(assetId, cid, txHash, ownerDid);

        } catch (GeneralSecurityException e) {
            throw new RuntimeException("Encryption failed: " + e.getMessage(), e);
        } catch (GatewayException e) {
            logger.error("Fabric unavailable during asset mint: {}", e.getMessage());
            throw new FabricUnavailableException("Blockchain network unavailable", e);
        } catch (Exception e) {
            throw new RuntimeException("Asset upload failed: " + e.getMessage(), e);
        }
    }

    // =========================================================================
    // Metadata
    // =========================================================================

    /**
     * Reads asset metadata from the ledger (never the content).
     */
    @Transactional(readOnly = true)
    public AssetMetadataResponse getAssetMetadata(String assetId) {
        try {
            String json = fabricClient.queryAsset(assetId);
            return toMetadataResponse(json);
        } catch (GatewayException e) {
            if (e.getMessage() != null && e.getMessage().contains("not found")) {
                throw new ResourceNotFoundException("ASSET_NOT_FOUND", "Asset not found: " + assetId);
            }
            throw new FabricUnavailableException("Blockchain network unavailable", e);
        }
    }

    /**
     * Lists assets owned by a DID (backed by chaincode queryOwnerAssets).
     */
    @Transactional(readOnly = true)
    public List<AssetMetadataResponse> listOwnerAssets(String ownerDid) {
        try {
            String idsJson = fabricClient.queryOwnerAssets(ownerDid);
            List<String> assetIds = gson.fromJson(idsJson, new TypeToken<List<String>>() {}.getType());
            List<AssetMetadataResponse> result = new ArrayList<>();
            if (assetIds != null) {
                for (String assetId : assetIds) {
                    try {
                        result.add(toMetadataResponse(fabricClient.queryAsset(assetId)));
                    } catch (Exception e) {
                        logger.warn("Skipping unreadable asset {}: {}", assetId, e.getMessage());
                    }
                }
            }
            return result;
        } catch (GatewayException e) {
            throw new FabricUnavailableException("Blockchain network unavailable", e);
        }
    }

    // =========================================================================
    // Transfer
    // =========================================================================

    /**
     * Transfers asset ownership to another DID.
     * Cryptographic signature verification of ownerSignature is performed by
     * the client/security layer (Phase 16); the chaincode validates presence.
     */
    public TransferResponse transfer(String assetId, String fromDid, TransferAssetRequest request) {
        requireOwnership(assetId, fromDid);

        String nonce = FabricAssetClient.generateNonce();
        String timestamp = Instant.now().toString();

        FabricAssetClient.TxOutcome outcome;
        try {
            outcome = fabricClient.transferAsset(assetId, fromDid, request.toDID(),
                    request.ownerSignature(), nonce, timestamp);
        } catch (GatewayException e) {
            throw new FabricUnavailableException("Blockchain network unavailable", e);
        } catch (Exception e) {
            throw new RuntimeException("Asset transfer failed: " + e.getMessage(), e);
        }

        eventProducer.publishAssetEvent("ASSET_TRANSFERRED", assetId, request.toDID(),
                null, null, timestamp);

        String txHash = outcome.txId();  // real on-chain transaction ID
        logger.info("Asset {} transferred from {} to {} (tx: {})", assetId, fromDid, request.toDID(), txHash);

        return new TransferResponse(txHash, request.toDID());
    }

    // =========================================================================
    // Burn
    // =========================================================================

    /**
     * Burns an asset: marks BURNED on-chain, best-effort unpins IPFS content,
     * and removes the stored asset key.
     */
    public BurnResponse burn(String assetId, String ownerDid, BurnAssetRequest request) {
        AssetMetadataResponse asset = getAssetMetadata(assetId);
        if (!ownerDid.equals(asset.ownerDID())) {
            throw new ForbiddenException("ASSET_NOT_OWNED",
                    "Caller does not own asset: " + assetId);
        }
        if ("BURNED".equals(asset.status())) {
            throw new GoneException("ASSET_BURNED", "Asset has already been burned: " + assetId);
        }

        String nonce = FabricAssetClient.generateNonce();
        String timestamp = Instant.now().toString();

        FabricAssetClient.TxOutcome outcome;
        try {
            outcome = fabricClient.burnAsset(assetId, ownerDid, request.ownerSignature(), nonce, timestamp);
        } catch (GatewayException e) {
            throw new FabricUnavailableException("Blockchain network unavailable", e);
        } catch (Exception e) {
            throw new RuntimeException("Asset burn failed: " + e.getMessage(), e);
        }

        // Off-chain cleanup: unpin IPFS content (best-effort) and delete the key
        if (asset.ipfsHash() != null && !asset.ipfsHash().isBlank()) {
            ipfsService.remove(asset.ipfsHash());
        }
        keyRepository.deleteById(assetId);

        eventProducer.publishAssetEvent("ASSET_BURNED", assetId, ownerDid,
                asset.classification(), asset.ipfsHash(), timestamp);

        String txHash = outcome.txId();  // real on-chain transaction ID
        logger.info("Asset burned: {} by owner: {} (tx: {})", assetId, ownerDid, txHash);

        return new BurnResponse(txHash, "BURNED");
    }

    // =========================================================================
    // Provenance
    // =========================================================================

    /**
     * Builds the provenance chain from on-chain state history.
     * Event types are derived by comparing consecutive asset states.
     */
    @Transactional(readOnly = true)
    public AssetHistoryResponse getHistory(String assetId) {
        try {
            String rawJson = fabricClient.getAssetHistory(assetId);
            List<Map<String, Object>> rawHistory = gson.fromJson(rawJson, RAW_HISTORY_TYPE);

            List<AssetHistoryResponse.HistoryEntry> entries = new ArrayList<>();
            String previousOwner = null;

            if (rawHistory != null) {
                for (Map<String, Object> modification : rawHistory) {
                    String txHash = String.valueOf(modification.getOrDefault("txId", ""));
                    String timestamp = modification.get("timestamp") != null
                            ? modification.get("timestamp").toString() : "";
                    String valueJson = modification.get("value") != null
                            ? String.valueOf(modification.get("value")) : null;
                    if (valueJson == null || valueJson.isBlank()) continue;

                    Map<String, String> asset = gson.fromJson(valueJson, STRING_MAP_TYPE);
                    String owner = asset.getOrDefault("ownerDid", "");
                    String status = asset.getOrDefault("status", "");

                    String event;
                    String actor;
                    if (previousOwner == null) {
                        event = "MINTED";
                        actor = owner;
                    } else if ("BURNED".equals(status)) {
                        event = "BURNED";
                        actor = owner;
                    } else if (!owner.equals(previousOwner)) {
                        event = "TRANSFERRED";
                        actor = previousOwner; // the previous owner initiated the transfer
                    } else {
                        event = "UPDATED";
                        actor = owner;
                    }

                    entries.add(new AssetHistoryResponse.HistoryEntry(event, actor, timestamp, txHash));
                    previousOwner = owner;
                }
            }

            return new AssetHistoryResponse(entries);
        } catch (GatewayException e) {
            throw new FabricUnavailableException("Blockchain network unavailable", e);
        }
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private void validateClassification(String classification) {
        if (classification == null || !VALID_CLASSIFICATIONS.contains(classification)) {
            throw new IllegalArgumentException("Invalid classification: " + classification +
                    ". Must be one of: " + VALID_CLASSIFICATIONS);
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("file is required");
        }
        if (file.getSize() > MAX_UPLOAD_BYTES) {
            throw new IllegalArgumentException("File too large (max 50 MB)");
        }
    }

    /**
     * Verifies the caller owns the asset (local pre-check for clean error codes;
     * the chaincode re-validates ownership atomically).
     */
    private void requireOwnership(String assetId, String did) {
        AssetMetadataResponse asset = getAssetMetadata(assetId);
        if (!did.equals(asset.ownerDID())) {
            throw new ForbiddenException("ASSET_NOT_OWNED",
                    "Caller does not own asset: " + assetId);
        }
        if ("BURNED".equals(asset.status())) {
            throw new GoneException("ASSET_BURNED", "Asset has been burned: " + assetId);
        }
    }

    private AssetMetadataResponse toMetadataResponse(String assetJson) {
        Map<String, String> asset = gson.fromJson(assetJson, STRING_MAP_TYPE);
        return new AssetMetadataResponse(
                asset.getOrDefault("assetId", ""),
                asset.getOrDefault("ownerDid", ""),
                asset.getOrDefault("ipfsHash", ""),
                asset.getOrDefault("classification", ""),
                asset.getOrDefault("policyId", ""),
                asset.getOrDefault("status", ""),
                asset.getOrDefault("fileName", ""),
                asset.getOrDefault("fileType", ""),
                safeLong(asset.get("fileSizeBytes")),
                asset.getOrDefault("createdAt", ""),
                asset.getOrDefault("updatedAt", ""));
    }

    private long safeLong(String value) {
        if (value == null || value.isBlank()) return 0;
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}