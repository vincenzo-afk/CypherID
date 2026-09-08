package com.cypherid.audit.service.kafka;

import com.cypherid.audit.service.service.AuditService;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@Profile("!demo")
public class AuditEventConsumer {

    private static final Logger logger = LoggerFactory.getLogger(AuditEventConsumer.class);

    private final AuditService auditService;
    private final Gson gson = new Gson();

    public AuditEventConsumer(AuditService auditService) {
        this.auditService = auditService;
    }

    @KafkaListener(topics = "access-logs", groupId = "audit-service")
    public void onAccessLog(String message) {
        logger.debug("Received access-log event: {}", message);
        try {
            JsonObject json = JsonParser.parseString(message).getAsJsonObject();
            String did = json.has("did") ? json.get("did").getAsString() : null;
            String resourceId = json.has("resourceId") ? json.get("resourceId").getAsString() : null;
            String action = json.has("action") ? json.get("action").getAsString() : null;
            String decision = json.has("decision") ? json.get("decision").getAsString() : null;
            String reason = json.has("reason") ? json.get("reason").getAsString() : null;
            String txHash = json.has("txHash") ? json.get("txHash").getAsString() : null;
            Instant timestamp = json.has("timestamp") ? Instant.parse(json.get("timestamp").getAsString()) : Instant.now();
            auditService.ingest("ACCESS_DECISION", did, resourceId, action, decision, reason, txHash, timestamp);
        } catch (Exception e) {
            logger.warn("Failed to parse access-log payload: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "security-alerts", groupId = "audit-service")
    public void onSecurityAlert(String message) {
        logger.debug("Received security-alert event: {}", message);
        try {
            JsonObject json = JsonParser.parseString(message).getAsJsonObject();
            String did = json.has("did") ? json.get("did").getAsString() : null;
            String resourceId = json.has("resourceId") ? json.get("resourceId").getAsString() : null;
            String reason = json.has("reason") ? json.get("reason").getAsString() : null;
            Instant timestamp = json.has("timestamp") ? parseTimestamp(json.get("timestamp").getAsString()) : Instant.now();
            auditService.ingest("SECURITY_ALERT", did, resourceId, null, "INFO", reason, null, timestamp);
        } catch (Exception e) {
            logger.warn("Failed to parse security-alert payload: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "protection-events", groupId = "audit-service")
    public void onProtectionEvent(String message) {
        logger.debug("Received protection-event: {}", message);
        try {
            JsonObject json = JsonParser.parseString(message).getAsJsonObject();
            String did = json.has("did") ? json.get("did").getAsString() : null;
            String resourceId = json.has("resourceId") ? json.get("resourceId").getAsString() : null;
            String action = json.has("action") ? json.get("action").getAsString() : null;
            Instant timestamp = json.has("timestamp") ? Instant.parse(json.get("timestamp").getAsString()) : Instant.now();
            auditService.ingest("PROTECTION_EVENT", did, resourceId, action, "INFO", null, null, timestamp);
        } catch (Exception e) {
            logger.warn("Failed to parse protection-event payload: {}", e.getMessage());
        }
    }

    private Instant parseTimestamp(String ts) {
        try {
            return Instant.parse(ts);
        } catch (Exception e) {
            return Instant.now();
        }
    }
}
