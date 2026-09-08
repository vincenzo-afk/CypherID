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
public class AssetEventProducer {

    private static final Logger logger = LoggerFactory.getLogger(AssetEventProducer.class);

    @Autowired(required = false)
    private KafkaTemplate<String, String> kafkaTemplate;

    private final String topic;
    private final Gson gson = new Gson();

    public AssetEventProducer(@Value("${asset.kafka.topic:asset-events}") String topic) {
        this.topic = topic;
    }

    public void publishAssetEvent(String eventType, String assetId, String ownerDid,
                                   String classification, String ipfsHash, String timestamp) {
        if (kafkaTemplate == null) {
            logger.debug("Kafka unavailable, skipping asset event publish");
            return;
        }
        try {
            Map<String, Object> event = Map.of(
                    "eventType", eventType,
                    "assetId", assetId == null ? "" : assetId,
                    "ownerDid", ownerDid == null ? "" : ownerDid,
                    "classification", classification == null ? "" : classification,
                    "ipfsHash", ipfsHash == null ? "" : ipfsHash,
                    "timestamp", timestamp == null ? "" : timestamp
            );
            kafkaTemplate.send(topic, assetId, gson.toJson(event));
        } catch (Exception e) {
            logger.warn("Kafka publish failed (non-blocking): {}", e.getMessage());
        }
    }
}
