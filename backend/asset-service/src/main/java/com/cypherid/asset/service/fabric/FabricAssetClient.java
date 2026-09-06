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
 * SUBMIT transactions go through the orderer (state mutations) and return the
 * REAL on-chain transaction ID from the commit status.
 * EVALUATE transactions query a peer directly (reads).
 */
@Component
public class FabricAssetClient {

    private static final Logger logger = LoggerFactory.getLogger(FabricAssetClient.class);

    private Gateway gateway;
    private Network network;
    private String unavailableReason;
    private final String assetChaincode;

    @Autowired
    public FabricAssetClient(FabricConnectionConfig config) {
        this.assetChaincode = config.getAssetChaincode();

        try {
            // Build Gateway connection using config
            this.gateway = config.buildGateway();
            this.network = gateway.getNetwork(config.getChannelName());
            logger.info("Fabric Gateway connected to channel: {}", config.getChannelName());
        } catch (Exception e) {
            // Do not fail startup when Fabric crypto material / network is absent.
            // Transactions fail with FABRIC_UNAVAILABLE until the network is reachable.
            this.gateway = null;
            this.network = null;
            this.unavailableReason = e.getMessage();
            logger.warn("Fabric Gateway unavailable at startup ({}). " +
                    "Transactions will fail until the network is reachable.", e.getMessage());
        }
    }

    /**
     * Submits a transaction and returns its real payload + on-chain transaction ID.
     * Blocks until the transaction is committed to the ledger.
     */
    private TxOutcome submit(Contract contract, String transactionName, String... args)
            throws GatewayException, CommitException {
        final Transaction transaction;
        try {
            transaction = contract.newProposal(transactionName)
                    .addArguments(args)
                    .build()
                    .endorse();
        } catch (EndorseException e) {
            throw unavailable("Endorsement failed: " + e.getMessage());
        }
        byte[] payload = transaction.getResult();
        final SubmittedTransaction commit;
        try {
            commit = transaction.submitAsync();
        } catch (SubmitException e) {
            throw unavailable("Submit failed: " + e.getMessage());
        }
        String txId = commit.getTransactionId();
        try {
            commit.getStatus(); // await commit completion; throws on failure
        } catch (CommitStatusException e) {
            throw unavailable("Commit failed: " + e.getMessage());
        }
        return new TxOutcome(payload, txId);
    }

    /** Result of a SUBMIT transaction: chaincode response payload + real tx ID. */
    public record TxOutcome(byte[] payload, String txId) {
        public String payloadUtf8() {
            return new String(payload, StandardCharsets.UTF_8);
        }
    }

    private Network network() throws GatewayException {
        if (network == null) {
            throw unavailable("Fabric gateway unavailable: " + unavailableReason);
        }
        return network;
    }

    /**
     * Wraps a failure as a GatewayException with UNAVAILABLE status so existing
     * catch sites (mapped to FABRIC_UNAVAILABLE) keep working. The v1 SDK
     * GatewayException has no String constructor.
     */
    private static GatewayException unavailable(String message) {
        return new GatewayException(
                io.grpc.Status.UNAVAILABLE.withDescription(message).asRuntimeException());
    }

    // =========================================================================
    // Asset lifecycle — SUBMIT transactions
    // =========================================================================

    /**
     * Submit mintAsset — registers the asset NFT on-chain.
     * The ipfsHash is the CID of the AES-256-GCM encrypted blob.
     */
    public TxOutcome mintAsset(String assetId, String ownerDid, String ipfsHash,
                               String classification, String policyId,
                               String fileName, String fileType, String fileSizeBytes,
                               String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network().getContract(assetChaincode);
        return submit(contract, "AssetContract:mintAsset",
                assetId, ownerDid, ipfsHash, classification, policyId,
                fileName, fileType, fileSizeBytes, nonce, timestamp);
    }

    /**
     * Submit transferAsset — transfers ownership to another DID.
     */
    public TxOutcome transferAsset(String assetId, String fromDid, String toDid,
                                   String ownerSignature, String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network().getContract(assetChaincode);
        return submit(contract, "AssetContract:transferAsset",
                assetId, fromDid, toDid, ownerSignature, nonce, timestamp);
    }

    /**
     * Submit burnAsset — burns (destroys) the asset on-chain.
     * Burning is recorded on-ledger as proof-of-deletion-intent.
     */
    public TxOutcome burnAsset(String assetId, String ownerDid, String ownerSignature,
                               String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network().getContract(assetChaincode);
        return submit(contract, "AssetContract:burnAsset",
                assetId, ownerDid, ownerSignature, nonce, timestamp);
    }

    // =========================================================================
    // Asset queries — EVALUATE transactions
    // =========================================================================

    /**
     * Evaluate queryAsset — reads asset metadata from a peer (no ordering).
     */
    public String queryAsset(String assetId) throws GatewayException {
        Contract contract = network().getContract(assetChaincode);
        byte[] result = contract.evaluateTransaction("AssetContract:queryAsset", assetId);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Evaluate queryOwnerAssets — JSON array of asset IDs owned by a DID.
     */
    public String queryOwnerAssets(String ownerDid) throws GatewayException {
        Contract contract = network().getContract(assetChaincode);
        byte[] result = contract.evaluateTransaction("AssetContract:queryOwnerAssets", ownerDid);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Evaluate getAssetHistory — full provenance chain for an asset.
     */
    public String getAssetHistory(String assetId) throws GatewayException {
        Contract contract = network().getContract(assetChaincode);
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