package com.cypherid.audit.service.kafka;

import com.cypherid.audit.service.domain.AuditEventEntity;
import com.cypherid.audit.service.service.AuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * AuditEventConsumerTest — unit tests for translating Kafka payloads from
 * access-logs / security-alerts / protection-events into AuditService.ingest
 * calls (backend/audit-service/.../kafka/AuditEventConsumer.java).
 */
@ExtendWith(MockitoExtension.class)
class AuditEventConsumerTest {

    @Mock
    private AuditService auditService;

    private AuditEventConsumer consumer;

    @BeforeEach
    void setUp() {
        consumer = new AuditEventConsumer(auditService);
        lenient().when(auditService.ingest(anyString(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new AuditEventEntity());
    }

    @Test
    void onAccessLog_wellFormedPayload_ingestsAsAccessDecision() {
        String payload = "{\"did\":\"did:cypherid:user1\",\"resourceId\":\"DRDO-DOC-007\","
                + "\"action\":\"READ\",\"decision\":\"GRANTED\",\"reason\":\"ALL_POLICIES_SATISFIED\","
                + "\"txHash\":\"tx-abc\",\"timestamp\":\"2026-01-01T00:00:00Z\"}";

        consumer.onAccessLog(payload);

        verify(auditService).ingest(eq("ACCESS_DECISION"), eq("did:cypherid:user1"), eq("DRDO-DOC-007"),
                eq("READ"), eq("GRANTED"), eq("ALL_POLICIES_SATISFIED"), eq("tx-abc"),
                eq(Instant.parse("2026-01-01T00:00:00Z")), isNull());
    }

    @Test
    void onAccessLog_malformedJson_doesNotThrowOrIngest() {
        assertDoesNotThrow(() -> consumer.onAccessLog("not-valid-json{"));
        verifyNoInteractions(auditService);
    }

    @Test
    void onSecurityAlert_missingDecision_defaultsToInfo() {
        String payload = "{\"did\":\"did:cypherid:user1\",\"resourceId\":\"asset-1\",\"reason\":\"anomaly detected\"}";

        consumer.onSecurityAlert(payload);

        verify(auditService).ingest(eq("SECURITY_ALERT"), eq("did:cypherid:user1"), eq("asset-1"),
                isNull(), eq("INFO"), eq("anomaly detected"), isNull(), any(), isNull());
    }

    @Test
    void onProtectionEvent_missingTimestamp_stillIngestsWithNowFallback() {
        String payload = "{\"did\":\"did:cypherid:user1\",\"resourceId\":\"asset-2\",\"action\":\"SCREENSHOT_ATTEMPT\"}";

        consumer.onProtectionEvent(payload);

        verify(auditService).ingest(eq("PROTECTION_EVENT"), eq("did:cypherid:user1"), eq("asset-2"),
                eq("SCREENSHOT_ATTEMPT"), eq("INFO"), isNull(), isNull(), any(), isNull());
    }

    @Test
    void onSecurityAlert_unparseableTimestamp_fallsBackToNow() {
        String payload = "{\"did\":\"did:cypherid:user1\",\"timestamp\":\"not-a-real-date\"}";

        assertDoesNotThrow(() -> consumer.onSecurityAlert(payload));
        verify(auditService).ingest(eq("SECURITY_ALERT"), eq("did:cypherid:user1"), isNull(),
                isNull(), eq("INFO"), isNull(), isNull(), any(), isNull());
    }

    @Test
    void onAssetEvent_wellFormedPayload_ingestsAsAssetEvent() {
        String payload = "{\"did\":\"did:cypherid:owner1\",\"resourceId\":\"ASSET-1\","
                + "\"action\":\"ASSET_MINTED\",\"decision\":\"INFO\",\"reason\":\"classification=SECRET\","
                + "\"txHash\":\"tx-mint\",\"timestamp\":\"2026-01-01T00:00:00Z\"}";

        consumer.onAssetEvent(payload);

        verify(auditService).ingest(eq("ASSET_EVENT"), eq("did:cypherid:owner1"), eq("ASSET-1"),
                eq("ASSET_MINTED"), eq("INFO"), eq("classification=SECRET"), eq("tx-mint"),
                eq(Instant.parse("2026-01-01T00:00:00Z")), isNull());
    }

    @Test
    void onAccessLog_withEventId_passesEventIdThroughForDedup() {
        String payload = "{\"eventId\":\"evt-123\",\"did\":\"did:cypherid:user1\",\"resourceId\":\"DRDO-DOC-007\","
                + "\"action\":\"READ\",\"decision\":\"GRANTED\",\"timestamp\":\"2026-01-01T00:00:00Z\"}";

        consumer.onAccessLog(payload);

        verify(auditService).ingest(eq("ACCESS_DECISION"), eq("did:cypherid:user1"), eq("DRDO-DOC-007"),
                eq("READ"), eq("GRANTED"), isNull(), isNull(),
                eq(Instant.parse("2026-01-01T00:00:00Z")), eq("evt-123"));
    }
}
