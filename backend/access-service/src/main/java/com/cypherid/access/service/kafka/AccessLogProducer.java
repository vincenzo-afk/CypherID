package com.cypherid.access.service.kafka;

import com.google.gson.Gson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class AccessLogProducer {

    private static final Logger logger = LoggerFactory.getLogger(AccessLogProducer.class);

    @Autowired(required = false)
    private KafkaTemplate<String, String> kafkaTemplate;

    private final String topic;
    private final Gson gson = new Gson();

    public AccessLogProducer(@Value("${access.kafka.topic:access-logs}") String topic) {
        this.topic = topic;
    }

    public void publishAccessLog(String did, String resourceId, String action,
                                 String decision, String reason, String timestamp) {
        if (kafkaTemplate == null) {
            logger.debug("Kafka unavailable, skipping access log publish");
            return;
        }
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
