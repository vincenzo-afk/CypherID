package com.cypherid.access;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import org.hyperledger.fabric.contract.Context;
import org.hyperledger.fabric.contract.ContractInterface;
import org.hyperledger.fabric.contract.annotation.*;
import org.hyperledger.fabric.shim.ChaincodeStub;
import org.hyperledger.fabric.shim.ledger.KeyValue;
import org.hyperledger.fabric.shim.ledger.QueryResultsIterator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * AccessControlContract — Hyperledger Fabric Java Chaincode
 *
 * Manages RBAC + ABAC access control policies, access decisions,
 * multi-signature approvals, and access delegation.
 *
 * State Keys:
 *   POLICY:{policyId}               → AccessPolicy JSON
 *   ACCESS_LOG:{txId}               → AccessLog JSON
 *   DELEGATE:{fromDID}:{toDID}:{resourceId} → DelegationRecord JSON
 *   MULTISIG:{requestId}            → MultiSigRequest JSON
 *   NONCE:{did}:{nonce}             → "used" (replay protection)
 */
@Contract(
    name = "AccessControlContract",
    info = @Info(
        title = "CypherID Access Control Contract",
        description = "RBAC + ABAC access control on Hyperledger Fabric",
        version = "1.0.0",
        license = @License(name = "Apache-2.0"),
        contact = @Contact(name = "CypherID Team", email = "itsmebk2007@gmail.com")
    )
)
@Default
public class AccessControlContract implements ContractInterface {

    private static final Logger logger = LoggerFactory.getLogger(AccessControlContract.class);
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    // ─── State Key Prefixes ───────────────────────────────────────────────────
    private static final String KEY_POLICY     = "POLICY:";
    private static final String KEY_ACCESS_LOG = "ACCESS_LOG:";
    private static final String KEY_DELEGATE   = "DELEGATE:";
    private static final String KEY_MULTISIG   = "MULTISIG:";
    private static final String KEY_NONCE      = "NONCE:";

    // ─── Admin prefix ─────────────────────────────────────────────────────────
    private static final String ADMIN_DID_PREFIX = "did:cypherid:admin";

    // =========================================================================
    // createPolicy — SUBMIT
    // =========================================================================
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public AccessPolicy createPolicy(
            final Context ctx,
            final String policyId,
            final String resourceId,
            final String requiredRole,
            final String abacAttributesJson,
            final String action,
            final String adminDid,
            final String nonce,
            final String timestamp) {

        ChaincodeStub stub = ctx.getStub();
        requireAdmin(adminDid);
        checkAndStoreNonce(stub, adminDid, nonce);

        // Check policy doesn't already exist
        String existing = stub.getStringState(KEY_POLICY + policyId);
        if (existing != null && !existing.isEmpty()) {
            throw new RuntimeException("Policy already exists: " + policyId);
        }

        Type mapType = new TypeToken<Map<String, String>>(){}.getType();
        Map<String, String> abacAttributes = abacAttributesJson != null
                ? GSON.fromJson(abacAttributesJson, mapType)
                : Map.of();

        AccessPolicy policy = AccessPolicy.builder()
                .policyId(policyId)
                .resourceId(resourceId)
                .requiredRole(requiredRole)
                .abacAttributes(abacAttributes)
                .action(action)
                .active(true)
                .createdBy(adminDid)
                .createdAt(timestamp)
                .updatedAt(timestamp)
                .build();

        stub.putStringState(KEY_POLICY + policyId, GSON.toJson(policy));

        String event = String.format("{\"policyId\":\"%s\",\"resourceId\":\"%s\",\"createdBy\":\"%s\"}", policyId, resourceId, adminDid);
        stub.setEvent("PolicyCreated", event.getBytes());

        logger.info("Policy created: {} for resource: {}", policyId, resourceId);
        return policy;
    }

