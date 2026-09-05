package com.cypherid.asset.service.content;

import com.cypherid.asset.service.config.ProtectionConfigurationService;
import com.cypherid.asset.service.crypto.EncryptionService;
import com.cypherid.asset.service.domain.AssetEncryptionKeyEntity;
import com.cypherid.asset.service.dto.SessionInfoResponse;
import com.cypherid.asset.service.dto.WatermarkDto;
import com.cypherid.asset.service.exception.*;
import com.cypherid.asset.service.fabric.FabricAssetClient;
import com.cypherid.asset.service.ipfs.IPFSService;
import com.cypherid.asset.service.repository.AssetEncryptionKeyRepository;
import com.cypherid.asset.service.repository.WatermarkRepository;
import com.cypherid.asset.service.session.ProtectedSessionService;
import com.cypherid.asset.service.session.SessionState;
import com.cypherid.asset.service.session.SessionStateMachine;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import org.hyperledger.fabric.client.GatewayException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.lang.reflect.Type;
import java.security.GeneralSecurityException;
import java.util.Arrays;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * ProtectedContentService — serves protected content in chunks
 * (docs/backend/12_PROTECTED_CONTENT_SERVICE.md).
 * <p>
 * CRITICAL guarantees:
 * - Decryption keys NEVER leave this service.
 * - Content is served only as small chunks, never as a full document.
 * - Every chunk request validates the session and is rate-limited + logged.
 * <p>
 * The decrypted content is cached in-process (never sent to the browser in
 * full) so repeated chunk requests don't re-fetch from IPFS per chunk.
 */
@Service
public class ProtectedContentService {

    private static final Logger logger = LoggerFactory.getLogger(ProtectedContentService.class);

    private static final Type STRING_MAP_TYPE = new TypeToken<Map<String, String>>() {}.getType();

    /** In-process cache of decrypted content keyed by contentId (idle eviction). */
    private static final long CACHE_IDLE_MS = 10 * 60 * 1000;
    private final ConcurrentHashMap<String, CachedContent> contentCache = new ConcurrentHashMap<>();

    private final ProtectedSessionService sessionService;
    private final IPFSService ipfsService;
    private final EncryptionService encryptionService;
    private final AssetEncryptionKeyRepository keyRepository;
    private final WatermarkRepository watermarkRepository;
    private final FabricAssetClient fabricClient;
    private final ProtectionConfigurationService config;
    private final Gson gson = new Gson();

    public ProtectedContentService(ProtectedSessionService sessionService,
                                   IPFSService ipfsService,
                                   EncryptionService encryptionService,
                                   AssetEncryptionKeyRepository keyRepository,
                                   WatermarkRepository watermarkRepository,
                                   FabricAssetClient fabricClient,
                                   ProtectionConfigurationService config) {
        this.sessionService = sessionService;
        this.ipfsService = ipfsService;
        this.encryptionService = encryptionService;
        this.keyRepository = keyRepository;
        this.watermarkRepository = watermarkRepository;
        this.fabricClient = fabricClient;
        this.config = config;
    }

    /**
     * Serves one chunk of decrypted content for an authorized session.
     *
     * @throws InvalidSessionException     401 invalid/expired session
     * @throws SessionObscuredException    403 session obscured
     * @throws ResourceNotFoundException   404 chunk out of range
     * @throws ChunkRateExceededException  429 rate limit
     */
    public byte[] getChunk(String token, int chunkIndex) {
        SessionState session = sessionService.validateSession(token);

        if (SessionStateMachine.STATE_CONTENT_OBSCURED.equals(session.state())
                || SessionStateMachine.STATE_SUPPORTED_CAPTURE_EVENT.equals(session.state())) {
            throw new SessionObscuredException("Session is in CONTENT_OBSCURED state");
        }

        // First content request transitions AUTHORIZED → PROTECTED_VIEW
        if (SessionStateMachine.STATE_AUTHORIZED.equals(session.state())) {
            sessionService.updateState(session.sessionId(), SessionStateMachine.STATE_PROTECTED_VIEW);
        }

        if (sessionService.exceedsChunkRate(session.sessionId())) {
            throw new ChunkRateExceededException("Chunk request rate limit exceeded");
        }

        byte[] decrypted = getDecryptedContent(session.contentId());
        int chunkSize = config.getChunkSizeBytes();
        int totalChunks = (int) Math.ceil((double) decrypted.length / chunkSize);

        if (chunkIndex < 0 || chunkIndex >= totalChunks) {
            throw new ResourceNotFoundException("CHUNK_OUT_OF_RANGE",
                    "Chunk index " + chunkIndex + " out of range (total: " + totalChunks + ")");
        }

        int start = chunkIndex * chunkSize;
        int end = Math.min(start + chunkSize, decrypted.length);
        byte[] chunk = Arrays.copyOfRange(decrypted, start, end);

        sessionService.logChunkDelivery(session.sessionId());
        sessionService.recordChunkDelivery(session.sessionId(), chunkIndex);
        return chunk;
    }

