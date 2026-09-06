package com.cypherid.asset.service.service;

import com.cypherid.asset.service.crypto.EncryptionService;
import com.cypherid.asset.service.dto.*;
import com.cypherid.asset.service.exception.ForbiddenException;
import com.cypherid.asset.service.exception.GoneException;
import com.cypherid.asset.service.exception.IPFSException;
import com.cypherid.asset.service.exception.ResourceNotFoundException;
import com.cypherid.asset.service.fabric.FabricAssetClient;
import com.cypherid.asset.service.ipfs.IPFSService;
import com.cypherid.asset.service.kafka.AssetEventProducer;
import com.cypherid.asset.service.repository.AssetEncryptionKeyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * AssetServiceTest — unit tests for the asset lifecycle with the
 * Fabric client, IPFS, and Kafka dependencies mocked.
 */
@ExtendWith(MockitoExtension.class)
class AssetServiceTest {

    private static final String OWNER = "did:cypherid:user1";

    @Mock
    private FabricAssetClient fabricClient;

    @Mock
    private IPFSService ipfsService;

    @Mock
    private AssetEncryptionKeyRepository keyRepository;

    @Mock
    private AssetEventProducer eventProducer;

    private AssetService service;

    @BeforeEach
    void setUp() {
        service = new AssetService(fabricClient, new EncryptionService("CypherID-Asset-Master-Key-2026!!"),
                ipfsService, keyRepository, eventProducer);
    }

    // ─── Upload + mint ────────────────────────────────────────────────────────

