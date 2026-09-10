package com.cypherid.audit.service.service;

import com.cypherid.audit.service.domain.AuditEventEntity;
import com.cypherid.audit.service.repository.AuditEventRepository;
import com.cypherid.audit.service.websocket.AuditWebSocketHandler;
import com.google.gson.Gson;
import java.time.Instant;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * AuditService — query orchestration + event ingestion
 * (docs/backend/06_AUDIT_SERVICE.md).
 */
@Service
@Transactional
public class AuditService {

    private static final Logger logger = LoggerFactory.getLogger(AuditService.class);

    private final AuditEventRepository repository;
    private final AuditWebSocketHandler webSocketHandler;
    private final Gson gson = new Gson();

    public AuditService(AuditEventRepository repository, AuditWebSocketHandler webSocketHandler) {
        this.repository = repository;
        this.webSocketHandler = webSocketHandler;
    }

    @Transactional(readOnly = true)
    public Page<AuditEventEntity> queryLogs(String did, String resourceId, String decision,
                                           String eventType, Instant from, Instant to,
                                           Pageable pageable) {
        return repository.search(
                blankToNull(did), blankToNull(resourceId), blankToNull(decision),
                blankToNull(eventType), from, to, pageable);
    }

    /**
     * Persists an ingested event and pushes it to WebSocket subscribers.
     * Delegates to the deduplicating overload with no dedup key (always
     * inserts) — kept for any caller that doesn't have a sourceEventId yet.
     */
    public AuditEventEntity ingest(String eventType, String did, String resourceId,
                                  String action, String decision, String reason,
                                  String txHash, Instant eventTime) {
        return ingest(eventType, did, resourceId, action, decision, reason, txHash, eventTime, null);
    }

    /**
     * Same as above, but deduplicates on sourceEventId first. Kafka delivery
     * here is at-least-once (no producer idempotence / transactional
     * semantics configured), so a rebalance or consumer retry WILL redeliver
     * a message — without this check, every redelivery became a second
     * audit row. A unique DB constraint (V2__Source_Event_Dedup.sql) backs
     * this up in case of a race between the check and the insert.
     */
    public AuditEventEntity ingest(String eventType, String did, String resourceId,
                                  String action, String decision, String reason,
                                  String txHash, Instant eventTime, String sourceEventId) {
        if (sourceEventId != null && !sourceEventId.isBlank()) {
            var existing = repository.findBySourceEventId(sourceEventId);
            if (existing.isPresent()) {
                logger.debug("Duplicate delivery ignored: sourceEventId={}", sourceEventId);
                return existing.get();
            }
        }

        AuditEventEntity entity = new AuditEventEntity();
        entity.setEventType(eventType);
        entity.setDid(did);
        entity.setResourceId(resourceId);
        entity.setAction(action);
        entity.setDecision(decision);
        entity.setReason(reason);
        entity.setTxHash(txHash);
        entity.setSourceEventId(sourceEventId == null || sourceEventId.isBlank() ? null : sourceEventId);
        entity.setEventTime(eventTime != null ? eventTime : Instant.now());

        AuditEventEntity saved;
        try {
            saved = repository.save(entity);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // Lost a race with another delivery of the same event between the
            // check above and this insert — fetch and return what actually won.
            saved = repository.findBySourceEventId(sourceEventId)
                    .orElseThrow(() -> e);
            logger.debug("Duplicate delivery raced the unique constraint: sourceEventId={}", sourceEventId);
            return saved;
        }

        // Best-effort realtime push (never fails ingestion)
        try {
            webSocketHandler.broadcast(gson.toJson(Map.of(
                    "id", saved.getId().toString(),
                    "eventType", nullToEmpty(eventType),
                    "did", nullToEmpty(did),
                    "resourceId", nullToEmpty(resourceId),
                    "decision", nullToEmpty(decision),
                    "txHash", nullToEmpty(txHash),
                    "eventTime", saved.getEventTime().toString())));
        } catch (Exception e) {
            logger.debug("WebSocket broadcast failed: {}", e.getMessage());
        }
        return saved;
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }
}
