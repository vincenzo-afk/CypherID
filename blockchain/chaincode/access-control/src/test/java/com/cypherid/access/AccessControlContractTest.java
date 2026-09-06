package com.cypherid.access;

import java.time.Instant;
import org.hyperledger.fabric.contract.Context;
import org.hyperledger.fabric.shim.ChaincodeStub;
import org.hyperledger.fabric.shim.ledger.KeyValue;
import org.hyperledger.fabric.shim.ledger.QueryResultsIterator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for AccessControlContract using Mockito to mock ChaincodeStub.
 * No real Fabric network required.
 */
@ExtendWith(MockitoExtension.class)
class AccessControlContractTest {

    @Mock private Context ctx;
    @Mock private ChaincodeStub stub;

    private AccessControlContract contract;

    private static final String ADMIN_DID    = "did:cypherid:admin:root";
    private static final String USER_DID     = "did:cypherid:0xUSER1234567890";
    private static final String OTHER_DID    = "did:cypherid:0xOTHER123456789";
    private static final String RESOURCE_ID  = "ASSET-001";
    private static final String POLICY_ID    = "POLICY-001";
    private static final String TIMESTAMP    = Instant.now().toString();

    @BeforeEach
    void setUp() {
        contract = new AccessControlContract();
        when(ctx.getStub()).thenReturn(stub);
    }

    // ─── createPolicy ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("createPolicy: should create policy when called by admin")
    void createPolicy_success() {
        String nonce = "nonce-" + System.nanoTime();
        when(stub.getStringState("NONCE:" + ADMIN_DID + ":" + nonce)).thenReturn(null);
        when(stub.getStringState("POLICY:" + POLICY_ID)).thenReturn(null);

        AccessPolicy result = contract.createPolicy(ctx, POLICY_ID, RESOURCE_ID,
                "CLEARANCE_LEVEL_3", "{\"department\":\"DRDO\"}", "READ", ADMIN_DID, nonce, TIMESTAMP);

        assertThat(result).isNotNull();
        assertThat(result.getPolicyId()).isEqualTo(POLICY_ID);
        assertThat(result.getResourceId()).isEqualTo(RESOURCE_ID);
        assertThat(result.isActive()).isTrue();

        verify(stub).putStringState(eq("POLICY:" + POLICY_ID), anyString());
        verify(stub).setEvent(eq("PolicyCreated"), any(byte[].class));
    }

    @Test
    @DisplayName("createPolicy: should reject non-admin caller")
    void createPolicy_nonAdmin() {
        String nonce = "nonce-" + System.nanoTime();

        assertThatThrownBy(() -> contract.createPolicy(ctx, POLICY_ID, RESOURCE_ID,
                "CLEARANCE_LEVEL_3", "{}", "READ", USER_DID, nonce, TIMESTAMP))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("not authorized admin");
    }

    @Test
    @DisplayName("createPolicy: should reject duplicate policy")
    void createPolicy_duplicate() {
        String nonce = "nonce-" + System.nanoTime();
        when(stub.getStringState("NONCE:" + ADMIN_DID + ":" + nonce)).thenReturn(null);
        when(stub.getStringState("POLICY:" + POLICY_ID)).thenReturn("{\"policyId\":\"" + POLICY_ID + "\"}");

        assertThatThrownBy(() -> contract.createPolicy(ctx, POLICY_ID, RESOURCE_ID,
                "CLEARANCE_LEVEL_3", "{}", "READ", ADMIN_DID, nonce, TIMESTAMP))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Policy already exists");
    }

    @Test
    @DisplayName("createPolicy: should reject replayed nonce")
    void createPolicy_replayedNonce() {
        String nonce = "nonce-" + System.nanoTime();
        when(stub.getStringState("NONCE:" + ADMIN_DID + ":" + nonce)).thenReturn("used");

        assertThatThrownBy(() -> contract.createPolicy(ctx, POLICY_ID, RESOURCE_ID,
                "CLEARANCE_LEVEL_3", "{}", "READ", ADMIN_DID, nonce, TIMESTAMP))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Nonce already used");
    }

    // ─── evaluateAccess ───────────────────────────────────────────────────────

    @Test
    @DisplayName("evaluateAccess: should DENY when no policy exists")
    @SuppressWarnings("unchecked")
    void evaluateAccess_noPolicy() {
        QueryResultsIterator<KeyValue> iterator = mock(QueryResultsIterator.class);
        when(stub.getStateByRange(anyString(), anyString())).thenReturn(iterator);
        when(iterator.hasNext()).thenReturn(false);

        String decision = contract.evaluateAccess(ctx, USER_DID, RESOURCE_ID, "READ",
                "{\"department\":\"DRDO\"}", "VALID,CLEARANCE_LEVEL_3", TIMESTAMP);

        assertThat(decision).contains("DENIED");
        assertThat(decision).contains("NO_POLICY_FOUND");
    }

