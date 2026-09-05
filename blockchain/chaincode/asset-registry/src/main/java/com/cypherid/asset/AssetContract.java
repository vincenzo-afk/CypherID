package com.cypherid.asset;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import org.hyperledger.fabric.contract.Context;
import org.hyperledger.fabric.contract.ContractInterface;
import org.hyperledger.fabric.contract.annotation.*;
import org.hyperledger.fabric.shim.ChaincodeStub;
import org.hyperledger.fabric.shim.ledger.KeyModification;
import org.hyperledger.fabric.shim.ledger.QueryResultsIterator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;

/**
 * AssetContract — Hyperledger Fabric Java Chaincode
 *
 * Manages the full lifecycle of digital assets:
 * mint → transfer → burn, with full provenance tracking.
 *
 * State Keys:
 *   ASSET:{assetId}           → Asset JSON
 *   OWNER_ASSETS:{ownerDid}   → JSON array of asset IDs
 *   NONCE:{did}:{nonce}       → "used" (replay protection)
 */
@Contract(
    name = "AssetContract",
    info = @Info(
        title = "CypherID Asset Registry Contract",
        description = "Digital asset lifecycle management on Hyperledger Fabric",
        version = "1.0.0",
        license = @License(name = "Apache-2.0"),
        contact = @Contact(name = "CypherID Team", email = "itsmebk2007@gmail.com")
    )
)
@Default
public class AssetContract implements ContractInterface {

    private static final Logger logger = LoggerFactory.getLogger(AssetContract.class);
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    // ─── State Key Prefixes ───────────────────────────────────────────────────
    private static final String KEY_ASSET        = "ASSET:";
    private static final String KEY_OWNER_ASSETS = "OWNER_ASSETS:";
    private static final String KEY_NONCE        = "NONCE:";

    // ─── Valid Classification Levels ──────────────────────────────────────────
    private static final List<String> VALID_CLASSIFICATIONS = List.of(
            "UNCLASSIFIED", "CONFIDENTIAL", "SECRET", "TOP_SECRET");

    // =========================================================================
    // mintAsset — SUBMIT
    // =========================================================================
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public Asset mintAsset(
            final Context ctx,
            final String assetId,
            final String ownerDid,
            final String ipfsHash,
            final String classification,
            final String policyId,
            final String fileName,
            final String fileType,
            final String fileSizeBytes,
            final String nonce,
            final String timestamp) {

        ChaincodeStub stub = ctx.getStub();
        checkAndStoreNonce(stub, ownerDid, nonce);

        // Validate asset doesn't already exist
        String existing = stub.getStringState(KEY_ASSET + assetId);
        if (existing != null && !existing.isEmpty()) {
            throw new RuntimeException("Asset already exists: " + assetId);
        }

        // Validate classification
        if (!VALID_CLASSIFICATIONS.contains(classification)) {
            throw new RuntimeException("Invalid classification: " + classification +
                    ". Must be one of: " + VALID_CLASSIFICATIONS);
        }

        // Validate required fields
        if (ownerDid == null || !ownerDid.startsWith("did:cypherid:")) {
            throw new RuntimeException("Invalid ownerDid format: " + ownerDid);
        }
        if (ipfsHash == null || ipfsHash.isBlank()) {
            throw new RuntimeException("ipfsHash is required");
        }

        long fileSize = 0;
        try {
            fileSize = Long.parseLong(fileSizeBytes);
        } catch (NumberFormatException e) {
            // non-critical, leave as 0
        }

        Asset asset = Asset.builder()
                .assetId(assetId)
                .ownerDid(ownerDid)
                .ipfsHash(ipfsHash)
                .classification(classification)
                .policyId(policyId)
                .status("ACTIVE")
                .fileName(fileName)
                .fileType(fileType)
                .fileSizeBytes(fileSize)
                .createdAt(timestamp)
                .updatedAt(timestamp)
                .build();

        stub.putStringState(KEY_ASSET + assetId, GSON.toJson(asset));
        addToOwnerIndex(stub, ownerDid, assetId);

        String eventPayload = String.format(
                "{\"assetId\":\"%s\",\"ownerDid\":\"%s\",\"classification\":\"%s\",\"ipfsHash\":\"%s\",\"timestamp\":\"%s\"}",
                assetId, ownerDid, classification, ipfsHash, timestamp);
        stub.setEvent("AssetMinted", eventPayload.getBytes());

        logger.info("Asset minted: {} owner: {} classification: {}", assetId, ownerDid, classification);
        return asset;
    }