    /**
     * Returns session metadata (never content) for the renderer.
     */
    public SessionInfoResponse sessionInfo(String token) {
        SessionState session = sessionService.validateSession(token);
        long fileSize = fetchFileSize(session.contentId());
        int chunkSize = config.getChunkSizeBytes();
        int totalChunks = fileSize <= 0 ? 0 : (int) Math.ceil((double) fileSize / chunkSize);

        WatermarkDto watermark = watermarkRepository.findBySessionId(
                        java.util.UUID.fromString(session.sessionId()))
                .map(w -> new WatermarkDto(w.getDisplayId(), w.getUserDisplay(), w.getTimestampLabel()))
                .orElse(null);

        return new SessionInfoResponse(
                session.sessionId(), session.contentId(), session.contentType(),
                session.profile(), totalChunks, session.expiresAt(), session.state(), watermark);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private byte[] getDecryptedContent(String contentId) {
        CachedContent cached = contentCache.get(contentId);
        if (cached != null && !cached.isIdle()) {
            cached.touch();
            return cached.bytes();
        }
        // Evict stale entry before reload
        contentCache.remove(contentId);

        try {
            // 1. Locate the encrypted blob (IPFS CID) from the ledger
            String assetJson = fabricClient.queryAsset(contentId);
            Map<String, String> asset = gson.fromJson(assetJson, STRING_MAP_TYPE);
            String cid = asset != null ? asset.getOrDefault("ipfsHash", "") : "";
            if (cid.isBlank()) {
                throw new ResourceNotFoundException("ASSET_NOT_FOUND", "Asset has no IPFS pointer: " + contentId);
            }

            // 2. Fetch encrypted bytes from IPFS
            byte[] encryptedBlob = ipfsService.cat(cid);

            // 3. Unwrap the per-asset key and decrypt server-side
            AssetEncryptionKeyEntity keyEntity = keyRepository.findById(contentId)
                    .orElseThrow(() -> new ResourceNotFoundException("KEY_NOT_FOUND",
                            "No decryption key for asset: " + contentId));
            byte[] assetKey = encryptionService.unwrapKey(keyEntity.getIv(), keyEntity.getEncryptedKey());
            byte[] decrypted = encryptionService.decrypt(encryptedBlob, assetKey);

            contentCache.put(contentId, new CachedContent(decrypted, System.currentTimeMillis()));
            logger.info("Loaded protected content {} ({} bytes) into service cache", contentId, decrypted.length);
            return decrypted;

        } catch (GeneralSecurityException e) {
            throw new RuntimeException("Content decryption failed", e);
        } catch (GatewayException e) {
            throw new FabricUnavailableException("Blockchain network unavailable", e);
        }
    }

    private long fetchFileSize(String contentId) {
        try {
            String assetJson = fabricClient.queryAsset(contentId);
            Map<String, String> asset = gson.fromJson(assetJson, STRING_MAP_TYPE);
            String size = asset != null ? asset.get("fileSizeBytes") : null;
            if (size == null || size.isBlank()) return 0;
            return Long.parseLong(size);
        } catch (GatewayException | NumberFormatException e) {
            return 0;
        }
    }

    /** In-process cache entry with idle-based eviction. */
    private static final class CachedContent {
        private final byte[] bytes;
        private volatile long lastAccess;

        CachedContent(byte[] bytes, long lastAccess) {
            this.bytes = bytes;
            this.lastAccess = lastAccess;
        }

        byte[] bytes()         { return bytes; }
        void touch()           { lastAccess = System.currentTimeMillis(); }
        boolean isIdle()       { return System.currentTimeMillis() - lastAccess > CACHE_IDLE_MS; }
    }
}