package com.cypherid.access.service.service;

import com.cypherid.access.service.dto.AccessDecisionResponse;
import com.cypherid.access.service.dto.AccessRequest;
import com.cypherid.access.service.dto.CreatePolicyRequest;
import com.cypherid.access.service.dto.CreatePolicyResponse;
import com.cypherid.access.service.exception.AccessDeniedException;
import com.cypherid.access.service.exception.ConflictException;
import com.cypherid.access.service.fabric.FabricAccessClient;
import com.cypherid.access.service.kafka.AccessLogProducer;
import com.cypherid.access.service.repository.AccessPolicyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * PolicyEngineServiceTest — unit tests for the access evaluation
 * and policy creation flows, with the Fabric client mocked.
 */
@ExtendWith(MockitoExtension.class)
class PolicyEngineServiceTest {

    @Mock
    private FabricAccessClient fabricClient;

    @Mock
    private AccessPolicyRepository policyRepository;

    @Mock
    private AccessLogProducer accessLogProducer;

    private PolicyEngineService service;

    @BeforeEach
    void setUp() {
        service = new PolicyEngineService(fabricClient, policyRepository, accessLogProducer);
    }

    // ─── Access request evaluation ────────────────────────────────────────────

    @Test
    void requestAccess_granted_returnsDecisionAndTxHash() throws Exception {
        when(fabricClient.evaluateAccess(anyString(), eq("DRDO-DOC-007"), eq("READ"), anyString(), anyString(), anyString()))
                .thenReturn("{\"decision\":\"GRANTED\",\"reason\":\"ALL_POLICIES_SATISFIED\",\"policyId\":\"POLICY-1\",\"resourceId\":\"DRDO-DOC-007\",\"did\":\"did:cypherid:user1\",\"action\":\"READ\"}");
        when(fabricClient.logAccess(anyString(), eq("DRDO-DOC-007"), eq("READ"), eq("GRANTED"), anyString(), anyString(), anyString(), anyString(), anyString()))
                .thenReturn(new FabricAccessClient.TxOutcome(
                        "{\"logId\":\"tx-abc\"}".getBytes(), "tx-abc"));

        AccessDecisionResponse response = service.requestAccess("did:cypherid:user1", "CLEARANCE_LEVEL_3,ADMIN",
                new AccessRequest("DRDO-DOC-007", "READ", Map.of("dept", "DRDO")));

        assertEquals("GRANTED", response.decision());
        assertEquals("tx-abc", response.txHash());
        verify(fabricClient).evaluateAccess(anyString(), eq("DRDO-DOC-007"), eq("READ"), anyString(), anyString(), anyString());
        verify(fabricClient).logAccess(anyString(), eq("DRDO-DOC-007"), eq("READ"), eq("GRANTED"), anyString(), anyString(), anyString(), anyString(), anyString());
        verify(accessLogProducer).publishAccessLog(eq("did:cypherid:user1"), eq("DRDO-DOC-007"), eq("READ"), eq("GRANTED"), anyString(), anyString());
    }

    @Test
    void requestAccess_denied_throwsAccessDeniedWithReason() throws Exception {
        when(fabricClient.evaluateAccess(anyString(), eq("DRDO-DOC-007"), eq("READ"), anyString(), anyString(), anyString()))
                .thenReturn("{\"decision\":\"DENIED\",\"reason\":\"INSUFFICIENT_CLEARANCE\",\"policyId\":\"POLICY-1\",\"resourceId\":\"DRDO-DOC-007\",\"did\":\"did:cypherid:user1\",\"action\":\"READ\"}");
        when(fabricClient.logAccess(anyString(), eq("DRDO-DOC-007"), eq("READ"), eq("DENIED"), eq("INSUFFICIENT_CLEARANCE"), anyString(), anyString(), anyString(), anyString()))
                .thenReturn(new FabricAccessClient.TxOutcome(
                        "{\"logId\":\"tx-def\"}".getBytes(), "tx-def"));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.requestAccess("did:cypherid:user1", "CLEARANCE_LEVEL_1",
                        new AccessRequest("DRDO-DOC-007", "READ", Map.of())));

