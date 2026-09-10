package com.cypherid.identity.service.kafka;

import com.google.gson.Gson;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

/**
 * IdentityEventProducer — publishes DID lifecycle events (created / suspended
 * / revoked / role-assigned) to identity-events for the audit trail.
 * <p>
 * identity-service has depended on spring-kafka and had a producer config
 * (application.yml) since the beginning, but nothing ever actually called
 * KafkaTemplate.send — DID creation, suspension, revocation, and admin role
 * assignment were all invisible to the audit trail. Same bug family as the
 * asset-events gap (a service fully wired for Kafka but never publishing),
 * just for identity instead of assets.
 * <p>
 * Field names match the generic shape (did/resourceId/action/decision/
 * reason/txHash/eventId/timestamp) used by access-logs/security-alerts/
 * protection-events/asset-events so AuditEventConsumer can ingest all five
 * topics the same way. Publishing is best-effort: a Kafka outage must never
 * block an identity operation.
 */
@Component
public class IdentityEventProducer {

    private static final Logger logger = LoggerFactory.getLogger(IdentityEventProducer.class);

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final String topic;
    private final Gson gson = new Gson();

    public IdentityEventProducer(KafkaTemplate<String, String> kafkaTemplate,
                                 @Value("${identity.kafka.topic:identity-events}") String topic) {
        this.kafkaTemplate = kafkaTemplate;
        this.topic = topic;
    }

    /**
     * @param action DID_CREATED | DID_SUSPENDED | DID_REVOKED | ROLE_ASSIGNED
     * @param did    the subject DID (whose identity this event is about)
     * @param actorDid the admin/actor DID that performed the action, if any
     *                 (null for self-service registration)
     */
    public void publishIdentityEvent(String action, String did, String actorDid,
                                     String reason, String txHash, String timestamp) {
        try {
            Map<String, Object> event = Map.of(
                    "eventId", UUID.randomUUID().toString(),
                    "did", did == null ? "" : did,
                    "resourceId", did == null ? "" : did,
                    "action", action,
                    "decision", "INFO",
                    "reason", buildReason(actorDid, reason),
                    "txHash", txHash == null ? "" : txHash,
                    "timestamp", timestamp
            );
            kafkaTemplate.send(topic, did, gson.toJson(event));
        } catch (Exception e) {
            logger.warn("Kafka publish failed (non-blocking): {}", e.getMessage());
        }
    }

    private static String buildReason(String actorDid, String reason) {
        StringBuilder sb = new StringBuilder();
        if (actorDid != null && !actorDid.isBlank()) sb.append("actor=").append(actorDid);
        if (reason != null && !reason.isBlank()) sb.append(sb.length() > 0 ? " " : "").append("reason=").append(reason);
        return sb.toString();
    }
}
