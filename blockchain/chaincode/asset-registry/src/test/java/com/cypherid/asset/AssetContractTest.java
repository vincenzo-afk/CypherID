package com.cypherid.asset;

import java.time.Instant;
import java.util.List;
import org.hyperledger.fabric.contract.Context;
import org.hyperledger.fabric.shim.ChaincodeStub;
import org.hyperledger.fabric.shim.ledger.KeyModification;
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
 * Unit tests for AssetContract using Mockito to mock ChaincodeStub.
 * No real Fabric network required.
 */
@ExtendWith(MockitoExtension.class)
class AssetContractTest {

    @Mock private Context ctx;
    @Mock private ChaincodeStub stub;

    private AssetContract contract;

    private static final String ASSET_ID   = "ASSET-001";
    private static final String OWNER_DID  = "did:cypherid:0xOWNER1234567890";
    private static final String NEW_OWNER  = "did:cypherid:0xNEWOWNER1234567";
    private static final String IPFS_HASH  = "QmTestEncryptedBlobCID1234567890";
    private static final String TIMESTAMP  = Instant.now().toString();

    @BeforeEach
    void setUp() {
        contract = new AssetContract();
        when(ctx.getStub()).thenReturn(stub);
    }

    // ─── mintAsset ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("mintAsset: should mint asset when inputs are valid")
    void mintAsset_success() {
        String nonce = "nonce-" + System.nanoTime();
        when(stub.getStringState("NONCE:" + OWNER_DID + ":" + nonce)).thenReturn(null);
        when(stub.getStringState("ASSET:" + ASSET_ID)).thenReturn(null);
        when(stub.getStringState("OWNER_ASSETS:" + OWNER_DID)).thenReturn(null);

        Asset result = contract.mintAsset(ctx, ASSET_ID, OWNER_DID, IPFS_HASH,
                "CONFIDENTIAL", "POLICY-1", "report.pdf", "pdf", "1024", nonce, TIMESTAMP);

        assertThat(result).isNotNull();
        assertThat(result.getAssetId()).isEqualTo(ASSET_ID);
        assertThat(result.getOwnerDid()).isEqualTo(OWNER_DID);
        assertThat(result.getStatus()).isEqualTo("ACTIVE");
        assertThat(result.getClassification()).isEqualTo("CONFIDENTIAL");

        verify(stub).putStringState(eq("ASSET:" + ASSET_ID), anyString());
        verify(stub).setEvent(eq("AssetMinted"), any(byte[].class));
    }

    @Test
    @DisplayName("mintAsset: should reject duplicate asset")
    void mintAsset_duplicate() {
        String nonce = "nonce-" + System.nanoTime();
        when(stub.getStringState("NONCE:" + OWNER_DID + ":" + nonce)).thenReturn(null);
        when(stub.getStringState("ASSET:" + ASSET_ID)).thenReturn("{\"assetId\":\"" + ASSET_ID + "\"}");

        assertThatThrownBy(() -> contract.mintAsset(ctx, ASSET_ID, OWNER_DID, IPFS_HASH,
                "CONFIDENTIAL", "POLICY-1", "report.pdf", "pdf", "1024", nonce, TIMESTAMP))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Asset already exists");
    }

    @Test
    @DisplayName("mintAsset: should reject invalid classification")
    void mintAsset_badClassification() {
        String nonce = "nonce-" + System.nanoTime();
        when(stub.getStringState("NONCE:" + OWNER_DID + ":" + nonce)).thenReturn(null);
        when(stub.getStringState("ASSET:" + ASSET_ID)).thenReturn(null);

        assertThatThrownBy(() -> contract.mintAsset(ctx, ASSET_ID, OWNER_DID, IPFS_HASH,
                "ULTRA_SECRET", "POLICY-1", "report.pdf", "pdf", "1024", nonce, TIMESTAMP))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Invalid classification");
    }

    @Test
    @DisplayName("mintAsset: should reject replayed nonce")
    void mintAsset_replayedNonce() {
        String nonce = "nonce-" + System.nanoTime();
        when(stub.getStringState("NONCE:" + OWNER_DID + ":" + nonce)).thenReturn("used");

        assertThatThrownBy(() -> contract.mintAsset(ctx, ASSET_ID, OWNER_DID, IPFS_HASH,
                "CONFIDENTIAL", "POLICY-1", "report.pdf", "pdf", "1024", nonce, TIMESTAMP))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Nonce already used");
    }