    // =========================================================================
    // transferAsset — SUBMIT
    // =========================================================================
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public Asset transferAsset(
            final Context ctx,
            final String assetId,
            final String fromDid,
            final String toDid,
            final String ownerSignature,
            final String nonce,
            final String timestamp) {

        ChaincodeStub stub = ctx.getStub();
        checkAndStoreNonce(stub, fromDid, nonce);

        Asset asset = requireAsset(stub, assetId);

        // Verify ownership
        if (!fromDid.equals(asset.getOwnerDid())) {
            throw new RuntimeException("Caller " + fromDid + " does not own asset " + assetId +
                    ". Owner is: " + asset.getOwnerDid());
        }

        // Verify asset is transferable
        if (!"ACTIVE".equals(asset.getStatus())) {
            throw new RuntimeException("Asset is not ACTIVE. Status: " + asset.getStatus());
        }

        // Validate signature is present (backend verifies cryptographic validity)
        if (ownerSignature == null || ownerSignature.isBlank()) {
            throw new RuntimeException("ownerSignature is required for transfer");
        }

        // Validate toDid format
        if (toDid == null || !toDid.startsWith("did:cypherid:")) {
            throw new RuntimeException("Invalid toDid format: " + toDid);
        }

        // Update ownership
        String previousOwner = asset.getOwnerDid();
        asset.setOwnerDid(toDid);
        asset.setStatus("ACTIVE"); // still active, just new owner
        asset.setUpdatedAt(timestamp);

        stub.putStringState(KEY_ASSET + assetId, GSON.toJson(asset));

        // Update owner indices
        removeFromOwnerIndex(stub, fromDid, assetId);
        addToOwnerIndex(stub, toDid, assetId);

        String eventPayload = String.format(
                "{\"assetId\":\"%s\",\"fromDid\":\"%s\",\"toDid\":\"%s\",\"timestamp\":\"%s\"}",
                assetId, previousOwner, toDid, timestamp);
        stub.setEvent("AssetTransferred", eventPayload.getBytes());

        logger.info("Asset {} transferred from {} to {}", assetId, previousOwner, toDid);
        return asset;
    }

    // =========================================================================
    // burnAsset — SUBMIT
    // =========================================================================
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public Asset burnAsset(
            final Context ctx,
            final String assetId,
            final String ownerDid,
            final String ownerSignature,
            final String nonce,
            final String timestamp) {

        ChaincodeStub stub = ctx.getStub();
        checkAndStoreNonce(stub, ownerDid, nonce);

        Asset asset = requireAsset(stub, assetId);

        // Verify ownership
        if (!ownerDid.equals(asset.getOwnerDid())) {
            throw new RuntimeException("Caller " + ownerDid + " does not own asset " + assetId);
        }

        if ("BURNED".equals(asset.getStatus())) {
            throw new RuntimeException("Asset already burned: " + assetId);
        }

        if (ownerSignature == null || ownerSignature.isBlank()) {
            throw new RuntimeException("ownerSignature is required to burn asset");
        }

        asset.setStatus("BURNED");
        asset.setUpdatedAt(timestamp);

        stub.putStringState(KEY_ASSET + assetId, GSON.toJson(asset));

        // Note: we DO NOT delete from ledger — burning is recorded as proof-of-deletion-intent
        // The IPFS content removal is handled off-chain by AssetService

        String eventPayload = String.format(
                "{\"assetId\":\"%s\",\"ownerDid\":\"%s\",\"burnedAt\":\"%s\"}",
                assetId, ownerDid, timestamp);
        stub.setEvent("AssetBurned", eventPayload.getBytes());

        logger.info("Asset burned: {} by owner: {}", assetId, ownerDid);
        return asset;
    }

