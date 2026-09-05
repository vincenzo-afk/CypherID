package com.cypherid.asset.service.content;

import com.cypherid.asset.service.config.ProtectionConfigurationService;
import com.cypherid.asset.service.crypto.EncryptionService;
import com.cypherid.asset.service.domain.AssetEncryptionKeyEntity;
import com.cypherid.asset.service.exception.ChunkRateExceededException;
import com.cypherid.asset.service.exception.ResourceNotFoundException;
import com.cypherid.asset.service.exception.SessionObscuredException;
import com.cypherid.asset.service.fabric.FabricAssetClient;
import com.cypherid.asset.service.ipfs.IPFSService;
import com.cypherid.asset.service.repository.AssetEncryptionKeyRepository;
import com.cypherid.asset.service.repository.WatermarkRepository;
import com.cypherid.asset.service.session.ProtectedSessionService;
import com.cypherid.asset.service.session.SessionState;
import com.cypherid.asset.service.session.SessionStateMachine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Arrays;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * ProtectedContentServiceTest — verifies chunked delivery: server-side
 * decryption, chunk slicing, and session-state guards.
 */
@ExtendWith(MockitoExtension.class)
class ProtectedContentServiceTest {

    private static final String CONTENT = "abcdefghijklmnopqrstuvwxyz0123456789"; // 36 bytes
    private static final String CONTENT_ID = "ASSET-1";
    private static final String SESSION_ID = "11111111-2222-3333-4444-555555555555";
    private static final String TOKEN = "session-token";

    @Mock
    private ProtectedSessionService sessionService;

    @Mock
    private IPFSService ipfsService;

    @Mock
    private AssetEncryptionKeyRepository keyRepository;

    @Mock
    private WatermarkRepository watermarkRepository;

    @Mock
    private FabricAssetClient fabricClient;

    private ProtectedContentService service;
    private byte[] encryptedBlob;

    @BeforeEach
    void setUp() throws Exception {
        // 16-byte chunks for easy slicing tests
        ProtectionConfigurationService config = new ProtectionConfigurationService(16, 10, 5);
        EncryptionService encryptionService = new EncryptionService("CypherID-Asset-Master-Key-2026!!");

        service = new ProtectedContentService(sessionService, ipfsService, encryptionService,
                keyRepository, watermarkRepository, fabricClient, config);

        // Real key + wrapped key entity
        byte[] assetKey = encryptionService.generateKey();
        encryptedBlob = encryptionService.encrypt(CONTENT.getBytes(StandardCharsets.UTF_8), assetKey);
        EncryptionService.KeyBlob wrapped = encryptionService.wrapKey(assetKey);

        AssetEncryptionKeyEntity keyEntity = new AssetEncryptionKeyEntity();
        keyEntity.setAssetId(CONTENT_ID);
        keyEntity.setEncryptedKey(wrapped.data());
        keyEntity.setIv(wrapped.iv());

        when(ipfsService.cat("QmTestCID")).thenReturn(encryptedBlob);
        when(keyRepository.findById(CONTENT_ID)).thenReturn(Optional.of(keyEntity));
        when(fabricClient.queryAsset(CONTENT_ID)).thenReturn(
                "{\"assetId\":\"" + CONTENT_ID + "\",\"ipfsHash\":\"QmTestCID\",\"classification\":\"SECRET\"}");
    }

    @Test
    void getChunk_slicesDecryptedContent() {
        SessionState authorized = new SessionState(SESSION_ID, "did:cypherid:user1", CONTENT_ID,
                "DOCUMENT", "HIGH", SessionStateMachine.STATE_AUTHORIZED, 0, 0,
                Instant.now().plusSeconds(600).toString());
        when(sessionService.validateSession(TOKEN)).thenReturn(authorized);
        when(sessionService.exceedsChunkRate(SESSION_ID)).thenReturn(false);

        byte[] chunk0 = service.getChunk(TOKEN, 0);
        byte[] chunk1 = service.getChunk(TOKEN, 1);
        byte[] chunk2 = service.getChunk(TOKEN, 2);

        byte[] plaintext = CONTENT.getBytes(StandardCharsets.UTF_8);
        assertArrayEquals(Arrays.copyOfRange(plaintext, 0, 16), chunk0);
        assertArrayEquals(Arrays.copyOfRange(plaintext, 16, 32), chunk1);
        assertArrayEquals(Arrays.copyOfRange(plaintext, 32, 36), chunk2);

        // First content request transitions AUTHORIZED → PROTECTED_VIEW
        // (mocked session stays AUTHORIZED, so the transition fires per chunk call)
        verify(sessionService, atLeastOnce()).updateState(SESSION_ID, SessionStateMachine.STATE_PROTECTED_VIEW);
        verify(sessionService, times(3)).logChunkDelivery(SESSION_ID);
        verify(sessionService, times(3)).recordChunkDelivery(eq(SESSION_ID), anyInt());
    }

    @Test
    void getChunk_obscuredSession_throws() {
        SessionState obscured = new SessionState(SESSION_ID, "did:cypherid:user1", CONTENT_ID,
                "DOCUMENT", "HIGH", SessionStateMachine.STATE_CONTENT_OBSCURED, 0, 0,
                Instant.now().plusSeconds(600).toString());
        when(sessionService.validateSession(TOKEN)).thenReturn(obscured);

        assertThrows(SessionObscuredException.class, () -> service.getChunk(TOKEN, 0));
        verify(sessionService, never()).logChunkDelivery(anyString());
    }

    @Test
    void getChunk_outOfRange_throws() {
        SessionState authorized = new SessionState(SESSION_ID, "did:cypherid:user1", CONTENT_ID,
                "DOCUMENT", "HIGH", SessionStateMachine.STATE_PROTECTED_VIEW, 0, 0,
                Instant.now().plusSeconds(600).toString());
        when(sessionService.validateSession(TOKEN)).thenReturn(authorized);
        when(sessionService.exceedsChunkRate(SESSION_ID)).thenReturn(false);

        // 36 bytes / 16 = 3 chunks (indices 0..2); index 5 is out of range
        assertThrows(ResourceNotFoundException.class, () -> service.getChunk(TOKEN, 5));
    }

    @Test
    void getChunk_rateLimited_throws() {
        SessionState authorized = new SessionState(SESSION_ID, "did:cypherid:user1", CONTENT_ID,
                "DOCUMENT", "HIGH", SessionStateMachine.STATE_PROTECTED_VIEW, 0, 0,
                Instant.now().plusSeconds(600).toString());
        when(sessionService.validateSession(TOKEN)).thenReturn(authorized);
        when(sessionService.exceedsChunkRate(SESSION_ID)).thenReturn(true);

        assertThrows(ChunkRateExceededException.class, () -> service.getChunk(TOKEN, 0));
    }
}