package com.cypherid.identity.service.fabric;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import org.hyperledger.fabric.client.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * FabricGatewayClient — wrapper around Hyperledger Fabric Gateway Java SDK.
 * <p>
 * Routes transactions to the correct chaincode (identity, accesscontrol, assetregistry).
 * Uses virtual threads (Project Loom) for non-blocking Fabric calls.
 *
 * Key design:
 * - SUBMIT transactions go through orderer (for state mutations)
 * - EVALUATE transactions query a peer directly (for reads)
 */
@Component
public class FabricGatewayClient {

    private static final Logger logger = LoggerFactory.getLogger(FabricGatewayClient.class);
    private static final Gson GSON = new GsonBuilder().create();

    private final Gateway gateway;
    private final Network network;
    private final String identityChaincode;
    private final String accessChaincode;
    private final String assetChaincode;

    @Autowired
    public FabricGatewayClient(FabricConnectionConfig config) throws Exception {
        this.identityChaincode = config.getIdentityChaincode();
        this.accessChaincode   = config.getAccessChaincode();
        this.assetChaincode    = config.getAssetChaincode();

        // Build Gateway connection using config
        this.gateway = config.buildGateway();
        this.network = gateway.getNetwork(config.getChannelName());

        logger.info("Fabric Gateway connected to channel: {}", config.getChannelName());
    }

    // =========================================================================
    // Identity Chaincode calls
    // =========================================================================

    /**
     * Submit createDID transaction to Fabric — creates DID on-chain.
     * @return DIDDocument JSON string from chaincode
     */
    public String createDID(String did, String publicKey, String metadata, String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network.getContract(identityChaincode);
        byte[] result = contract.submitTransaction("IdentityContract:createDID",
                did, publicKey, metadata, nonce, timestamp);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Evaluate resolveDID — reads DID document from peer (no ordering).
     */
    public String resolveDID(String did) throws GatewayException {
        Contract contract = network.getContract(identityChaincode);
        byte[] result = contract.evaluateTransaction("IdentityContract:resolveDID", did);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Submit suspendDID transaction.
     */
    public String suspendDID(String did, String adminDid, String reason, String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network.getContract(identityChaincode);
        byte[] result = contract.submitTransaction("IdentityContract:suspendDID",
                did, adminDid, reason, nonce, timestamp);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Submit revokeDID transaction — irreversible.
     */
    public String revokeDID(String did, String adminDid, String reason, String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network.getContract(identityChaincode);
        byte[] result = contract.submitTransaction("IdentityContract:revokeDID",
                did, adminDid, reason, nonce, timestamp);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Submit issueVC transaction.
     */
    public String issueVC(String did, String vcId, String vcJson, String issuerDid,
                          String issuerSignature, String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network.getContract(identityChaincode);
        byte[] result = contract.submitTransaction("IdentityContract:issueVC",
                did, vcId, vcJson, issuerDid, issuerSignature, nonce, timestamp);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Submit revokeVC transaction.
     */
    public String revokeVC(String did, String vcId, String issuerDid, String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network.getContract(identityChaincode);
        byte[] result = contract.submitTransaction("IdentityContract:revokeVC",
                did, vcId, issuerDid, nonce, timestamp);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Evaluate verifyVC — read-only VC verification.
     */
    public String verifyVC(String did, String vcId) throws GatewayException {
        Contract contract = network.getContract(identityChaincode);
        byte[] result = contract.evaluateTransaction("IdentityContract:verifyVC", did, vcId);
        return new String(result, StandardCharsets.UTF_8);
    }

    // =========================================================================
    // Access Control Chaincode calls
    // =========================================================================

    /**
     * Submit createPolicy transaction.
     */
    public String createPolicy(String policyId, String resourceId, String requiredRole,
                               String abacJson, String action, String adminDid,
                               String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network.getContract(accessChaincode);
        byte[] result = contract.submitTransaction("AccessControlContract:createPolicy",
                policyId, resourceId, requiredRole, abacJson, action, adminDid, nonce, timestamp);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Evaluate evaluateAccess — read-only access decision.
     */
    public String evaluateAccess(String did, String resourceId, String action,
                                 String contextJson, String vcVerificationResult, String timestamp)
            throws GatewayException {
        Contract contract = network.getContract(accessChaincode);
        byte[] result = contract.evaluateTransaction("AccessControlContract:evaluateAccess",
                did, resourceId, action, contextJson, vcVerificationResult, timestamp);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Submit logAccess — writes immutable access log to ledger.
     */
    public String logAccess(String did, String resourceId, String action, String decision,
                            String reason, String policyId, String contextJson,
                            String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network.getContract(accessChaincode);
        byte[] result = contract.submitTransaction("AccessControlContract:logAccess",
                did, resourceId, action, decision, reason, policyId, contextJson, nonce, timestamp);
        return new String(result, StandardCharsets.UTF_8);
    }

    // =========================================================================
    // Asset Registry Chaincode calls
    // =========================================================================

    /**
     * Submit mintAsset transaction.
     */
    public String mintAsset(String assetId, String ownerDid, String ipfsHash,
                            String classification, String policyId,
                            String fileName, String fileType, String fileSize,
                            String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network.getContract(assetChaincode);
        byte[] result = contract.submitTransaction("AssetContract:mintAsset",
                assetId, ownerDid, ipfsHash, classification, policyId,
                fileName, fileType, fileSize, nonce, timestamp);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Submit transferAsset transaction.
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
     * Submit burnAsset transaction.
     */
    public String burnAsset(String assetId, String ownerDid, String ownerSignature,
                            String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network.getContract(assetChaincode);
        byte[] result = contract.submitTransaction("AssetContract:burnAsset",
                assetId, ownerDid, ownerSignature, nonce, timestamp);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Evaluate queryAsset — read asset metadata.
     */
    public String queryAsset(String assetId) throws GatewayException {
        Contract contract = network.getContract(assetChaincode);
        byte[] result = contract.evaluateTransaction("AssetContract:queryAsset", assetId);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Evaluate queryOwnerAssets — list assets by owner DID.
     */
    public String queryOwnerAssets(String ownerDid) throws GatewayException {
        Contract contract = network.getContract(assetChaincode);
        byte[] result = contract.evaluateTransaction("AssetContract:queryOwnerAssets", ownerDid);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Evaluate getAssetHistory — full provenance chain.
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
