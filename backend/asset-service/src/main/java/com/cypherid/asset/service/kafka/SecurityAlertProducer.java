package com.cypherid.asset.service.kafka;

import com.google.gson.Gson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class SecurityAlertProducer {

    private static final Logger logger = LoggerFactory.getLogger(SecurityAlertProducer.class);

    @Autowired(required = false)
    private KafkaTemplate<String, String> kafkaTemplate;

    private final String topic;
    private final Gson gson = new Gson();

    public SecurityAlertProducer(@Value("${asset.kafka.security-alerts-topic:security-alerts}") String topic) {
        this.topic = topic;
    }

    public void publishSecurityAlert(String sessionId, String userDid, String eventType, String severity, String details) {
        if (kafkaTemplate == null) {
            logger.debug("Kafka unavailable, skipping security alert publish");
            return;
        }
        try {
            Map<String, Object> event = Map.of(
                    "eventType", eventType,
                    "sessionId", sessionId == null ? "" : sessionId,
                    "userDid", userDid == null ? "" : userDid,
                    "details", details == null ? "" : details
            );
            kafkaTemplate.send(topic, sessionId, gson.toJson(event));
        } catch (Exception e) {
            logger.warn("Kafka publish failed (non-blocking): {}", e.getMessage());
        }
    }
}