    // =========================================================================
    // evaluateAccess — EVALUATE (read-only, does NOT write to ledger)
    // Caller must then call logAccess as a SUBMIT to record the decision.
    // =========================================================================
    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public String evaluateAccess(
            final Context ctx,
            final String did,
            final String resourceId,
            final String action,
            final String contextAttributesJson,
            final String vcVerificationResult,
            final String timestamp) {

        ChaincodeStub stub = ctx.getStub();

        // Find policy for this resource + action
        AccessPolicy policy = findPolicyForResource(stub, resourceId, action);

        if (policy == null) {
            return buildDecision("DENIED", "NO_POLICY_FOUND", null, resourceId, did, action);
        }

        if (!policy.isActive()) {
            return buildDecision("DENIED", "POLICY_INACTIVE", policy.getPolicyId(), resourceId, did, action);
        }

        // ── RBAC Check: verify VC result ────────────────────────────────────
        // Exact validity check (never contains("VALID"): "INVALID" contains
        // "VALID" as a substring). Accepts the JSON form
        // {"result":"VALID","roles":"R1,R2"} and the legacy "VALID,R1,R2" form.
        // Role match is exact per-token (not substring).
        if (policy.getRequiredRole() != null && !policy.getRequiredRole().isBlank()) {
            if (!isVcResultValid(vcVerificationResult)) {
                return buildDecision("DENIED", "INSUFFICIENT_CLEARANCE", policy.getPolicyId(), resourceId, did, action);
            }
            if (!vcRolesContain(vcVerificationResult, policy.getRequiredRole())) {
                return buildDecision("DENIED", "ROLE_NOT_SATISFIED", policy.getPolicyId(), resourceId, did, action);
            }
        }

        // ── ABAC Check: verify context attributes match policy requirements ────
        if (policy.getAbacAttributes() != null && !policy.getAbacAttributes().isEmpty()) {
            Type mapType = new TypeToken<Map<String, String>>(){}.getType();
            Map<String, String> contextAttrs = contextAttributesJson != null
                    ? GSON.fromJson(contextAttributesJson, mapType)
                    : Map.of();

            for (Map.Entry<String, String> required : policy.getAbacAttributes().entrySet()) {
                String actual = contextAttrs.get(required.getKey());
                if (actual == null || !actual.equals(required.getValue())) {
                    return buildDecision("DENIED", "ABAC_ATTRIBUTE_MISMATCH:" + required.getKey(),
                            policy.getPolicyId(), resourceId, did, action);
                }
            }
        }

        // ── Check delegation ──────────────────────────────────────────────────
        // (delegation grants access if explicitly delegated even without role)
        // Delegation check is supplementary — role check still required for security.

        return buildDecision("GRANTED", "ALL_POLICIES_SATISFIED", policy.getPolicyId(), resourceId, did, action);
    }

    // =========================================================================
    // logAccess — SUBMIT (called after evaluateAccess to write immutable log)
    // =========================================================================
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public AccessLog logAccess(
            final Context ctx,
            final String did,
            final String resourceId,
            final String action,
            final String decision,
            final String reason,
            final String policyId,
            final String contextAttributesJson,
            final String nonce,
            final String timestamp) {

        ChaincodeStub stub = ctx.getStub();
        checkAndStoreNonce(stub, did, nonce);

        // Generate unique log ID from transaction ID
        String txId = stub.getTxId();
        String logId = txId != null ? txId : UUID.randomUUID().toString();

        AccessLog log = AccessLog.builder()
                .logId(logId)
                .did(did)
                .resourceId(resourceId)
                .action(action)
                .decision(decision)
                .reason(reason)
                .policyId(policyId)
                .timestamp(timestamp)
                .contextAttributes(contextAttributesJson)
                .build();

        stub.putStringState(KEY_ACCESS_LOG + logId, GSON.toJson(log));

        String eventName = "GRANTED".equals(decision) ? "AccessGranted" : "AccessDenied";
        String eventPayload = String.format(
                "{\"did\":\"%s\",\"resourceId\":\"%s\",\"decision\":\"%s\",\"txHash\":\"%s\",\"timestamp\":\"%s\"}",
                did, resourceId, decision, logId, timestamp);
        stub.setEvent(eventName, eventPayload.getBytes());

        logger.info("Access {} for DID: {} resource: {}", decision, did, resourceId);
        return log;
    }

    /**
     * Exact VC validity check. Accepts JSON {@code {"result":"VALID",...}} or the
     * legacy {@code "VALID"} / {@code "VALID,ROLE,..."} form. Rejects "INVALID".
     */
    static boolean isVcResultValid(String vcVerificationResult) {
        if (vcVerificationResult == null || vcVerificationResult.isBlank()) {
            return false;
        }
        String v = vcVerificationResult.trim();
        if (v.startsWith("{")) {
            try {
                Type mapType = new TypeToken<Map<String, String>>(){}.getType();
                Map<String, String> m = GSON.fromJson(v, mapType);
                return "VALID".equals(m != null ? m.get("result") : null);
            } catch (Exception e) {
                return false;
            }
        }
        return v.equals("VALID") || v.startsWith("VALID,");
    }

