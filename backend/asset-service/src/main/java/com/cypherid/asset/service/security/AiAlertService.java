package com.cypherid.asset.service.security;

import com.cypherid.asset.service.domain.AiAnomalyAlertEntity;
import com.cypherid.asset.service.domain.SecurityEventEntity;
import com.cypherid.asset.service.dto.AiAlertRequest;
import com.cypherid.asset.service.dto.MessageResponse;
import com.cypherid.asset.service.kafka.SecurityAlertProducer;
import com.cypherid.asset.service.repository.AiAnomalyAlertRepository;
import com.cypherid.asset.service.repository.SecurityEventRepository;
import com.google.gson.Gson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * AiAlertService — receives anomaly alerts from the Python AI service
 * (docs/ai/01_AI_ARCHITECTURE.md, docs/ai/08_ALERT_PIPELINE.md).
 * <p>
 * POST /api/security/ai-alert → persist ai_anomaly_alerts record, raise an
 * AI_ANOMALY (HIGH) security event, and publish to security-alerts Kafka.
 * <p>
 * NOTE: docs/backend/13 and docs/ai mention writing HIGH alerts on-chain as
 * SecurityAlert. No chaincode transaction for it exists yet (docs/ai/09 is
 * undefined), so on-chain writing is intentionally deferred rather than invented.
 */
@Service
@Transactional
public class AiAlertService {

    private static final Logger logger = LoggerFactory.getLogger(AiAlertService.class);

    private final AiAnomalyAlertRepository alertRepository;
    private final SecurityEventRepository securityEventRepository;
    private final SecurityAlertProducer alertProducer;
    private final Gson gson = new Gson();

    public AiAlertService(AiAnomalyAlertRepository alertRepository,
                          SecurityEventRepository securityEventRepository,
                          SecurityAlertProducer alertProducer) {
        this.alertRepository = alertRepository;
        this.securityEventRepository = securityEventRepository;
        this.alertProducer = alertProducer;
    }

    /**
     * Records an AI anomaly alert.
     */
    public MessageResponse recordAlert(AiAlertRequest request) {
        String timestamp = Instant.now().toString();

        // 1. Persist the anomaly alert
        AiAnomalyAlertEntity alert = new AiAnomalyAlertEntity();
        alert.setUserDid(request.did());
        alert.setAnomalyScore(BigDecimal.valueOf(request.anomalyScore()));
        alert.setFeatures(gson.toJson(request.features() != null ? request.features() : Map.of()));
        alert.setPatternDescription(request.patternDescription());
        alertRepository.save(alert);

        // 2. Raise an AI_ANOMALY security event (severity HIGH per docs/backend/13)
        Map<String, Object> eventData = new LinkedHashMap<>();
        eventData.put("anomalyScore", request.anomalyScore());
        eventData.put("patternDescription", request.patternDescription() != null
                ? request.patternDescription() : "");

        SecurityEventEntity event = new SecurityEventEntity();
        event.setUserDid(request.did());
        event.setEventType("AI_ANOMALY");
        event.setEventData(gson.toJson(eventData));
        event.setSeverity("HIGH");
        securityEventRepository.save(event);

        // 3. Publish to security-alerts Kafka (best-effort)
        alertProducer.publishSecurityAlert(null, request.did(), "AI_ANOMALY", "HIGH", timestamp);

        logger.warn("AI anomaly alert recorded for {} (score={})",
                request.did(), request.anomalyScore());

        return new MessageResponse("AI anomaly alert recorded");
    }
}