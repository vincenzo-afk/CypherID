package com.cypherid.asset.service.fabric;

import org.hyperledger.fabric.client.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * FabricAssetClient — wrapper around Hyperledger Fabric Gateway Java SDK
 * for the AssetRegistryChaincode (AssetContract).
 * <p>
 * SUBMIT transactions go through the orderer (state mutations).
 * EVALUATE transactions query a peer directly (reads).
 */
@Component
public class FabricAssetClient {

    private static final Logger logger = LoggerFactory.getLogger(FabricAssetClient.class);

    private final Gateway gateway;
    private final Network network;
    private final String assetChaincode;

    @Autowired
    public FabricAssetClient(FabricConnectionConfig config) throws Exception {
        this.assetChaincode = config.getAssetChaincode();

        // Build Gateway connection using config
        this.gateway = config.buildGateway();
        this.network = gateway.getNetwork(config.getChannelName());

        logger.info("Fabric Gateway connected to channel: {}", config.getChannelName());
    }

    // =========================================================================
    // Asset lifecycle — SUBMIT transactions
    // =========================================================================

    /**
     * Submit mintAsset — registers the asset NFT on-chain.
     * The ipfsHash is the CID of the AES-256-GCM encrypted blob.
     */
    public String mintAsset(String assetId, String ownerDid, String ipfsHash,
                            String classification, String policyId,
                            String fileName, String fileType, String fileSizeBytes,
                            String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network.getContract(assetChaincode);
        byte[] result = contract.submitTransaction("AssetContract:mintAsset",
                assetId, ownerDid, ipfsHash, classification, policyId,
                fileName, fileType, fileSizeBytes, nonce, timestamp);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Submit transferAsset — transfers ownership to another DID.
     */
    public String transferAsset(String assetId, String fromDid, String toDid,
                                String ownerSignature, String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network.getContract(assetChaincode);
        byte[] result = contract.submitTransaction("AssetContract:transferAsset",
                assetId, fromDid, toDid, ownerSignature, nonce, timestamp);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Submit burnAsset — burns (destroys) the asset on-chain.
     * Burning is recorded on-ledger as proof-of-deletion-intent.
     */
    public String burnAsset(String assetId, String ownerDid, String ownerSignature,
                            String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network.getContract(assetChaincode);
        byte[] result = contract.submitTransaction("AssetContract:burnAsset",
                assetId, ownerDid, ownerSignature, nonce, timestamp);
        return new String(result, StandardCharsets.UTF_8);
    }

    // =========================================================================
    // Asset queries — EVALUATE transactions
    // =========================================================================

    /**
     * Evaluate queryAsset — reads asset metadata from a peer (no ordering).
     */
    public String queryAsset(String assetId) throws GatewayException {
        Contract contract = network.getContract(assetChaincode);
        byte[] result = contract.evaluateTransaction("AssetContract:queryAsset", assetId);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Evaluate queryOwnerAssets — JSON array of asset IDs owned by a DID.
     */
    public String queryOwnerAssets(String ownerDid) throws GatewayException {
        Contract contract = network.getContract(assetChaincode);
        byte[] result = contract.evaluateTransaction("AssetContract:queryOwnerAssets", ownerDid);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Evaluate getAssetHistory — full provenance chain for an asset.
     */
    public String getAssetHistory(String assetId) throws GatewayException {
        Contract contract = network.getContract(assetChaincode);
        byte[] result = contract.evaluateTransaction("AssetContract:getAssetHistory", assetId);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Generate a fresh UUID-based nonce for replay protection.
     */
    public static String generateNonce() {
        return UUID.randomUUID().toString();
    }
}