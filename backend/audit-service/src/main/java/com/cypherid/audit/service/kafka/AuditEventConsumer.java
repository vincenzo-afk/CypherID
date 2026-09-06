package com.cypherid.audit.service.kafka;

import com.cypherid.audit.service.service.AuditService;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.lang.reflect.Type;
import java.time.Instant;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * AuditEventConsumer — consumes access-logs, security-alerts,
 * protection-events (and identity/asset events) into the audit store.
 */
@Component
public class AuditEventConsumer {

    private static final Logger logger = LoggerFactory.getLogger(AuditEventConsumer.class);
    private static final Type MAP_TYPE = new TypeToken<Map<String, String>>() {}.getType();

    private final AuditService auditService;
    private final Gson gson = new Gson();

    public AuditEventConsumer(AuditService auditService) {
        this.auditService = auditService;
    }

    @KafkaListener(topics = "access-logs", groupId = "audit-service")
    public void onAccessLog(String payload) {
        try {
            Map<String, String> m = gson.fromJson(payload, MAP_TYPE);
            auditService.ingest("ACCESS_DECISION",
                    m.get("did"), m.get("resourceId"), m.get("action"),
                    m.get("decision"), m.get("reason"), m.get("txHash"),
                    parseTime(m.get("timestamp")));
        } catch (Exception e) {
            logger.warn("Failed to ingest access-log: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "security-alerts", groupId = "audit-service")
    public void onSecurityAlert(String payload) {
        try {
            Map<String, String> m = gson.fromJson(payload, MAP_TYPE);
            auditService.ingest("SECURITY_ALERT",
                    m.get("did"), m.get("resourceId"), m.get("action"),
                    m.getOrDefault("decision", "INFO"), m.get("reason"),
                    m.get("txHash"), parseTime(m.get("timestamp")));
        } catch (Exception e) {
            logger.warn("Failed to ingest security-alert: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "protection-events", groupId = "audit-service")
    public void onProtectionEvent(String payload) {
        try {
            Map<String, String> m = gson.fromJson(payload, MAP_TYPE);
            auditService.ingest("PROTECTION_EVENT",
                    m.get("did"), m.get("resourceId"), m.get("action"),
                    m.getOrDefault("decision", "INFO"), m.get("reason"),
                    m.get("txHash"), parseTime(m.get("timestamp")));
        } catch (Exception e) {
            logger.warn("Failed to ingest protection-event: {}", e.getMessage());
        }
    }

    private static Instant parseTime(String s) {
        if (s == null || s.isBlank()) {
            return Instant.now();
        }
        try {
            return Instant.parse(s);
        } catch (Exception e) {
            return Instant.now();
        }
    }
}
