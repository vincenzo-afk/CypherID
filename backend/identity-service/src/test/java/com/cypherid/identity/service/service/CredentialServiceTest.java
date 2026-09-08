package com.cypherid.identity.service.service;

import com.cypherid.identity.service.dto.*;
import com.cypherid.identity.service.fabric.FabricGatewayClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * CredentialServiceTest — unit tests for VC issuance, listing, revocation,
 * and verification (backend/identity-service/.../service/CredentialService.java).
 */
@ExtendWith(MockitoExtension.class)
class CredentialServiceTest {

    @Mock
    private FabricGatewayClient fabricClient;

    private CredentialService service;

    @BeforeEach
    void setUp() {
        service = new CredentialService(fabricClient);
    }

    @Test
    void issueCredential_success_returnsVcIdAndTxHash() throws Exception {
        when(fabricClient.issueVC(eq("did:cypherid:subject"), anyString(), anyString(),
                eq("did:cypherid:admin:root"), anyString(), anyString(), anyString()))
                .thenReturn(new FabricGatewayClient.TxOutcome("{}".getBytes(), "tx-vc-1"));

        IssueCredentialResponse response = service.issueCredential("did:cypherid:admin:root",
                new IssueCredentialRequest("did:cypherid:subject", "EmployeeCredential",
                        Map.of("role", "Engineer"), null));

        assertNotNull(response.vcId());
        assertTrue(response.vcId().startsWith("vc:cypherid:"));
        assertEquals("tx-vc-1", response.txHash());
    }

    @Test
    void issueCredential_thenListCredentials_returnsIssuedVc() throws Exception {
        when(fabricClient.issueVC(eq("did:cypherid:subject"), anyString(), anyString(),
                anyString(), anyString(), anyString(), anyString()))
                .thenReturn(new FabricGatewayClient.TxOutcome("{}".getBytes(), "tx-vc-2"));

        IssueCredentialResponse issued = service.issueCredential("did:cypherid:admin:root",
                new IssueCredentialRequest("did:cypherid:subject", "EmployeeCredential", Map.of(), null));

        CredentialListResponse list = service.listCredentials("did:cypherid:subject");

        assertEquals(1, list.credentials().size());
        assertEquals(issued.vcId(), list.credentials().get(0).get("vcId"));
    }

    @Test
    void listCredentials_noVcsForDid_returnsEmptyList() {
        CredentialListResponse list = service.listCredentials("did:cypherid:nobody");
        assertTrue(list.credentials().isEmpty());
    }

    @Test
    void revokeCredential_success_marksRevoked() throws Exception {
        when(fabricClient.issueVC(anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString()))
                .thenReturn(new FabricGatewayClient.TxOutcome("{}".getBytes(), "tx-issue"));
        IssueCredentialResponse issued = service.issueCredential("did:cypherid:admin:root",
                new IssueCredentialRequest("did:cypherid:subject", "EmployeeCredential", Map.of(), null));

        when(fabricClient.revokeVC(eq("did:cypherid:subject"), eq(issued.vcId()), eq("did:cypherid:admin:root"), anyString(), anyString()))
                .thenReturn(new FabricGatewayClient.TxOutcome("{}".getBytes(), "tx-revoke"));

        TxHashResponse response = service.revokeCredential(issued.vcId(), "did:cypherid:admin:root");

        assertEquals("REVOKED", response.status());
        assertEquals("tx-revoke", response.txHash());
    }

    @Test
    void revokeCredential_unknownVc_throws() {
        assertThrows(RuntimeException.class,
                () -> service.revokeCredential("vc:cypherid:unknown", "did:cypherid:admin:root"));
        verifyNoInteractions(fabricClient);
    }

    @Test
    void verifyCredential_malformedVc_returnsInvalid() {
        VerifyCredentialResponse response = service.verifyCredential(
                new VerifyCredentialRequest(Map.of("foo", "bar")));

        assertFalse(response.valid());
        assertEquals("VC_MALFORMED", response.reason());
    }

    @Test
    void verifyCredential_expired_returnsInvalidWithoutFabricCall() throws Exception {
        Map<String, Object> vc = Map.of(
                "id", "vc:cypherid:expired1",
                "credentialSubject", Map.of("id", "did:cypherid:subject"),
                "expirationDate", Instant.now().minusSeconds(3600).toString());

        VerifyCredentialResponse response = service.verifyCredential(new VerifyCredentialRequest(vc));

        assertFalse(response.valid());
        assertEquals("VC_EXPIRED", response.reason());
        verifyNoInteractions(fabricClient);
    }

    @Test
    void verifyCredential_validOnChain_returnsValid() throws Exception {
        Map<String, Object> vc = Map.of(
                "id", "vc:cypherid:valid1",
                "credentialSubject", Map.of("id", "did:cypherid:subject"));
        when(fabricClient.verifyVC("did:cypherid:subject", "vc:cypherid:valid1"))
                .thenReturn("{\"valid\":true}");

        VerifyCredentialResponse response = service.verifyCredential(new VerifyCredentialRequest(vc));

        assertTrue(response.valid());
        assertNull(response.reason());
    }

    @Test
    void verifyCredential_fabricUnavailable_fallsBackToNotFound() throws Exception {
        Map<String, Object> vc = Map.of(
                "id", "vc:cypherid:unknown-chain",
                "credentialSubject", Map.of("id", "did:cypherid:subject"));
        when(fabricClient.verifyVC(anyString(), anyString())).thenThrow(new RuntimeException("gateway down"));

        VerifyCredentialResponse response = service.verifyCredential(new VerifyCredentialRequest(vc));

        assertFalse(response.valid());
        assertEquals("VC_NOT_FOUND", response.reason());
    }

    @Test
    void verifyCredential_locallyRevoked_returnsRevokedWithoutFabricCall() throws Exception {
        when(fabricClient.issueVC(anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString()))
                .thenReturn(new FabricGatewayClient.TxOutcome("{}".getBytes(), "tx-issue"));
        IssueCredentialResponse issued = service.issueCredential("did:cypherid:admin:root",
                new IssueCredentialRequest("did:cypherid:subject", "EmployeeCredential", Map.of(), null));
        when(fabricClient.revokeVC(anyString(), anyString(), anyString(), anyString(), anyString()))
                .thenReturn(new FabricGatewayClient.TxOutcome("{}".getBytes(), "tx-revoke"));
        service.revokeCredential(issued.vcId(), "did:cypherid:admin:root");

        Map<String, Object> vc = Map.of(
                "id", issued.vcId(),
                "credentialSubject", Map.of("id", "did:cypherid:subject"));
        VerifyCredentialResponse response = service.verifyCredential(new VerifyCredentialRequest(vc));

        assertFalse(response.valid());
        assertEquals("VC_REVOKED", response.reason());
        verify(fabricClient, never()).verifyVC(anyString(), anyString());
    }
}
