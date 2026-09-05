package com.cypherid.asset.service.security;

import com.cypherid.asset.service.domain.AiAnomalyAlertEntity;
import com.cypherid.asset.service.domain.SecurityEventEntity;
import com.cypherid.asset.service.dto.AiAlertRequest;
import com.cypherid.asset.service.dto.MessageResponse;
import com.cypherid.asset.service.kafka.SecurityAlertProducer;
import com.cypherid.asset.service.repository.AiAnomalyAlertRepository;
import com.cypherid.asset.service.repository.SecurityEventRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

/**
 * AiAlertServiceTest — verifies that an AI anomaly alert is persisted,
 * raises an AI_ANOMALY security event, and publishes to Kafka.
 */
@ExtendWith(MockitoExtension.class)
class AiAlertServiceTest {

    @Mock
    private AiAnomalyAlertRepository alertRepository;

    @Mock
    private SecurityEventRepository securityEventRepository;

    @Mock
    private SecurityAlertProducer alertProducer;

    @Test
    void recordAlert_persistsAlertAndRaisesHighSeverityEvent() {
        AiAlertService service = new AiAlertService(alertRepository, securityEventRepository, alertProducer);

        AiAlertRequest request = new AiAlertRequest(
                "did:cypherid:user1",
                -0.42,
                Map.of("hour_of_day", 2, "access_rate_1min", 40.0),
                "Rapid-fire access (40 accesses/min)");

        MessageResponse response = service.recordAlert(request);

        assertEquals("AI anomaly alert recorded", response.message());

        // Anomaly alert persisted with the score
        ArgumentCaptor<AiAnomalyAlertEntity> alertCaptor = ArgumentCaptor.forClass(AiAnomalyAlertEntity.class);
        verify(alertRepository).save(alertCaptor.capture());
        assertEquals("did:cypherid:user1", alertCaptor.getValue().getUserDid());
        assertEquals(-0.42, alertCaptor.getValue().getAnomalyScore().doubleValue(), 0.0001);
        assertTrue(alertCaptor.getValue().getFeatures().contains("\"access_rate_1min\""));

        // Security event raised with AI_ANOMALY + HIGH severity
        ArgumentCaptor<SecurityEventEntity> eventCaptor = ArgumentCaptor.forClass(SecurityEventEntity.class);
        verify(securityEventRepository).save(eventCaptor.capture());
        assertEquals("AI_ANOMALY", eventCaptor.getValue().getEventType());
        assertEquals("HIGH", eventCaptor.getValue().getSeverity());
        assertEquals("did:cypherid:user1", eventCaptor.getValue().getUserDid());

        // Kafka alert published
        verify(alertProducer).publishSecurityAlert(any(), eq("did:cypherid:user1"), eq("AI_ANOMALY"), eq("HIGH"), any());
    }
}