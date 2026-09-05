package com.cypherid.identity;

import org.hyperledger.fabric.contract.Context;
import org.hyperledger.fabric.shim.ChaincodeStub;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for IdentityContract using Mockito to mock ChaincodeStub.
 * No real Fabric network required.
 */
@ExtendWith(MockitoExtension.class)
class IdentityContractTest {

    @Mock private Context ctx;
    @Mock private ChaincodeStub stub;

    private IdentityContract contract;

    private static final String VALID_DID     = "did:cypherid:0xABCDEF1234567890";
    private static final String ADMIN_DID     = "did:cypherid:admin:root";
    private static final String PUBLIC_KEY    = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEtestpublickeybase64encoded==";
    private static final String METADATA      = "{\"org\":\"DRDO\",\"dept\":\"R&D\"}";
    private static final String NONCE         = "nonce-" + System.nanoTime();
    private static final String TIMESTAMP     = Instant.now().toString();

    @BeforeEach
    void setUp() {
        contract = new IdentityContract();
        when(ctx.getStub()).thenReturn(stub);
    }

    // ─── createDID ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("createDID: should create DID document when DID does not exist")
    void createDID_success() {
        // Stub: DID does not exist yet
        when(stub.getStringState("DID:" + VALID_DID)).thenReturn(null);
        // Stub: nonce has not been used
        when(stub.getStringState("NONCE:" + VALID_DID + ":" + NONCE)).thenReturn(null);

        DIDDocument result = contract.createDID(ctx, VALID_DID, PUBLIC_KEY, METADATA, NONCE, TIMESTAMP);

        assertThat(result).isNotNull();
        assertThat(result.getDid()).isEqualTo(VALID_DID);
        assertThat(result.getPublicKey()).isEqualTo(PUBLIC_KEY);
        assertThat(result.getStatus()).isEqualTo("ACTIVE");
        assertThat(result.getVersion()).isEqualTo(1);

        verify(stub).putStringState(eq("DID:" + VALID_DID), anyString());
        verify(stub).setEvent(eq("DIDCreated"), any(byte[].class));
    }

    @Test
    @DisplayName("createDID: should reject invalid DID format")
    void createDID_invalidFormat() {
        assertThatThrownBy(() ->
            contract.createDID(ctx, "invalid-did", PUBLIC_KEY, METADATA, NONCE, TIMESTAMP)
        ).isInstanceOf(RuntimeException.class)
         .hasMessageContaining("Invalid DID format");
    }

    @Test
    @DisplayName("createDID: should reject duplicate DID")
    void createDID_duplicate() {
        when(stub.getStringState("DID:" + VALID_DID)).thenReturn("{\"did\":\"" + VALID_DID + "\"}");

        assertThatThrownBy(() ->
            contract.createDID(ctx, VALID_DID, PUBLIC_KEY, METADATA, NONCE, TIMESTAMP)
        ).isInstanceOf(RuntimeException.class)
         .hasMessageContaining("DID already exists");
    }

    @Test
    @DisplayName("createDID: should reject replayed nonce")
    void createDID_replayedNonce() {
        when(stub.getStringState("DID:" + VALID_DID)).thenReturn(null);
        when(stub.getStringState("NONCE:" + VALID_DID + ":" + NONCE)).thenReturn("used");

        assertThatThrownBy(() ->
            contract.createDID(ctx, VALID_DID, PUBLIC_KEY, METADATA, NONCE, TIMESTAMP)
        ).isInstanceOf(RuntimeException.class)
         .hasMessageContaining("Nonce already used");
    }

    // ─── resolveDID ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("resolveDID: should return DID document when it exists")
    void resolveDID_success() {
        String docJson = "{\"did\":\"" + VALID_DID + "\",\"publicKey\":\"" + PUBLIC_KEY + "\",\"status\":\"ACTIVE\",\"version\":1}";
        when(stub.getStringState("DID:" + VALID_DID)).thenReturn(docJson);

        DIDDocument result = contract.resolveDID(ctx, VALID_DID);

        assertThat(result).isNotNull();
        assertThat(result.getDid()).isEqualTo(VALID_DID);
    }

    @Test
    @DisplayName("resolveDID: should throw when DID not found")
    void resolveDID_notFound() {
        when(stub.getStringState("DID:" + VALID_DID)).thenReturn(null);

        assertThatThrownBy(() -> contract.resolveDID(ctx, VALID_DID))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("DID not found");
    }

    // ─── suspendDID ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("suspendDID: should suspend ACTIVE DID when called by admin")
    void suspendDID_success() {
        String activeDoc = buildDocJson(VALID_DID, "ACTIVE", 1);
        when(stub.getStringState("DID:" + VALID_DID)).thenReturn(activeDoc);
        when(stub.getStringState("NONCE:" + ADMIN_DID + ":" + NONCE)).thenReturn(null);

        DIDDocument result = contract.suspendDID(ctx, VALID_DID, ADMIN_DID, "Security investigation", NONCE, TIMESTAMP);

        assertThat(result.getStatus()).isEqualTo("SUSPENDED");
        verify(stub).setEvent(eq("DIDSuspended"), any(byte[].class));
    }

