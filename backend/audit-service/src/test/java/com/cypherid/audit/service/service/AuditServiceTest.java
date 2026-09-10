package com.cypherid.audit.service.service;

import com.cypherid.audit.service.domain.AuditEventEntity;
import com.cypherid.audit.service.repository.AuditEventRepository;
import com.cypherid.audit.service.websocket.AuditWebSocketHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * AuditServiceTest — unit tests for query delegation and event ingestion
 * (backend/audit-service/.../service/AuditService.java).
 */
@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock
    private AuditEventRepository repository;

    @Mock
    private AuditWebSocketHandler webSocketHandler;

    private AuditService service;

    @BeforeEach
    void setUp() {
        service = new AuditService(repository, webSocketHandler);
    }

    @Test
    void queryLogs_blankFilters_convertedToNullBeforeRepositoryCall() {
        Pageable pageable = Pageable.ofSize(20);
        when(repository.search(isNull(), isNull(), eq("GRANTED"), isNull(), any(), any(), eq(pageable)))
                .thenReturn(new PageImpl<>(java.util.List.of()));

        service.queryLogs("", "  ", "GRANTED", "", null, null, pageable);

        verify(repository).search(isNull(), isNull(), eq("GRANTED"), isNull(), isNull(), isNull(), eq(pageable));
    }

    @Test
    void queryLogs_returnsRepositoryPageUnchanged() {
        Pageable pageable = Pageable.ofSize(20);
        AuditEventEntity entity = new AuditEventEntity();
        entity.setDid("did:cypherid:user1");
        Page<AuditEventEntity> page = new PageImpl<>(java.util.List.of(entity));
        when(repository.search(any(), any(), any(), any(), any(), any(), eq(pageable))).thenReturn(page);

        Page<AuditEventEntity> result = service.queryLogs("did:cypherid:user1", null, null, null, null, null, pageable);

        assertEquals(1, result.getTotalElements());
        assertEquals("did:cypherid:user1", result.getContent().get(0).getDid());
    }

    @Test
    void ingest_persistsEntityWithAllFields() {
        when(repository.save(any(AuditEventEntity.class))).thenAnswer(inv -> {
            AuditEventEntity e = inv.getArgument(0);
            // simulate DB-assigned id, since UUID id has no generator invoked outside JPA
            return e;
        });

        Instant eventTime = Instant.parse("2026-01-01T00:00:00Z");
        AuditEventEntity saved = service.ingest("ACCESS_DECISION", "did:cypherid:user1", "DRDO-DOC-007",
                "READ", "GRANTED", "ALL_POLICIES_SATISFIED", "tx-abc", eventTime);

        assertEquals("ACCESS_DECISION", saved.getEventType());
        assertEquals("did:cypherid:user1", saved.getDid());
        assertEquals("DRDO-DOC-007", saved.getResourceId());
        assertEquals("READ", saved.getAction());
        assertEquals("GRANTED", saved.getDecision());
        assertEquals("tx-abc", saved.getTxHash());
        assertEquals(eventTime, saved.getEventTime());
        verify(repository).save(any(AuditEventEntity.class));
    }

    @Test
    void ingest_nullEventTime_defaultsToNow() {
        when(repository.save(any(AuditEventEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        Instant before = Instant.now();
        AuditEventEntity saved = service.ingest("SECURITY_ALERT", "did:cypherid:user1", null,
                null, "INFO", null, null, null);
        Instant after = Instant.now();

        assertNotNull(saved.getEventTime());
        assertFalse(saved.getEventTime().isBefore(before));
        assertFalse(saved.getEventTime().isAfter(after));
    }

    @Test
    void ingest_broadcastFailure_doesNotFailIngestion() {
        when(repository.save(any(AuditEventEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().doThrow(new RuntimeException("no active sessions")).when(webSocketHandler).broadcast(anyString());

        assertDoesNotThrow(() -> service.ingest("PROTECTION_EVENT", "did:cypherid:user1", "asset-1",
                "VIEW", "INFO", null, null, Instant.now()));
        verify(repository).save(any(AuditEventEntity.class));
    }

    // ─── dedup (Kafka at-least-once redelivery) ────────────────────────────

    @Test
    void ingest_duplicateSourceEventId_returnsExistingRowWithoutSaving() {
        AuditEventEntity existing = new AuditEventEntity();
        existing.setSourceEventId("evt-123");
        when(repository.findBySourceEventId("evt-123")).thenReturn(java.util.Optional.of(existing));

        AuditEventEntity result = service.ingest("ACCESS_DECISION", "did:cypherid:user1", "DRDO-DOC-007",
                "READ", "GRANTED", null, null, Instant.now(), "evt-123");

        assertSame(existing, result);
        verify(repository, never()).save(any());
    }

    @Test
    void ingest_newSourceEventId_savesWithSourceEventIdSet() {
        when(repository.findBySourceEventId("evt-456")).thenReturn(java.util.Optional.empty());
        when(repository.save(any(AuditEventEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        AuditEventEntity saved = service.ingest("ACCESS_DECISION", "did:cypherid:user1", "DRDO-DOC-007",
                "READ", "GRANTED", null, null, Instant.now(), "evt-456");

        assertEquals("evt-456", saved.getSourceEventId());
        verify(repository).save(any(AuditEventEntity.class));
    }

    @Test
    void ingest_raceOnUniqueConstraint_returnsWinnerInsteadOfThrowing() {
        AuditEventEntity winner = new AuditEventEntity();
        winner.setSourceEventId("evt-race");
        when(repository.findBySourceEventId("evt-race"))
                .thenReturn(java.util.Optional.empty())   // pre-check: not there yet
                .thenReturn(java.util.Optional.of(winner)); // after losing the race: it exists now
        when(repository.save(any(AuditEventEntity.class)))
                .thenThrow(new org.springframework.dao.DataIntegrityViolationException("duplicate key"));

        AuditEventEntity result = service.ingest("ACCESS_DECISION", "did:cypherid:user1", "DRDO-DOC-007",
                "READ", "GRANTED", null, null, Instant.now(), "evt-race");

        assertSame(winner, result);
    }

    @Test
    void ingest_blankSourceEventId_treatedAsNoDedupKey() {
        when(repository.save(any(AuditEventEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        AuditEventEntity saved = service.ingest("ACCESS_DECISION", "did:cypherid:user1", "DRDO-DOC-007",
                "READ", "GRANTED", null, null, Instant.now(), "  ");

        assertNull(saved.getSourceEventId());
        verify(repository, never()).findBySourceEventId(anyString());
    }
}