    @Test
    @DisplayName("evaluateAccess: should GRANT when RBAC + ABAC satisfied")
    @SuppressWarnings("unchecked")
    void evaluateAccess_granted() {
        QueryResultsIterator<KeyValue> iterator = mock(QueryResultsIterator.class);
        KeyValue kv = mock(KeyValue.class);
        when(stub.getStateByRange(anyString(), anyString())).thenReturn(iterator);
        when(iterator.hasNext()).thenReturn(true, false);
        when(iterator.next()).thenReturn(kv);
        when(kv.getStringValue()).thenReturn(policyJson("CLEARANCE_LEVEL_3", "{\"department\":\"DRDO\"}"));

        String decision = contract.evaluateAccess(ctx, USER_DID, RESOURCE_ID, "READ",
                "{\"department\":\"DRDO\"}", "VALID,CLEARANCE_LEVEL_3", TIMESTAMP);

        assertThat(decision).contains("GRANTED");
        assertThat(decision).contains("ALL_POLICIES_SATISFIED");
    }

    @Test
    @DisplayName("evaluateAccess: should DENY when clearance invalid")
    @SuppressWarnings("unchecked")
    void evaluateAccess_badClearance() {
        QueryResultsIterator<KeyValue> iterator = mock(QueryResultsIterator.class);
        KeyValue kv = mock(KeyValue.class);
        when(stub.getStateByRange(anyString(), anyString())).thenReturn(iterator);
        when(iterator.hasNext()).thenReturn(true, false);
        when(iterator.next()).thenReturn(kv);
        when(kv.getStringValue()).thenReturn(policyJson("CLEARANCE_LEVEL_3", "{}"));

        String decision = contract.evaluateAccess(ctx, USER_DID, RESOURCE_ID, "READ",
                "{\"department\":\"DRDO\"}", "INVALID", TIMESTAMP);

        assertThat(decision).contains("DENIED");
        assertThat(decision).contains("INSUFFICIENT_CLEARANCE");
    }

    @Test
    @DisplayName("evaluateAccess: should DENY on ABAC attribute mismatch")
    @SuppressWarnings("unchecked")
    void evaluateAccess_abacMismatch() {
        QueryResultsIterator<KeyValue> iterator = mock(QueryResultsIterator.class);
        KeyValue kv = mock(KeyValue.class);
        when(stub.getStateByRange(anyString(), anyString())).thenReturn(iterator);
        when(iterator.hasNext()).thenReturn(true, false);
        when(iterator.next()).thenReturn(kv);
        when(kv.getStringValue()).thenReturn(policyJson("CLEARANCE_LEVEL_3", "{\"department\":\"DRDO\"}"));

        String decision = contract.evaluateAccess(ctx, USER_DID, RESOURCE_ID, "READ",
                "{\"department\":\"OTHER\"}", "VALID,CLEARANCE_LEVEL_3", TIMESTAMP);

        assertThat(decision).contains("DENIED");
        assertThat(decision).contains("ABAC_ATTRIBUTE_MISMATCH");
    }

    // ─── logAccess ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("logAccess: should write immutable log entry")
    void logAccess_success() {
        String nonce = "nonce-" + System.nanoTime();
        when(stub.getStringState("NONCE:" + USER_DID + ":" + nonce)).thenReturn(null);
        when(stub.getTxId()).thenReturn("tx-abc-123");

        AccessLog result = contract.logAccess(ctx, USER_DID, RESOURCE_ID, "READ",
                "GRANTED", "ALL_POLICIES_SATISFIED", POLICY_ID, "{}", nonce, TIMESTAMP);

        assertThat(result).isNotNull();
        assertThat(result.getLogId()).isEqualTo("tx-abc-123");
        assertThat(result.getDecision()).isEqualTo("GRANTED");
        verify(stub).putStringState(eq("ACCESS_LOG:tx-abc-123"), anyString());
        verify(stub).setEvent(eq("AccessGranted"), any(byte[].class));
    }

    // ─── delegation ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("delegateAccess: should record delegation")
    void delegateAccess_success() {
        String nonce = "nonce-" + System.nanoTime();
        when(stub.getStringState("NONCE:" + USER_DID + ":" + nonce)).thenReturn(null);

        String result = contract.delegateAccess(ctx, USER_DID, OTHER_DID, RESOURCE_ID,
                "READ", Instant.now().plusSeconds(3600).toString(), nonce, TIMESTAMP);

        assertThat(result).contains("DELEGATED");
        verify(stub).putStringState(
                eq("DELEGATE:" + USER_DID + ":" + OTHER_DID + ":" + RESOURCE_ID), anyString());
        verify(stub).setEvent(eq("AccessDelegated"), any(byte[].class));
    }

