package com.cypherid.access.service.fabric;

import org.hyperledger.fabric.client.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * FabricAccessClient — wrapper around Hyperledger Fabric Gateway Java SDK
 * for the AccessControlChaincode.
 * <p>
 * SUBMIT transactions go through the orderer (state mutations).
 * EVALUATE transactions query a peer directly (reads).
 */
@Component
public class FabricAccessClient {

    private static final Logger logger = LoggerFactory.getLogger(FabricAccessClient.class);

    private Gateway gateway;
    private Network network;
    private String unavailableReason;
    private final String accessChaincode;
    private final String identityChaincode;

    @Autowired
    public FabricAccessClient(FabricConnectionConfig config) {
        this.accessChaincode   = config.getAccessChaincode();
        this.identityChaincode = config.getIdentityChaincode();

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

    private Network network() throws GatewayException {
        if (network == null) {
            throw new GatewayException("Fabric gateway unavailable: " + unavailableReason);
        }
        return network;
    }

    // =========================================================================
    // Policy management
    // =========================================================================

    /**
     * Submit createPolicy — creates an RBAC+ABAC access policy on-chain.
     */
    public String createPolicy(String policyId, String resourceId, String requiredRole,
                               String abacAttributesJson, String action, String adminDid,
                               String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network().getContract(accessChaincode);
        byte[] result = contract.submitTransaction("AccessControlContract:createPolicy",
                policyId, resourceId, requiredRole, abacAttributesJson, action, adminDid, nonce, timestamp);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Evaluate getPolicy — reads a policy by policyId (no ordering).
     */
    public String getPolicy(String policyId) throws GatewayException {
        Contract contract = network().getContract(accessChaincode);
        byte[] result = contract.evaluateTransaction("AccessControlContract:getPolicy", policyId);
        return new String(result, StandardCharsets.UTF_8);
    }

    // =========================================================================
    // Access evaluation
    // =========================================================================

    /**
     * Evaluate evaluateAccess — read-only on-chain access decision.
     * The caller must then call logAccess (SUBMIT) to record the decision.
     */
    public String evaluateAccess(String did, String resourceId, String action,
                                 String contextAttributesJson, String vcVerificationResult,
                                 String timestamp)
            throws GatewayException {
        Contract contract = network().getContract(accessChaincode);
        byte[] result = contract.evaluateTransaction("AccessControlContract:evaluateAccess",
                did, resourceId, action, contextAttributesJson, vcVerificationResult, timestamp);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Submit logAccess — writes the immutable access decision to the ledger.
     */
    public String logAccess(String did, String resourceId, String action, String decision,
                            String reason, String policyId, String contextAttributesJson,
                            String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network().getContract(accessChaincode);
        byte[] result = contract.submitTransaction("AccessControlContract:logAccess",
                did, resourceId, action, decision, reason, policyId, contextAttributesJson, nonce, timestamp);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Evaluate getAccessLog — reads an access log entry by logId.
     */
    public String getAccessLog(String logId) throws GatewayException {
        Contract contract = network().getContract(accessChaincode);
        byte[] result = contract.evaluateTransaction("AccessControlContract:getAccessLog", logId);
        return new String(result, StandardCharsets.UTF_8);
    }

    // =========================================================================
    // Delegation
    // =========================================================================

    /**
     * Submit delegateAccess — grants another DID access within delegator's permissions.
     */
    public String delegateAccess(String fromDid, String toDid, String resourceId, String action,
                                 String expiresAt, String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network().getContract(accessChaincode);
        byte[] result = contract.submitTransaction("AccessControlContract:delegateAccess",
                fromDid, toDid, resourceId, action, expiresAt, nonce, timestamp);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Submit revokeDelegate — revokes a previously granted delegation.
     */
    public String revokeDelegate(String fromDid, String toDid, String resourceId,
                                 String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network().getContract(accessChaincode);
        byte[] result = contract.submitTransaction("AccessControlContract:revokeDelegate",
                fromDid, toDid, resourceId, nonce, timestamp);
        return new String(result, StandardCharsets.UTF_8);
    }

    // =========================================================================
    // Multi-signature approval
    // =========================================================================

    /**
     * Submit createMultiSigRequest — starts a multi-approver access request.
     */
    public String createMultiSigRequest(String requestId, String resourceId, String requesterDid,
                                        String requiredApproversJson, String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network().getContract(accessChaincode);
        byte[] result = contract.submitTransaction("AccessControlContract:createMultiSigRequest",
                requestId, resourceId, requesterDid, requiredApproversJson, nonce, timestamp);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Submit approveMultiSig — records one approver's approval.
     */
    public String approveMultiSig(String requestId, String approverDid, String signature,
                                  String nonce, String timestamp)
            throws GatewayException, CommitException {
        Contract contract = network().getContract(accessChaincode);
        byte[] result = contract.submitTransaction("AccessControlContract:approveMultiSig",
                requestId, approverDid, signature, nonce, timestamp);
        return new String(result, StandardCharsets.UTF_8);
    }

    /**
     * Generate a fresh UUID-based nonce for replay protection.
     */
    public static String generateNonce() {
        return UUID.randomUUID().toString();
    }
}