    /**
     * Exact per-token role match against JSON {@code "roles"} or the legacy
     * comma-separated suffix after {@code "VALID,"}.
     */
    static boolean vcRolesContain(String vcVerificationResult, String requiredRole) {
        if (vcVerificationResult == null || requiredRole == null) {
            return false;
        }
        String v = vcVerificationResult.trim();
        String rolesCsv = "";
        if (v.startsWith("{")) {
            try {
                Type mapType = new TypeToken<Map<String, String>>(){}.getType();
                Map<String, String> m = GSON.fromJson(v, mapType);
                rolesCsv = m != null && m.get("roles") != null ? m.get("roles") : "";
            } catch (Exception e) {
                return false;
            }
        } else if (v.startsWith("VALID,")) {
            rolesCsv = v.substring("VALID,".length());
        }
        for (String token : rolesCsv.split(",")) {
            if (requiredRole.equals(token.trim())) {
                return true;
            }
        }
        return false;
    }

    // =========================================================================
    // delegateAccess — SUBMIT
    // =========================================================================
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public String delegateAccess(
            final Context ctx,
            final String fromDid,
            final String toDid,
            final String resourceId,
            final String action,
            final String expiresAt,
            final String nonce,
            final String timestamp) {

        ChaincodeStub stub = ctx.getStub();
        checkAndStoreNonce(stub, fromDid, nonce);

        String delegateKey = KEY_DELEGATE + fromDid + ":" + toDid + ":" + resourceId;
        String record = String.format(
                "{\"fromDid\":\"%s\",\"toDid\":\"%s\",\"resourceId\":\"%s\",\"action\":\"%s\",\"expiresAt\":\"%s\",\"createdAt\":\"%s\",\"active\":true}",
                fromDid, toDid, resourceId, action, expiresAt, timestamp);

        stub.putStringState(delegateKey, record);

        String event = String.format("{\"fromDid\":\"%s\",\"toDid\":\"%s\",\"resourceId\":\"%s\"}", fromDid, toDid, resourceId);
        stub.setEvent("AccessDelegated", event.getBytes());

        logger.info("Access delegated from {} to {} for resource {}", fromDid, toDid, resourceId);
        return "{\"status\":\"DELEGATED\",\"from\":\"" + fromDid + "\",\"to\":\"" + toDid + "\"}";
    }

    // =========================================================================
    // revokeDelegate — SUBMIT
    // =========================================================================
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public String revokeDelegate(
            final Context ctx,
            final String fromDid,
            final String toDid,
            final String resourceId,
            final String nonce,
            final String timestamp) {

        ChaincodeStub stub = ctx.getStub();
        checkAndStoreNonce(stub, fromDid, nonce);

        String delegateKey = KEY_DELEGATE + fromDid + ":" + toDid + ":" + resourceId;
        String existing = stub.getStringState(delegateKey);
        if (existing == null || existing.isEmpty()) {
            throw new RuntimeException("Delegation not found");
        }

        stub.delState(delegateKey);

        String event = String.format("{\"fromDid\":\"%s\",\"toDid\":\"%s\",\"resourceId\":\"%s\"}", fromDid, toDid, resourceId);
        stub.setEvent("DelegationRevoked", event.getBytes());

        return "{\"status\":\"DELEGATION_REVOKED\"}";
    }

    // =========================================================================
    // createMultiSigRequest — SUBMIT
    // =========================================================================
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public MultiSigRequest createMultiSigRequest(
            final Context ctx,
            final String requestId,
            final String resourceId,
            final String requesterDid,
            final String requiredApproversJson,
            final String nonce,
            final String timestamp) {

        ChaincodeStub stub = ctx.getStub();
        checkAndStoreNonce(stub, requesterDid, nonce);

        String existing = stub.getStringState(KEY_MULTISIG + requestId);
        if (existing != null && !existing.isEmpty()) {
            throw new RuntimeException("MultiSig request already exists: " + requestId);
        }

        Type listType = new TypeToken<List<String>>(){}.getType();
        List<String> approvers = GSON.fromJson(requiredApproversJson, listType);

        MultiSigRequest request = MultiSigRequest.builder()
                .requestId(requestId)
                .resourceId(resourceId)
                .requesterDid(requesterDid)
                .requiredApprovers(approvers)
                .approvals(new ArrayList<>())
                .status("PENDING")
                .createdAt(timestamp)
                .updatedAt(timestamp)
                .build();

        stub.putStringState(KEY_MULTISIG + requestId, GSON.toJson(request));

        String event = String.format("{\"requestId\":\"%s\",\"resourceId\":\"%s\",\"requesterDid\":\"%s\"}", requestId, resourceId, requesterDid);
        stub.setEvent("MultiSigRequestCreated", event.getBytes());

        return request;
    }

