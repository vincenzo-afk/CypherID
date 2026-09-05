package com.cypherid.asset.service.session;

import com.cypherid.asset.service.config.ProtectionConfigurationService;
import com.cypherid.asset.service.dto.IssueSessionResponse;
import com.cypherid.asset.service.fabric.FabricAssetClient;
import com.cypherid.asset.service.repository.ProtectedSessionRepository;
import com.cypherid.asset.service.watermark.SessionWatermark;
import com.cypherid.asset.service.watermark.WatermarkService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.*;

/**
 * ProtectedSessionServiceTest — verifies session issuance (profile from
 * classification, watermark, Redis + PostgreSQL persistence, token) and
 * validation with a Redis hit.
 */
@ExtendWith(MockitoExtension.class)
class ProtectedSessionServiceTest {

    @Mock
    private StringRedisTemplate redis;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private ProtectedSessionRepository sessionRepository;

    @Mock
    private SessionTokenService tokenService;

    @Mock
    private WatermarkService watermarkService;

    @Mock
    private FabricAssetClient fabricClient;

    private ProtectedSessionService service;

    @BeforeEach
    void setUp() throws Exception {
        when(redis.opsForValue()).thenReturn(valueOperations);
        ProtectionConfigurationService config = new ProtectionConfigurationService(65536, 120, 5);
        service = new ProtectedSessionService(redis, sessionRepository, tokenService,
                watermarkService, config, fabricClient);
    }

    @Test
    void issueSession_secretClassification_highProfile() throws Exception {
        // SECRET → HIGH profile (20 min TTL per docs/protection/profiles/03_HIGH_PROFILE.md)
        when(fabricClient.queryAsset("ASSET-1")).thenReturn(
                "{\"assetId\":\"ASSET-1\",\"ipfsHash\":\"Qm1\",\"classification\":\"SECRET\"}");
        SessionWatermark watermark = new SessionWatermark(UUID.randomUUID(),
                "A3F7B21C", "U:4a3b2c", "ASSET-1", "20240101-1430", "X9K2M");
        when(watermarkService.generate(anyString(), eq("did:cypherid:user1"), eq("ASSET-1")))
                .thenReturn(watermark);
        when(tokenService.issue(anyString(), eq("did:cypherid:user1"), eq("ASSET-1"),
                eq("DOCUMENT"), eq("HIGH"), any(Instant.class))).thenReturn("session-token-xyz");

        IssueSessionResponse response = service.issueSession("did:cypherid:user1", "ASSET-1", "DOCUMENT");

        assertNotNull(response.sessionId());
        assertEquals("session-token-xyz", response.sessionToken());
        assertEquals(SessionStateMachine.STATE_AUTHORIZED, response.state());
        assertEquals("A3F7B21C", response.watermark().displayId());
        assertNotNull(response.expiresAt());

        verify(sessionRepository).save(any());
        verify(valueOperations).set(startsWith("session:"), anyString(), any());
    }

    @Test
    void getState_redisHit_returnsState() {
        String sessionId = UUID.randomUUID().toString();
        String json = "{\"sessionId\":\"" + sessionId + "\",\"userDID\":\"did:cypherid:user1\"," +
                "\"contentId\":\"ASSET-1\",\"contentType\":\"DOCUMENT\",\"profile\":\"HIGH\"," +
                "\"state\":\"PROTECTED_VIEW\",\"chunkCount\":2,\"suspiciousEventCount\":0," +
                "\"expiresAt\":\"" + Instant.now().plusSeconds(600) + "\"}";
        when(valueOperations.get("session:" + sessionId)).thenReturn(json);

        SessionState state = service.getState(sessionId);

        assertEquals(sessionId, state.sessionId());
        assertEquals("PROTECTED_VIEW", state.state());
        assertEquals("HIGH", state.profile());
        assertEquals(2, state.chunkCount());
    }

    @Test
    void getState_expiredSession_throws() {
        String sessionId = UUID.randomUUID().toString();
        String json = "{\"sessionId\":\"" + sessionId + "\",\"userDID\":\"did:cypherid:user1\"," +
                "\"contentId\":\"ASSET-1\",\"contentType\":\"DOCUMENT\",\"profile\":\"HIGH\"," +
                "\"state\":\"PROTECTED_VIEW\",\"chunkCount\":0,\"suspiciousEventCount\":0," +
                "\"expiresAt\":\"" + Instant.now().minusSeconds(60) + "\"}";
        when(valueOperations.get("session:" + sessionId)).thenReturn(json);

        assertThrows(com.cypherid.asset.service.exception.InvalidSessionException.class,
                () -> service.getState(sessionId));
    }
}