    @Test
    void uploadAsset_encryptsUploadsAndMints() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "drdo-doc.txt", "text/plain",
                "classified content".getBytes(StandardCharsets.UTF_8));

        when(ipfsService.upload(any(byte[].class))).thenReturn("QmTestCID");
        when(fabricClient.mintAsset(anyString(), eq(OWNER), eq("QmTestCID"), eq("SECRET"), anyString(),
                anyString(), anyString(), anyString(), anyString(), anyString()))
                .thenReturn(new FabricAssetClient.TxOutcome(
                        ("{\"assetId\":\"ASSET-x\",\"ownerDid\":\"" + OWNER + "\"}").getBytes(), "tx-mint"));

        AssetUploadResponse response = service.uploadAsset(OWNER, file, "SECRET", "POLICY-1");

        assertNotNull(response.assetId());
        assertTrue(response.assetId().startsWith("ASSET-"));
        assertEquals("QmTestCID", response.ipfsHash());
        assertEquals(OWNER, response.ownerDID());
        assertNotNull(response.txHash());

        verify(ipfsService).upload(any(byte[].class));
        verify(fabricClient).mintAsset(anyString(), eq(OWNER), eq("QmTestCID"), eq("SECRET"), eq("POLICY-1"),
                eq("drdo-doc.txt"), eq("text/plain"), anyString(), anyString(), anyString());
        verify(keyRepository).save(any());
        verify(eventProducer).publishAssetEvent(eq("ASSET_MINTED"), anyString(), eq(OWNER), eq("SECRET"), eq("QmTestCID"), anyString());
    }

    @Test
    void uploadAsset_invalidClassification_rejected() {
        MockMultipartFile file = new MockMultipartFile("file", "a.txt", "text/plain", new byte[]{1, 2, 3});

        assertThrows(IllegalArgumentException.class,
                () -> service.uploadAsset(OWNER, file, "TOP_BANANA", null));
        verifyNoInteractions(fabricClient);
    }

    @Test
    void uploadAsset_emptyFile_rejected() {
        MockMultipartFile file = new MockMultipartFile("file", "empty.txt", "text/plain", new byte[0]);

        assertThrows(IllegalArgumentException.class,
                () -> service.uploadAsset(OWNER, file, "SECRET", null));
    }

    @Test
    void uploadAsset_ipfsDown_throwsIpfsError() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "a.txt", "text/plain", "data".getBytes(StandardCharsets.UTF_8));

        when(ipfsService.upload(any(byte[].class))).thenThrow(new IPFSException("IPFS unreachable"));

        assertThrows(IPFSException.class, () -> service.uploadAsset(OWNER, file, "SECRET", null));
        verifyNoInteractions(fabricClient);
    }

    // ─── Metadata ─────────────────────────────────────────────────────────────

    @Test
    void getAssetMetadata_returnsMappedFields() throws Exception {
        when(fabricClient.queryAsset("ASSET-1")).thenReturn(
                "{\"assetId\":\"ASSET-1\",\"ownerDid\":\"did:cypherid:user1\",\"ipfsHash\":\"Qm1\"," +
                "\"classification\":\"SECRET\",\"policyId\":\"POLICY-1\",\"status\":\"ACTIVE\"," +
                "\"fileName\":\"doc.txt\",\"fileType\":\"text/plain\",\"fileSizeBytes\":42," +
                "\"createdAt\":\"2026-01-01T00:00:00Z\",\"updatedAt\":\"2026-01-01T00:00:00Z\"}");

        AssetMetadataResponse metadata = service.getAssetMetadata("ASSET-1");

        assertEquals("ASSET-1", metadata.assetId());
        assertEquals("did:cypherid:user1", metadata.ownerDID());
        assertEquals("SECRET", metadata.classification());
        assertEquals("ACTIVE", metadata.status());
        assertEquals(42, metadata.fileSizeBytes());
    }

    // ─── Transfer ─────────────────────────────────────────────────────────────

    @Test
    void transfer_ownerCanTransfer() throws Exception {
        when(fabricClient.queryAsset("ASSET-1")).thenReturn(ownerAssetJson("did:cypherid:user1"));
        when(fabricClient.transferAsset(eq("ASSET-1"), eq(OWNER), eq("did:cypherid:user2"), eq("sig"), anyString(), anyString()))
                .thenReturn(new FabricAssetClient.TxOutcome("{\"assetId\":\"ASSET-1\"}".getBytes(), "tx-transfer"));

        TransferResponse response = service.transfer("ASSET-1", OWNER,
                new TransferAssetRequest("did:cypherid:user2", "sig"));

        assertEquals("did:cypherid:user2", response.newOwner());
        assertNotNull(response.txHash());
    }

    @Test
    void transfer_nonOwner_forbidden() throws Exception {
        when(fabricClient.queryAsset("ASSET-1")).thenReturn(ownerAssetJson("did:cypherid:other"));

        assertThrows(ForbiddenException.class,
                () -> service.transfer("ASSET-1", OWNER,
                        new TransferAssetRequest("did:cypherid:user2", "sig")));
        verifyNoInteractions(eventProducer);
    }

    // ─── Burn ─────────────────────────────────────────────────────────────────

    @Test
    void burn_ownerBurnsAsset() throws Exception {
        when(fabricClient.queryAsset("ASSET-1")).thenReturn(ownerAssetJson("did:cypherid:user1"));
        when(fabricClient.burnAsset(eq("ASSET-1"), eq(OWNER), eq("sig"), anyString(), anyString()))
                .thenReturn(new FabricAssetClient.TxOutcome(
                        "{\"assetId\":\"ASSET-1\",\"status\":\"BURNED\"}".getBytes(), "tx-burn"));

        BurnResponse response = service.burn("ASSET-1", OWNER, new BurnAssetRequest("sig"));

        assertEquals("BURNED", response.status());
        assertNotNull(response.txHash());
        verify(ipfsService).remove(anyString());
        verify(keyRepository).deleteById("ASSET-1");
    }

    @Test
    void burn_alreadyBurned_throwsGone() throws Exception {
        when(fabricClient.queryAsset("ASSET-1")).thenReturn(
                ownerAssetJson("did:cypherid:user1").replace("\"ACTIVE\"", "\"BURNED\""));

        assertThrows(GoneException.class,
                () -> service.burn("ASSET-1", OWNER, new BurnAssetRequest("sig")));
        verify(fabricClient, never()).burnAsset(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void burn_nonOwner_forbidden() throws Exception {
        when(fabricClient.queryAsset("ASSET-1")).thenReturn(ownerAssetJson("did:cypherid:other"));

        assertThrows(ForbiddenException.class,
                () -> service.burn("ASSET-1", OWNER, new BurnAssetRequest("sig")));
    }

    @Test
    void getAssetMetadata_notFound_throws() throws Exception {
        when(fabricClient.queryAsset("MISSING")).thenThrow(
                new org.hyperledger.fabric.client.GatewayException(io.grpc.Status.NOT_FOUND
                        .withDescription("Error endorsing chaincode: Asset not found: MISSING")
                        .asRuntimeException()));

        assertThrows(ResourceNotFoundException.class, () -> service.getAssetMetadata("MISSING"));
    }

    private String ownerAssetJson(String ownerDid) {
        return "{\"assetId\":\"ASSET-1\",\"ownerDid\":\"" + ownerDid + "\",\"ipfsHash\":\"Qm1\"," +
               "\"classification\":\"SECRET\",\"policyId\":\"POLICY-1\",\"status\":\"ACTIVE\"," +
               "\"fileName\":\"doc.txt\",\"fileType\":\"text/plain\",\"fileSizeBytes\":42," +
               "\"createdAt\":\"2026-01-01T00:00:00Z\",\"updatedAt\":\"2026-01-01T00:00:00Z\"}";
    }
}