    @Test
    @DisplayName("mintAsset: should reject missing ipfsHash")
    void mintAsset_missingIpfs() {
        String nonce = "nonce-" + System.nanoTime();
        when(stub.getStringState("NONCE:" + OWNER_DID + ":" + nonce)).thenReturn(null);
        when(stub.getStringState("ASSET:" + ASSET_ID)).thenReturn(null);

        assertThatThrownBy(() -> contract.mintAsset(ctx, ASSET_ID, OWNER_DID, "",
                "CONFIDENTIAL", "POLICY-1", "report.pdf", "pdf", "1024", nonce, TIMESTAMP))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("ipfsHash is required");
    }

    // ─── transferAsset ────────────────────────────────────────────────────────

    @Test
    @DisplayName("transferAsset: should transfer ownership when caller owns asset")
    void transferAsset_success() {
        String nonce = "nonce-" + System.nanoTime();
        when(stub.getStringState("NONCE:" + OWNER_DID + ":" + nonce)).thenReturn(null);
        when(stub.getStringState("ASSET:" + ASSET_ID)).thenReturn(activeAssetJson(OWNER_DID));
        when(stub.getStringState("OWNER_ASSETS:" + OWNER_DID)).thenReturn("[\"" + ASSET_ID + "\"]");
        when(stub.getStringState("OWNER_ASSETS:" + NEW_OWNER)).thenReturn(null);

        Asset result = contract.transferAsset(ctx, ASSET_ID, OWNER_DID, NEW_OWNER, "SIG_OWNER", nonce, TIMESTAMP);

        assertThat(result.getOwnerDid()).isEqualTo(NEW_OWNER);
        assertThat(result.getStatus()).isEqualTo("ACTIVE");
        verify(stub).setEvent(eq("AssetTransferred"), any(byte[].class));
    }

    @Test
    @DisplayName("transferAsset: should reject when caller does not own asset")
    void transferAsset_notOwner() {
        String nonce = "nonce-" + System.nanoTime();
        when(stub.getStringState("NONCE:" + OWNER_DID + ":" + nonce)).thenReturn(null);
        when(stub.getStringState("ASSET:" + ASSET_ID)).thenReturn(activeAssetJson(NEW_OWNER));

        assertThatThrownBy(() -> contract.transferAsset(ctx, ASSET_ID, OWNER_DID, NEW_OWNER, "SIG", nonce, TIMESTAMP))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("does not own asset");
    }

    @Test
    @DisplayName("transferAsset: should reject burned asset")
    void transferAsset_burned() {
        String nonce = "nonce-" + System.nanoTime();
        when(stub.getStringState("NONCE:" + OWNER_DID + ":" + nonce)).thenReturn(null);
        when(stub.getStringState("ASSET:" + ASSET_ID)).thenReturn(activeAssetJson(OWNER_DID).replace("\"ACTIVE\"", "\"BURNED\""));

        assertThatThrownBy(() -> contract.transferAsset(ctx, ASSET_ID, OWNER_DID, NEW_OWNER, "SIG", nonce, TIMESTAMP))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("not ACTIVE");
    }

    @Test
    @DisplayName("transferAsset: should reject missing ownerSignature")
    void transferAsset_noSignature() {
        String nonce = "nonce-" + System.nanoTime();
        when(stub.getStringState("NONCE:" + OWNER_DID + ":" + nonce)).thenReturn(null);
        when(stub.getStringState("ASSET:" + ASSET_ID)).thenReturn(activeAssetJson(OWNER_DID));

        assertThatThrownBy(() -> contract.transferAsset(ctx, ASSET_ID, OWNER_DID, NEW_OWNER, "", nonce, TIMESTAMP))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("ownerSignature is required");
    }

    // ─── burnAsset ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("burnAsset: should burn asset owned by caller")
    void burnAsset_success() {
        String nonce = "nonce-" + System.nanoTime();
        when(stub.getStringState("NONCE:" + OWNER_DID + ":" + nonce)).thenReturn(null);
        when(stub.getStringState("ASSET:" + ASSET_ID)).thenReturn(activeAssetJson(OWNER_DID));

        Asset result = contract.burnAsset(ctx, ASSET_ID, OWNER_DID, "SIG_OWNER", nonce, TIMESTAMP);

        assertThat(result.getStatus()).isEqualTo("BURNED");
        verify(stub).setEvent(eq("AssetBurned"), any(byte[].class));
    }