    // =========================================================================
    // approveMultiSig — SUBMIT
    // =========================================================================
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public String approveMultiSig(
            final Context ctx,
            final String requestId,
            final String approverDid,
            final String signature,
            final String nonce,
            final String timestamp) {

        ChaincodeStub stub = ctx.getStub();
        checkAndStoreNonce(stub, approverDid, nonce);

        String json = stub.getStringState(KEY_MULTISIG + requestId);
        if (json == null || json.isEmpty()) {
            throw new RuntimeException("MultiSig request not found: " + requestId);
        }

        MultiSigRequest request = GSON.fromJson(json, MultiSigRequest.class);

        if (!"PENDING".equals(request.getStatus())) {
            throw new RuntimeException("Request is not in PENDING state: " + request.getStatus());
        }

        // Verify approver is in required approvers list
        if (!request.getRequiredApprovers().contains(approverDid)) {
            throw new RuntimeException("Approver not in required approvers list: " + approverDid);
        }

        // Add approval
        List<MultiSigRequest.ApprovalRecord> approvals = new ArrayList<>(request.getApprovals());
        approvals.add(new MultiSigRequest.ApprovalRecord(approverDid, signature, timestamp));
        request.setUpdatedAt(timestamp);

        // Check if threshold met
        if (approvals.size() >= request.getRequiredThreshold()) {
            request.setStatus("APPROVED");
            stub.setEvent("MultiSigApproved", ("{\"requestId\":\"" + requestId + "\",\"approvals\":" + approvals.size() + "}").getBytes());
        }

        // Rebuild request with new approvals (GSON serialization)
        MultiSigRequest updated = MultiSigRequest.builder()
                .requestId(request.getRequestId())
                .resourceId(request.getResourceId())
                .requesterDid(request.getRequesterDid())
                .requiredApprovers(request.getRequiredApprovers())
                .approvals(approvals)
                .status(request.getStatus())
                .createdAt(request.getCreatedAt())
                .updatedAt(timestamp)
                .build();

        stub.putStringState(KEY_MULTISIG + requestId, GSON.toJson(updated));

        return String.format("{\"requestId\":\"%s\",\"status\":\"%s\",\"approvalCount\":%d}",
                requestId, updated.getStatus(), approvals.size());
    }

    // =========================================================================
    // getPolicy — EVALUATE
    // =========================================================================
    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public AccessPolicy getPolicy(final Context ctx, final String policyId) {
        ChaincodeStub stub = ctx.getStub();
        String json = stub.getStringState(KEY_POLICY + policyId);
        if (json == null || json.isEmpty()) {
            throw new RuntimeException("Policy not found: " + policyId);
        }
        return GSON.fromJson(json, AccessPolicy.class);
    }

    // =========================================================================
    // getAccessLog — EVALUATE
    // =========================================================================
    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public AccessLog getAccessLog(final Context ctx, final String logId) {
        ChaincodeStub stub = ctx.getStub();
        String json = stub.getStringState(KEY_ACCESS_LOG + logId);
        if (json == null || json.isEmpty()) {
            throw new RuntimeException("Access log not found: " + logId);
        }
        return GSON.fromJson(json, AccessLog.class);
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    private AccessPolicy findPolicyForResource(ChaincodeStub stub, String resourceId, String action) {
        try (QueryResultsIterator<KeyValue> iterator = stub.getStateByRange(KEY_POLICY, KEY_POLICY + "\uFFFF")) {
            for (KeyValue kv : iterator) {
                AccessPolicy policy = GSON.fromJson(kv.getStringValue(), AccessPolicy.class);
                if (resourceId.equals(policy.getResourceId())
                        && (action == null || action.equals(policy.getAction()))
                        && policy.isActive()) {
                    return policy;
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Policy lookup failed: " + e.getMessage(), e);
        }
        return null;
    }

    private String buildDecision(String decision, String reason, String policyId, String resourceId, String did, String action) {
        return String.format(
                "{\"decision\":\"%s\",\"reason\":\"%s\",\"policyId\":\"%s\",\"resourceId\":\"%s\",\"did\":\"%s\",\"action\":\"%s\"}",
                decision, reason,
                policyId != null ? policyId : "",
                resourceId, did, action);
    }

    private void requireAdmin(String adminDid) {
        if (adminDid == null || !adminDid.startsWith(ADMIN_DID_PREFIX)) {
            throw new RuntimeException("Caller is not authorized admin: " + adminDid);
        }
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
