package com.cypherid.asset.service.watermark;

import com.cypherid.asset.service.domain.ProtectedSessionEntity;
import com.cypherid.asset.service.domain.WatermarkEntity;
import com.cypherid.asset.service.repository.ProtectedSessionRepository;
import com.cypherid.asset.service.repository.WatermarkRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * WatermarkServiceTest — verifies watermark format
 * (docs/protection/watermark/02_SESSION_WATERMARK.md) and forensic lookup.
 */
@ExtendWith(MockitoExtension.class)
class WatermarkServiceTest {

    @Mock
    private WatermarkRepository watermarkRepository;

    @Mock
    private ProtectedSessionRepository sessionRepository;

    @Test
    void generate_producesDocumentedFormat() {
        WatermarkService service = new WatermarkService(watermarkRepository, sessionRepository);
        String sessionId = UUID.randomUUID().toString();

        SessionWatermark watermark = service.generate(sessionId, "did:cypherid:user1", "DRDO-DOC-007");

        assertEquals(sessionId.substring(0, 8).toUpperCase(), watermark.displayId());
        assertTrue(watermark.userDisplay().startsWith("U:"));
        assertEquals(6, watermark.userDisplay().length() - 2);
        assertEquals("DRDO-DOC-007", watermark.contentId());
        assertEquals(8, watermark.token().length());
        // Format: [DISPLAY] [USER] [CONTENT] [TIMESTAMP] [TOKEN]
        assertEquals(5, watermark.watermarkText().split(" ").length);

        ArgumentCaptor<WatermarkEntity> captor = ArgumentCaptor.forClass(WatermarkEntity.class);
        verify(watermarkRepository).save(captor.capture());
        assertEquals(watermark.displayId(), captor.getValue().getDisplayId());
        assertEquals(UUID.fromString(sessionId), captor.getValue().getSessionId());
    }

    @Test
    void lookup_resolvesUserDidFromSession() {
        WatermarkService service = new WatermarkService(watermarkRepository, sessionRepository);
        UUID sessionId = UUID.randomUUID();

        WatermarkEntity watermark = new WatermarkEntity();
        watermark.setId(UUID.randomUUID());
        watermark.setSessionId(sessionId);
        watermark.setDisplayId("A3F7B21C");
        watermark.setUserDisplay("U:4a3b2c");
        watermark.setContentId("DRDO-DOC-007");
        watermark.setTimestampLabel("20240101-1430");
        watermark.setRandomToken("X9K2M");

        ProtectedSessionEntity session = new ProtectedSessionEntity();
        session.setId(sessionId);
        session.setUserDid("did:cypherid:user1");

        when(watermarkRepository.findByDisplayId("A3F7B21C")).thenReturn(Optional.of(watermark));
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

        WatermarkService.WatermarkForensic forensic = service.lookup("A3F7B21C");

        assertEquals("A3F7B21C", forensic.displayId());
        assertEquals(sessionId, forensic.sessionId());
        assertEquals("did:cypherid:user1", forensic.userDid());
    }

    @Test
    void lookup_unknownDisplayId_throws() {
        WatermarkService service = new WatermarkService(watermarkRepository, sessionRepository);
        when(watermarkRepository.findByDisplayId(anyString())).thenReturn(Optional.empty());

        assertThrows(com.cypherid.asset.service.exception.ResourceNotFoundException.class,
                () -> service.lookup("NOPE1234"));
    }
}