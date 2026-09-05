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
 * topic (docs/backend/13_SECURITY_EVENT_SERVICE.md). Consumed by the Audit
 * dashboard and AI anomaly pipeline. Best-effort: Kafka outages must never
 * block event handling.
 */
@Component
public class SecurityAlertProducer {

    private static final Logger logger = LoggerFactory.getLogger(SecurityAlertProducer.class);

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final String topic;
    private final Gson gson = new Gson();

    public SecurityAlertProducer(KafkaTemplate<String, String> kafkaTemplate,
                                 @Value("${asset.kafka.security-alerts-topic:security-alerts}") String topic) {
        this.kafkaTemplate = kafkaTemplate;
        this.topic = topic;
    }

    /**
     * Publishes a security event (non-blocking, best-effort).
     */
    public void publishSecurityAlert(String sessionId, String userDid, String eventType,
                                     String severity, String timestamp) {
        try {
            Map<String, Object> event = Map.of(
                    "eventType", "SECURITY_ALERT",
                    "sessionId", sessionId == null ? "" : sessionId,
                    "userDid", userDid == null ? "" : userDid,
                    "securityEventType", eventType,
                    "severity", severity,
                    "timestamp", timestamp
            );
            kafkaTemplate.send(topic, sessionId, gson.toJson(event));
        } catch (Exception e) {
            logger.warn("Kafka publish failed (non-blocking): {}", e.getMessage());
        }
    }
}