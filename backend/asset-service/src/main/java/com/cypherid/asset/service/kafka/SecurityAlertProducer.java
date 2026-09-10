package com.cypherid.asset.service.kafka;

import com.google.gson.Gson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * SecurityAlertProducer — publishes security alerts to the security-alerts
 * topic, and every protected-session security event (any severity) to the
 * protection-events topic (docs/backend/13_SECURITY_EVENT_SERVICE.md).
 * Consumed by the Audit dashboard. Best-effort: Kafka outages must never
 * block event handling.
 */
@Component
public class SecurityAlertProducer {

    private static final Logger logger = LoggerFactory.getLogger(SecurityAlertProducer.class);

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final String alertsTopic;
    private final String protectionEventsTopic;
    private final Gson gson = new Gson();

    public SecurityAlertProducer(KafkaTemplate<String, String> kafkaTemplate,
                                 @Value("${asset.kafka.security-alerts-topic:security-alerts}") String alertsTopic,
                                 @Value("${asset.kafka.protection-events-topic:protection-events}") String protectionEventsTopic) {
        this.kafkaTemplate = kafkaTemplate;
        this.alertsTopic = alertsTopic;
        this.protectionEventsTopic = protectionEventsTopic;
    }

    /**
     * Publishes a HIGH/CRITICAL security event to security-alerts (non-blocking,
     * best-effort).
     * <p>
     * Field names here MUST match what AuditEventConsumer#onSecurityAlert
     * reads (did/resourceId/action/decision/reason/timestamp) — it ingests a
     * generic access-log-shaped event for every topic it listens on. This
     * previously sent userDid/securityEventType/severity, none of which the
     * consumer reads, so every security alert landed in the audit trail with
     * did=null, action=null, and severity silently discarded.
     */
    public void publishSecurityAlert(String sessionId, String userDid, String eventType,
                                     String severity, String timestamp) {
        send(alertsTopic, sessionId, userDid, eventType, severity, timestamp);
    }

    /**
     * Publishes EVERY protected-session security event (any severity) to
     * protection-events, so the audit trail reflects the full session
     * history, not just the HIGH/CRITICAL ones that also page as alerts.
     * <p>
     * Before this existed, audit-service's {@code @KafkaListener(topics =
     * "protection-events")} had no producer anywhere in the codebase — the
     * listener was permanently idle and LOW/MEDIUM events (tab-hidden,
     * fullscreen-exit, session-obscured, print-dialog, ...) never reached
     * the audit trail at all, only ever landing in asset-service's own local
     * table.
     */
    public void publishProtectionEvent(String sessionId, String userDid, String eventType,
                                       String severity, String timestamp) {
        send(protectionEventsTopic, sessionId, userDid, eventType, severity, timestamp);
    }

    private void send(String topic, String sessionId, String userDid, String eventType,
                      String severity, String timestamp) {
        try {
            Map<String, Object> event = Map.of(
                    "eventId", java.util.UUID.randomUUID().toString(),
                    "did", userDid == null ? "" : userDid,
                    "resourceId", sessionId == null ? "" : sessionId,
                    "action", eventType == null ? "" : eventType,
                    "decision", severity == null ? "INFO" : severity,
                    "reason", "PROTECTED_CONTENT_SECURITY_EVENT",
                    "timestamp", timestamp
            );
            kafkaTemplate.send(topic, sessionId, gson.toJson(event));
        } catch (Exception e) {
            logger.warn("Kafka publish failed (non-blocking): {}", e.getMessage());
        }
    }
}