    @Test
    @DisplayName("revokeDelegate: should delete existing delegation")
    void revokeDelegate_success() {
        String nonce = "nonce-" + System.nanoTime();
        when(stub.getStringState("NONCE:" + USER_DID + ":" + nonce)).thenReturn(null);
        when(stub.getStringState("DELEGATE:" + USER_DID + ":" + OTHER_DID + ":" + RESOURCE_ID))
                .thenReturn("{\"active\":true}");

        String result = contract.revokeDelegate(ctx, USER_DID, OTHER_DID, RESOURCE_ID, nonce, TIMESTAMP);

        assertThat(result).contains("DELEGATION_REVOKED");
        verify(stub).delState("DELEGATE:" + USER_DID + ":" + OTHER_DID + ":" + RESOURCE_ID);
    }

    @Test
    @DisplayName("revokeDelegate: should throw when delegation not found")
    void revokeDelegate_notFound() {
        String nonce = "nonce-" + System.nanoTime();
        when(stub.getStringState("NONCE:" + USER_DID + ":" + nonce)).thenReturn(null);
        when(stub.getStringState("DELEGATE:" + USER_DID + ":" + OTHER_DID + ":" + RESOURCE_ID))
                .thenReturn(null);

        assertThatThrownBy(() -> contract.revokeDelegate(ctx, USER_DID, OTHER_DID, RESOURCE_ID, nonce, TIMESTAMP))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Delegation not found");
    }

    // ─── multi-sig ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("createMultiSigRequest: should create PENDING request")
    void createMultiSig_success() {
        String nonce = "nonce-" + System.nanoTime();
        when(stub.getStringState("NONCE:" + USER_DID + ":" + nonce)).thenReturn(null);
        when(stub.getStringState("MULTISIG:REQ-1")).thenReturn(null);

        MultiSigRequest result = contract.createMultiSigRequest(ctx, "REQ-1", RESOURCE_ID,
                USER_DID, "[\"" + ADMIN_DID + "\"]", nonce, TIMESTAMP);

        assertThat(result.getStatus()).isEqualTo("PENDING");
        assertThat(result.getRequiredApprovers()).containsExactly(ADMIN_DID);
        verify(stub).setEvent(eq("MultiSigRequestCreated"), any(byte[].class));
    }

    @Test
    @DisplayName("approveMultiSig: should APPROVE when threshold met")
    void approveMultiSig_approved() {
        String nonce = "nonce-" + System.nanoTime();
        when(stub.getStringState("NONCE:" + ADMIN_DID + ":" + nonce)).thenReturn(null);
        when(stub.getStringState("MULTISIG:REQ-1")).thenReturn(multisigJson());

        String result = contract.approveMultiSig(ctx, "REQ-1", ADMIN_DID, "SIG_ADMIN", nonce, TIMESTAMP);

        assertThat(result).contains("APPROVED");
        assertThat(result).contains("\"approvalCount\":1");
    }

    @Test
    @DisplayName("approveMultiSig: should reject unknown approver")
    void approveMultiSig_unknownApprover() {
        String nonce = "nonce-" + System.nanoTime();
        when(stub.getStringState("NONCE:" + OTHER_DID + ":" + nonce)).thenReturn(null);
        when(stub.getStringState("MULTISIG:REQ-1")).thenReturn(multisigJson());

        assertThatThrownBy(() -> contract.approveMultiSig(ctx, "REQ-1", OTHER_DID, "SIG", nonce, TIMESTAMP))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("not in required approvers");
    }

    // ─── getPolicy / getAccessLog ─────────────────────────────────────────────

    @Test
    @DisplayName("getPolicy: should throw when policy not found")
    void getPolicy_notFound() {
        when(stub.getStringState("POLICY:MISSING")).thenReturn(null);

        assertThatThrownBy(() -> contract.getPolicy(ctx, "MISSING"))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Policy not found");
    }

    @Test
    @DisplayName("getAccessLog: should throw when log not found")
    void getAccessLog_notFound() {
        when(stub.getStringState("ACCESS_LOG:MISSING")).thenReturn(null);

        assertThatThrownBy(() -> contract.getAccessLog(ctx, "MISSING"))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Access log not found");
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private String policyJson(String requiredRole, String abacJson) {
        return String.format(
            "{\"policyId\":\"%s\",\"resourceId\":\"%s\",\"requiredRole\":\"%s\",\"abacAttributes\":%s,"
            + "\"action\":\"READ\",\"active\":true,\"createdBy\":\"%s\",\"createdAt\":\"%s\",\"updatedAt\":\"%s\"}",
            POLICY_ID, RESOURCE_ID, requiredRole, abacJson, ADMIN_DID, TIMESTAMP, TIMESTAMP);
    }

    private String multisigJson() {
        return String.format(
            "{\"requestId\":\"REQ-1\",\"resourceId\":\"%s\",\"requesterDid\":\"%s\","
            + "\"requiredApprovers\":[\"%s\"],\"approvals\":[],\"requiredThreshold\":1,"
            + "\"status\":\"PENDING\",\"createdAt\":\"%s\",\"updatedAt\":\"%s\"}",
            RESOURCE_ID, USER_DID, ADMIN_DID, TIMESTAMP, TIMESTAMP);
    }
}
