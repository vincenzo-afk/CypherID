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
     */
    public AuditEventEntity ingest(String eventType, String did, String resourceId,
                                  String action, String decision, String reason,
                                  String txHash, Instant eventTime) {
        AuditEventEntity entity = new AuditEventEntity();
        entity.setEventType(eventType);
        entity.setDid(did);
        entity.setResourceId(resourceId);
        entity.setAction(action);
        entity.setDecision(decision);
        entity.setReason(reason);
        entity.setTxHash(txHash);
        entity.setEventTime(eventTime != null ? eventTime : Instant.now());
        AuditEventEntity saved = repository.save(entity);

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
