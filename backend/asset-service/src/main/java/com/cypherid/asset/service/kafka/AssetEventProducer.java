package com.cypherid.asset.service.kafka;

import com.google.gson.Gson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * AssetEventProducer — publishes asset lifecycle events (mint/transfer/burn)
 * to the asset-events Kafka topic for the Audit and AI pipelines.
 * Publishing is best-effort: a Kafka outage must never block asset operations.
 * <p>
 * Field names match the generic access-log/security-alert/protection-event
 * shape (did/resourceId/action/decision/reason/txHash/timestamp) so
 * AuditEventConsumer can ingest all four topics the same way.
 */
@Component
public class AssetEventProducer {

    private static final Logger logger = LoggerFactory.getLogger(AssetEventProducer.class);

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final String topic;
    private final Gson gson = new Gson();

    public AssetEventProducer(KafkaTemplate<String, String> kafkaTemplate,
                              @Value("${asset.kafka.topic:asset-events}") String topic) {
        this.kafkaTemplate = kafkaTemplate;
        this.topic = topic;
    }

    /**
     * Publishes an asset lifecycle event (non-blocking, best-effort).
     *
     * @param eventType ASSET_MINTED | ASSET_TRANSFERRED | ASSET_BURNED
     * @param txHash    the on-chain transaction ID for this operation, if
     *                  available — this is arguably the single most
     *                  important field for a blockchain audit trail, so
     *                  callers should pass it whenever they have it.
     */
    public void publishAssetEvent(String eventType, String assetId, String ownerDid,
                                  String classification, String ipfsHash, String txHash,
                                  String timestamp) {
        try {
            StringBuilder reason = new StringBuilder();
            if (classification != null && !classification.isBlank()) reason.append("classification=").append(classification);
            if (ipfsHash != null && !ipfsHash.isBlank()) reason.append(reason.length() > 0 ? " " : "").append("ipfsHash=").append(ipfsHash);

            Map<String, Object> event = Map.of(
                    "eventId", java.util.UUID.randomUUID().toString(),
                    "did", ownerDid == null ? "" : ownerDid,
                    "resourceId", assetId == null ? "" : assetId,
                    "action", eventType,
                    "decision", "INFO",
                    "reason", reason.toString(),
                    "txHash", txHash == null ? "" : txHash,
                    "timestamp", timestamp
            );
            kafkaTemplate.send(topic, assetId, gson.toJson(event));
        } catch (Exception e) {
            logger.warn("Kafka publish failed (non-blocking): {}", e.getMessage());
        }
    }
}