        assertEquals("INSUFFICIENT_CLEARANCE", ex.getReason());
        assertEquals("DENIED", ex.getDecision());
        assertEquals("tx-def", ex.getTxHash());
    }

    @Test
    void requestAccess_noPolicy_deniedWithNoPolicyFound() throws Exception {
        when(fabricClient.evaluateAccess(anyString(), eq("UNKNOWN-DOC"), eq("READ"), anyString(), anyString(), anyString()))
                .thenReturn("{\"decision\":\"DENIED\",\"reason\":\"NO_POLICY_FOUND\",\"policyId\":\"\",\"resourceId\":\"UNKNOWN-DOC\",\"did\":\"did:cypherid:user1\",\"action\":\"READ\"}");
        when(fabricClient.logAccess(anyString(), eq("UNKNOWN-DOC"), eq("READ"), eq("DENIED"), eq("NO_POLICY_FOUND"), anyString(), anyString(), anyString(), anyString()))
                .thenReturn(new FabricAccessClient.TxOutcome("{\"logId\":\"tx-ghi\"}".getBytes(), "tx-ghi"));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.requestAccess("did:cypherid:user1", "CLEARANCE_LEVEL_3",
                        new AccessRequest("UNKNOWN-DOC", "READ", Map.of())));

        assertEquals("NO_POLICY_FOUND", ex.getReason());
    }

    // ─── Policy creation ──────────────────────────────────────────────────────

    @Test
    void createPolicy_asAdmin_createsPolicyAndMirror() throws Exception {
        when(policyRepository.existsByResourceIdAndActiveTrue("DRDO-DOC-007")).thenReturn(false);
        when(fabricClient.createPolicy(anyString(), eq("DRDO-DOC-007"), eq("CLEARANCE_LEVEL_3"), anyString(), eq("READ"), eq("did:cypherid:admin:root"), anyString(), anyString()))
                .thenReturn(new FabricAccessClient.TxOutcome(
                        "{\"policyId\":\"POLICY-x\"}".getBytes(), "tx-policy"));

        CreatePolicyResponse response = service.createPolicy("did:cypherid:admin:root", "ADMIN",
                new CreatePolicyRequest("DRDO-DOC-007", "CLEARANCE_LEVEL_3", Map.of("dept", "DRDO"), "READ"));

        assertNotNull(response.policyId());
        assertTrue(response.policyId().startsWith("POLICY-"));
        assertNotNull(response.txHash());
        verify(policyRepository).save(any());
    }

    @Test
    void createPolicy_nonAdmin_throwsAccessDenied() {
        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.createPolicy("did:cypherid:user1", "CLEARANCE_LEVEL_1",
                        new CreatePolicyRequest("DRDO-DOC-007", "CLEARANCE_LEVEL_3", Map.of(), "READ")));

        assertEquals("ADMIN_ROLE_REQUIRED", ex.getReason());
        verifyNoInteractions(fabricClient);
    }

    @Test
    void createPolicy_duplicateResource_throwsConflict() {
        when(policyRepository.existsByResourceIdAndActiveTrue("DRDO-DOC-007")).thenReturn(true);

        assertThrows(ConflictException.class,
                () -> service.createPolicy("did:cypherid:admin:root", "ADMIN",
                        new CreatePolicyRequest("DRDO-DOC-007", "CLEARANCE_LEVEL_3", Map.of(), "READ")));

        verifyNoInteractions(fabricClient);
    }

    // ─── VC verification string ───────────────────────────────────────────────

    @Test
    void requestAccess_passesRolesInVerificationString() throws Exception {
        when(fabricClient.evaluateAccess(anyString(), anyString(), anyString(), anyString(), anyString(), anyString()))
                .thenReturn("{\"decision\":\"GRANTED\",\"reason\":\"ALL_POLICIES_SATISFIED\",\"policyId\":\"POLICY-1\",\"resourceId\":\"DRDO-DOC-007\",\"did\":\"did:cypherid:user1\",\"action\":\"READ\"}");
        when(fabricClient.logAccess(anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString()))
                .thenReturn(new FabricAccessClient.TxOutcome("{\"logId\":\"tx-1\"}".getBytes(), "tx-1"));

        service.requestAccess("did:cypherid:user1", "CLEARANCE_LEVEL_3,DRDO",
                new AccessRequest("DRDO-DOC-007", "READ", Map.of()));

        // The chaincode requires exact "result":"VALID" + the role as an exact token
        verify(fabricClient).evaluateAccess(eq("did:cypherid:user1"), eq("DRDO-DOC-007"), eq("READ"),
                anyString(), contains("\"result\":\"VALID\""), anyString());
    }
}