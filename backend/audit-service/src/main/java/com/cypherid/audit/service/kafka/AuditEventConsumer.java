package com.cypherid.audit.service.kafka;

import com.cypherid.audit.service.service.AuditService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * AuditEventConsumer — consumes access logs, security alerts, and protection events from Kafka.
 * Disabled in demo profile (no Kafka available).
 */
@Component
@Profile("!demo")
public class AuditEventConsumer {

    private static final Logger logger = LoggerFactory.getLogger(AuditEventConsumer.class);

    private final AuditService auditService;

    public AuditEventConsumer(AuditService auditService) {
        this.auditService = auditService;
    }

    @KafkaListener(topics = "access-logs", groupId = "audit-service")
    public void consumeAccessLog(String message) {
        logger.debug("Received access-log event: {}", message);
        auditService.ingest("ACCESS_LOG", null, null, null, null, message, null, null);
    }

    @KafkaListener(topics = "security-alerts", groupId = "audit-service")
    public void consumeSecurityAlert(String message) {
        logger.debug("Received security-alert event: {}", message);
        auditService.ingest("SECURITY_ALERT", null, null, null, null, message, null, null);
    }

    @KafkaListener(topics = "protection-events", groupId = "audit-service")
    public void consumeProtectionEvent(String message) {
        logger.debug("Received protection-event: {}", message);
        auditService.ingest("PROTECTION_EVENT", null, null, null, null, message, null, null);
    }
}