    @Test
    @DisplayName("burnAsset: should reject double burn")
    void burnAsset_alreadyBurned() {
        String nonce = "nonce-" + System.nanoTime();
        when(stub.getStringState("NONCE:" + OWNER_DID + ":" + nonce)).thenReturn(null);
        when(stub.getStringState("ASSET:" + ASSET_ID)).thenReturn(activeAssetJson(OWNER_DID).replace("\"ACTIVE\"", "\"BURNED\""));

        assertThatThrownBy(() -> contract.burnAsset(ctx, ASSET_ID, OWNER_DID, "SIG", nonce, TIMESTAMP))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("already burned");
    }

    @Test
    @DisplayName("burnAsset: should reject when caller does not own asset")
    void burnAsset_notOwner() {
        String nonce = "nonce-" + System.nanoTime();
        when(stub.getStringState("NONCE:" + OWNER_DID + ":" + nonce)).thenReturn(null);
        when(stub.getStringState("ASSET:" + ASSET_ID)).thenReturn(activeAssetJson(NEW_OWNER));

        assertThatThrownBy(() -> contract.burnAsset(ctx, ASSET_ID, OWNER_DID, "SIG", nonce, TIMESTAMP))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("does not own asset");
    }

    // ─── queryAsset / queryOwnerAssets ────────────────────────────────────────

    @Test
    @DisplayName("queryAsset: should return asset when it exists")
    void queryAsset_success() {
        when(stub.getStringState("ASSET:" + ASSET_ID)).thenReturn(activeAssetJson(OWNER_DID));

        Asset result = contract.queryAsset(ctx, ASSET_ID);

        assertThat(result.getAssetId()).isEqualTo(ASSET_ID);
        assertThat(result.getOwnerDid()).isEqualTo(OWNER_DID);
    }

    @Test
    @DisplayName("queryAsset: should throw when asset not found")
    void queryAsset_notFound() {
        when(stub.getStringState("ASSET:MISSING")).thenReturn(null);

        assertThatThrownBy(() -> contract.queryAsset(ctx, "MISSING"))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Asset not found");
    }

    @Test
    @DisplayName("queryOwnerAssets: should return empty array when owner has none")
    void queryOwnerAssets_empty() {
        when(stub.getStringState("OWNER_ASSETS:" + OWNER_DID)).thenReturn(null);

        assertThat(contract.queryOwnerAssets(ctx, OWNER_DID)).isEqualTo("[]");
    }

    @Test
    @DisplayName("queryOwnerAssets: should return stored index")
    void queryOwnerAssets_withData() {
        when(stub.getStringState("OWNER_ASSETS:" + OWNER_DID)).thenReturn("[\"" + ASSET_ID + "\"]");

        assertThat(contract.queryOwnerAssets(ctx, OWNER_DID)).contains(ASSET_ID);
    }

    // ─── getAssetHistory ──────────────────────────────────────────────────────

    @Test
    @DisplayName("getAssetHistory: should return empty history when no modifications")
    @SuppressWarnings("unchecked")
    void getAssetHistory_empty() {
        QueryResultsIterator<KeyModification> iterator = mock(QueryResultsIterator.class);
        when(stub.getHistoryForKey("ASSET:" + ASSET_ID)).thenReturn(iterator);
        when(iterator.hasNext()).thenReturn(false);

        assertThat(contract.getAssetHistory(ctx, ASSET_ID)).isEqualTo("[]");
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private String activeAssetJson(String owner) {
        return String.format(
            "{\"assetId\":\"%s\",\"ownerDid\":\"%s\",\"ipfsHash\":\"%s\",\"classification\":\"CONFIDENTIAL\","
            + "\"policyId\":\"POLICY-1\",\"status\":\"ACTIVE\",\"fileName\":\"report.pdf\",\"fileType\":\"pdf\","
            + "\"fileSizeBytes\":1024,\"createdAt\":\"%s\",\"updatedAt\":\"%s\"}",
            ASSET_ID, owner, IPFS_HASH, TIMESTAMP, TIMESTAMP);
    }
}
