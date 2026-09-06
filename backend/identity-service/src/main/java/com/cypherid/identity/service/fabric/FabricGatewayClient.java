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
 * SUBMIT transactions return the REAL on-chain transaction ID from the commit status;
 * EVALUATE transactions query a peer directly (for reads).
 */
@Component
public class FabricGatewayClient {

    private static final Logger logger = LoggerFactory.getLogger(FabricGatewayClient.class);
    private static final Gson GSON = new GsonBuilder().create();

    private Gateway gateway;
    private Network network;
    private String unavailableReason;
    private final String identityChaincode;
    private final String accessChaincode;
    private final String assetChaincode;

    @Autowired
    public FabricGatewayClient(FabricConnectionConfig config) {
        this.identityChaincode = config.getIdentityChaincode();
        this.accessChaincode   = config.getAccessChaincode();
        this.assetChaincode    = config.getAssetChaincode();

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
    // Identity Chaincode calls
    // =========================================================================

    /**
     * Submit createDID transaction to Fabric — creates DID on-chain.
     * Returns the DID document JSON payload + real transaction ID.
     */
    public TxOutcome createDID(String did, String publicKey, String metadata, String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network().getContract(identityChaincode);
        return submit(contract, "IdentityContract:createDID", did, publicKey, metadata, nonce, timestamp);
    }

    /**
     * Evaluate resolveDID — reads DID document from peer (no ordering).
     */
    public String resolveDID(String did) throws GatewayException {
        Contract contract = network().getContract(identityChaincode);
        byte[] result = contract.evaluateTransaction("IdentityContract:resolveDID", did);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Submit suspendDID transaction.
     */
    public TxOutcome suspendDID(String did, String adminDid, String reason, String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network().getContract(identityChaincode);
        return submit(contract, "IdentityContract:suspendDID", did, adminDid, reason, nonce, timestamp);
    }

    /**
     * Submit revokeDID transaction — irreversible.
     */
    public TxOutcome revokeDID(String did, String adminDid, String reason, String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network().getContract(identityChaincode);
        return submit(contract, "IdentityContract:revokeDID", did, adminDid, reason, nonce, timestamp);
    }

    /**
     * Submit issueVC transaction.
     */
    public TxOutcome issueVC(String did, String vcId, String vcJson, String issuerDid,
                             String issuerSignature, String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network().getContract(identityChaincode);
        return submit(contract, "IdentityContract:issueVC",
                did, vcId, vcJson, issuerDid, issuerSignature, nonce, timestamp);
    }

    /**
     * Submit revokeVC transaction.
     */
    public TxOutcome revokeVC(String did, String vcId, String issuerDid, String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network().getContract(identityChaincode);
        return submit(contract, "IdentityContract:revokeVC", did, vcId, issuerDid, nonce, timestamp);
    }

    /**
     * Evaluate verifyVC — read-only VC verification.
     */
    public String verifyVC(String did, String vcId) throws GatewayException {
        Contract contract = network().getContract(identityChaincode);
        byte[] result = contract.evaluateTransaction("IdentityContract:verifyVC", did, vcId);
        return new String(result, StandardCharsets.UTF_8);
    }

    // =========================================================================
    // Access Control Chaincode calls
    // =========================================================================

    /**
     * Submit createPolicy transaction.
     */
    public TxOutcome createPolicy(String policyId, String resourceId, String requiredRole,
                                  String abacJson, String action, String adminDid,
                                  String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network().getContract(accessChaincode);
        return submit(contract, "AccessControlContract:createPolicy",
                policyId, resourceId, requiredRole, abacJson, action, adminDid, nonce, timestamp);
    }

    /**
     * Evaluate evaluateAccess — read-only access decision.
     */
    public String evaluateAccess(String did, String resourceId, String action,
                                 String contextJson, String vcVerificationResult, String timestamp)
            throws GatewayException {
        Contract contract = network().getContract(accessChaincode);
        byte[] result = contract.evaluateTransaction("AccessControlContract:evaluateAccess",
                did, resourceId, action, contextJson, vcVerificationResult, timestamp);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Submit logAccess — writes immutable access log to ledger.
     */
    public TxOutcome logAccess(String did, String resourceId, String action, String decision,
                               String reason, String policyId, String contextJson,
                               String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network().getContract(accessChaincode);
        return submit(contract, "AccessControlContract:logAccess",
                did, resourceId, action, decision, reason, policyId, contextJson, nonce, timestamp);
    }

    // =========================================================================
    // Asset Registry Chaincode calls
    // =========================================================================

    /**
     * Submit mintAsset transaction.
     */
    public TxOutcome mintAsset(String assetId, String ownerDid, String ipfsHash,
                               String classification, String policyId,
                               String fileName, String fileType, String fileSize,
                               String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network().getContract(assetChaincode);
        return submit(contract, "AssetContract:mintAsset",
                assetId, ownerDid, ipfsHash, classification, policyId,
                fileName, fileType, fileSize, nonce, timestamp);
    }

    /**
     * Submit transferAsset transaction.
     */
    public TxOutcome transferAsset(String assetId, String fromDid, String toDid,
                                   String ownerSignature, String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network().getContract(assetChaincode);
        return submit(contract, "AssetContract:transferAsset",
                assetId, fromDid, toDid, ownerSignature, nonce, timestamp);
    }

    /**
     * Submit burnAsset transaction.
     */
    public TxOutcome burnAsset(String assetId, String ownerDid, String ownerSignature,
                               String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network().getContract(assetChaincode);
        return submit(contract, "AssetContract:burnAsset",
                assetId, ownerDid, ownerSignature, nonce, timestamp);
    }

    /**
     * Evaluate queryAsset — read asset metadata.
     */
    public String queryAsset(String assetId) throws GatewayException {
        Contract contract = network().getContract(assetChaincode);
        byte[] result = contract.evaluateTransaction("AssetContract:queryAsset", assetId);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Evaluate queryOwnerAssets — list assets by owner DID.
     */
    public String queryOwnerAssets(String ownerDid) throws GatewayException {
        Contract contract = network().getContract(assetChaincode);
        byte[] result = contract.evaluateTransaction("AssetContract:queryOwnerAssets", ownerDid);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Evaluate getAssetHistory — full provenance chain.
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