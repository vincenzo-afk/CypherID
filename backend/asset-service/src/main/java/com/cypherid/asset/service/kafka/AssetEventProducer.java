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
     */
    public void publishAssetEvent(String eventType, String assetId, String ownerDid,
                                  String classification, String ipfsHash, String timestamp) {
        try {
            Map<String, Object> event = Map.of(
                    "eventType", eventType,
                    "assetId", assetId,
                    "ownerDid", ownerDid,
                    "classification", classification == null ? "" : classification,
                    "ipfsHash", ipfsHash == null ? "" : ipfsHash,
                    "timestamp", timestamp
            );
            kafkaTemplate.send(topic, assetId, gson.toJson(event));
        } catch (Exception e) {
            logger.warn("Kafka publish failed (non-blocking): {}", e.getMessage());
        }
    }
}