package com.cypherid.access.service.kafka;

import com.google.gson.Gson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * AccessLogProducer — publishes access decisions to Kafka.
 * <p>
 * Consumed by the Audit service over Kafka. Publishing is best-effort: a Kafka outage
 * must never block the access decision itself.
 */
@Component
public class AccessLogProducer {

    private static final Logger logger = LoggerFactory.getLogger(AccessLogProducer.class);

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final String topic;
    private final Gson gson = new Gson();

    public AccessLogProducer(KafkaTemplate<String, String> kafkaTemplate,
                             @Value("${access.kafka.topic:access-logs}") String topic) {
        this.kafkaTemplate = kafkaTemplate;
        this.topic = topic;
    }

    /**
     * Publishes an access decision event (non-blocking, best-effort).
     */
    public void publishAccessLog(String did, String resourceId, String action,
                                 String decision, String reason, String timestamp) {
        try {
            Map<String, Object> event = Map.of(
                    "eventType", "ACCESS_LOG",
                    "did", did,
                    "resourceId", resourceId,
                    "action", action,
                    "decision", decision,
                    "reason", reason == null ? "" : reason,
                    "timestamp", timestamp
            );
            kafkaTemplate.send(topic, did, gson.toJson(event));
        } catch (Exception e) {
            logger.warn("Kafka publish failed (non-blocking): {}", e.getMessage());
        }
    }
}