    // =========================================================================
    // queryAsset — EVALUATE
    // =========================================================================
    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public Asset queryAsset(final Context ctx, final String assetId) {
        ChaincodeStub stub = ctx.getStub();
        return requireAsset(stub, assetId);
    }

    // =========================================================================
    // queryOwnerAssets — EVALUATE
    // =========================================================================
    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public String queryOwnerAssets(final Context ctx, final String ownerDid) {
        ChaincodeStub stub = ctx.getStub();
        String json = stub.getStringState(KEY_OWNER_ASSETS + ownerDid);
        if (json == null || json.isEmpty()) {
            return "[]";
        }
        return json;
    }

    // =========================================================================
    // getAssetHistory — EVALUATE (full provenance chain)
    // =========================================================================
    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public String getAssetHistory(final Context ctx, final String assetId) {
        ChaincodeStub stub = ctx.getStub();

        List<Object> history = new ArrayList<>();

        try (QueryResultsIterator<KeyModification> iterator = stub.getHistoryForKey(KEY_ASSET + assetId)) {
            for (KeyModification modification : iterator) {
                history.add(new java.util.LinkedHashMap<>() {{
                    put("txId",      modification.getTxId());
                    put("timestamp", modification.getTimestamp() != null
                                     ? modification.getTimestamp().toString() : null);
                    put("isDelete",  modification.isDeleted());
                    put("value",     modification.getStringValue());
                }});
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to get asset history: " + e.getMessage(), e);
        }

        return GSON.toJson(history);
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    private Asset requireAsset(ChaincodeStub stub, String assetId) {
        String json = stub.getStringState(KEY_ASSET + assetId);
        if (json == null || json.isEmpty()) {
            throw new RuntimeException("Asset not found: " + assetId);
        }
        return GSON.fromJson(json, Asset.class);
    }

    private void addToOwnerIndex(ChaincodeStub stub, String ownerDid, String assetId) {
        String key = KEY_OWNER_ASSETS + ownerDid;
        String existing = stub.getStringState(key);
        Type listType = new TypeToken<List<String>>(){}.getType();
        List<String> assets = (existing != null && !existing.isEmpty())
                ? GSON.fromJson(existing, listType)
                : new ArrayList<>();
        if (!assets.contains(assetId)) {
            assets.add(assetId);
        }
        stub.putStringState(key, GSON.toJson(assets));
    }

    private void removeFromOwnerIndex(ChaincodeStub stub, String ownerDid, String assetId) {
        String key = KEY_OWNER_ASSETS + ownerDid;
        String existing = stub.getStringState(key);
        if (existing == null || existing.isEmpty()) return;
        Type listType = new TypeToken<List<String>>(){}.getType();
        List<String> assets = new ArrayList<>(GSON.fromJson(existing, listType));
        assets.remove(assetId);
        stub.putStringState(key, GSON.toJson(assets));
    }

    private void checkAndStoreNonce(ChaincodeStub stub, String did, String nonce) {
        if (nonce == null || nonce.isBlank()) {
            throw new RuntimeException("Nonce is required");
        }
        String nonceKey = KEY_NONCE + did + ":" + nonce;
        String existing = stub.getStringState(nonceKey);
        if (existing != null && !existing.isEmpty()) {
            throw new RuntimeException("Nonce already used (replay attack): " + nonce);
        }
        stub.putStringState(nonceKey, "used");
    }
}