    @Test
    @DisplayName("suspendDID: should reject non-admin caller")
    void suspendDID_nonAdmin() {
        assertThatThrownBy(() ->
            contract.suspendDID(ctx, VALID_DID, "did:cypherid:0xREGULAR", "reason", NONCE, TIMESTAMP)
        ).isInstanceOf(RuntimeException.class)
         .hasMessageContaining("not authorized admin");
    }

    // ─── revokeDID ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("revokeDID: should revoke ACTIVE DID irreversibly")
    void revokeDID_success() {
        String activeDoc = buildDocJson(VALID_DID, "ACTIVE", 1);
        when(stub.getStringState("DID:" + VALID_DID)).thenReturn(activeDoc);
        when(stub.getStringState("NONCE:" + ADMIN_DID + ":" + NONCE)).thenReturn(null);

        DIDDocument result = contract.revokeDID(ctx, VALID_DID, ADMIN_DID, "Compromised key", NONCE, TIMESTAMP);

        assertThat(result.getStatus()).isEqualTo("REVOKED");
        verify(stub).setEvent(eq("DIDRevoked"), any(byte[].class));
    }

    // ─── issueVC ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("issueVC: should issue VC when both DIDs are active")
    void issueVC_success() {
        String issuerDid  = "did:cypherid:admin:issuer";
        String vcId       = "vc-clearance-001";
        String nonce2     = "nonce-" + System.nanoTime();

        String subjectDocJson = buildDocJson(VALID_DID, "ACTIVE", 1);
        String issuerDocJson  = buildDocJson(issuerDid, "ACTIVE", 1);

        when(stub.getStringState("DID:" + VALID_DID)).thenReturn(subjectDocJson);
        when(stub.getStringState("DID:" + issuerDid)).thenReturn(issuerDocJson);
        when(stub.getStringState("NONCE:" + issuerDid + ":" + nonce2)).thenReturn(null);
        when(stub.getStringState("VC:" + VALID_DID + ":" + vcId)).thenReturn(null);

        String vcJson = "{\"type\":\"ClearanceCredential\",\"level\":\"LEVEL_3\"}";

        VerifiableCredential vc = contract.issueVC(
                ctx, VALID_DID, vcId, vcJson, issuerDid, "SIG_ABC123", nonce2, TIMESTAMP);

        assertThat(vc).isNotNull();
        assertThat(vc.getVcId()).isEqualTo(vcId);
        assertThat(vc.getSubjectDid()).isEqualTo(VALID_DID);
        assertThat(vc.getStatus()).isEqualTo("ACTIVE");

        verify(stub).putStringState(eq("VC:" + VALID_DID + ":" + vcId), anyString());
        verify(stub).setEvent(eq("VCIssued"), any(byte[].class));
    }

    // ─── verifyVC ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("verifyVC: should return VALID for active VC with active subject DID")
    void verifyVC_valid() {
        String vcId = "vc-test-001";
        String vcJsonStored = "{\"vcId\":\"" + vcId + "\",\"subjectDid\":\"" + VALID_DID + "\",\"issuerDid\":\"did:cypherid:admin:issuer\",\"status\":\"ACTIVE\",\"issuedAt\":\"" + TIMESTAMP + "\"}";
        String didJsonStored = buildDocJson(VALID_DID, "ACTIVE", 1);

        when(stub.getStringState("VC:" + VALID_DID + ":" + vcId)).thenReturn(vcJsonStored);
        when(stub.getStringState("DID:" + VALID_DID)).thenReturn(didJsonStored);

        String result = contract.verifyVC(ctx, VALID_DID, vcId);

        assertThat(result).contains("VALID");
        assertThat(result).contains(vcId);
    }

    @Test
    @DisplayName("verifyVC: should return NOT_FOUND when VC does not exist")
    void verifyVC_notFound() {
        when(stub.getStringState("VC:" + VALID_DID + ":missing-vc")).thenReturn(null);

        String result = contract.verifyVC(ctx, VALID_DID, "missing-vc");
        assertThat(result).contains("NOT_FOUND");
    }

    @Test
    @DisplayName("verifyVC: should return REVOKED for revoked VC")
    void verifyVC_revoked() {
        String vcId = "vc-revoked-001";
        String vcJsonStored = "{\"vcId\":\"" + vcId + "\",\"subjectDid\":\"" + VALID_DID + "\",\"issuerDid\":\"did:cypherid:admin:issuer\",\"status\":\"REVOKED\",\"issuedAt\":\"" + TIMESTAMP + "\"}";
        when(stub.getStringState("VC:" + VALID_DID + ":" + vcId)).thenReturn(vcJsonStored);

        String result = contract.verifyVC(ctx, VALID_DID, vcId);
        assertThat(result).contains("REVOKED");
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private String buildDocJson(String did, String status, int version) {
        return String.format(
            "{\"did\":\"%s\",\"publicKey\":\"%s\",\"metadata\":\"%s\",\"status\":\"%s\",\"createdAt\":\"%s\",\"updatedAt\":\"%s\",\"version\":%d}",
            did, PUBLIC_KEY, METADATA, status, TIMESTAMP, TIMESTAMP, version);
    }
}
