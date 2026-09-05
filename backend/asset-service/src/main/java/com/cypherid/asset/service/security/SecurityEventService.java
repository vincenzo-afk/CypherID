package com.cypherid.asset.service.security;

import com.cypherid.asset.service.domain.SecurityEventEntity;
import com.cypherid.asset.service.dto.SecurityEventRequest;
import com.cypherid.asset.service.dto.SecurityEventResponse;
import com.cypherid.asset.service.kafka.SecurityAlertProducer;
import com.cypherid.asset.service.repository.SecurityEventRepository;
import com.cypherid.asset.service.session.ProtectedSessionService;
import com.cypherid.asset.service.session.SessionState;
import com.cypherid.asset.service.session.SessionStateMachine;
import com.google.gson.Gson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * SecurityEventService — receives browser security events, classifies them by
 * severity, persists them, and drives the protected session state machine
 * (docs/backend/13_SECURITY_EVENT_SERVICE.md).
 * <p>
 * HIGH severity events are published to the security-alerts Kafka topic.
 * (On-chain SecurityAlert writing requires chaincode support planned for the
 * AI anomaly phase and is intentionally not invented here.)
 */
@Service
public class SecurityEventService {

    private static final Logger logger = LoggerFactory.getLogger(SecurityEventService.class);

    /** Severity classification per docs/backend/13_SECURITY_EVENT_SERVICE.md. */
    private static final Map<String, String> SEVERITY_BY_EVENT = Map.ofEntries(
            Map.entry("TAB_HIDDEN", "LOW"),
            Map.entry("TAB_RESTORED", "LOW"),
            Map.entry("FOCUS_LOST", "LOW"),
            Map.entry("REPEATED_FOCUS_LOSS", "MEDIUM"),
            Map.entry("PRINT_DIALOG", "MEDIUM"),
            Map.entry("FULLSCREEN_EXIT", "MEDIUM"),
            Map.entry("SESSION_OBSCURED", "MEDIUM"),
            Map.entry("AI_ANOMALY", "HIGH"),
            Map.entry("EMERGENCY_OVERRIDE", "HIGH"));

    private final SecurityEventRepository eventRepository;
    private final ProtectedSessionService sessionService;
    private final SessionStateMachine stateMachine;
    private final SecurityAlertProducer alertProducer;
    private final Gson gson = new Gson();

    public SecurityEventService(SecurityEventRepository eventRepository,
                                ProtectedSessionService sessionService,
                                SessionStateMachine stateMachine,
                                SecurityAlertProducer alertProducer) {
        this.eventRepository = eventRepository;
        this.sessionService = sessionService;
        this.stateMachine = stateMachine;
        this.alertProducer = alertProducer;
    }

    /**
     * Records a browser security event and applies the session state transition.
     *
     * @param sessionId the protected session the event belongs to
     * @param userDid   the session owner (already verified by the controller)
     */
    @Transactional
    public SecurityEventResponse recordEvent(String sessionId, String userDid, SecurityEventRequest request) {
        String eventType = request.eventType();
        String severity = classify(eventType);
        String timestamp = request.timestamp() != null ? request.timestamp() : Instant.now().toString();

        // 1. Persist the event
        SecurityEventEntity entity = new SecurityEventEntity();
        entity.setSessionId(UUID.fromString(sessionId));
        entity.setUserDid(userDid);
        entity.setEventType(eventType);
        entity.setEventData(request.metadata() != null ? gson.toJson(request.metadata()) : "{}");
        entity.setSeverity(severity);
        eventRepository.save(entity);

        // 2. Publish HIGH severity alerts (best-effort)
        if ("HIGH".equals(severity) || "CRITICAL".equals(severity)) {
            alertProducer.publishSecurityAlert(sessionId, userDid, eventType, severity, timestamp);
        }

        // 3. Apply state transition with the event window count
        SessionState current = sessionService.getState(sessionId);
        int countInWindow = sessionService.incrementEventWindow(sessionId, eventType);
        SessionStateMachine.Transition transition = stateMachine.apply(current.state(), eventType, countInWindow);

        sessionService.updateState(sessionId, transition.newState());

        logger.info("Security event {} (severity {}) on session {} → state {}",
                eventType, severity, sessionId, transition.newState());

        return new SecurityEventResponse(transition.newState(), transition.action());
    }

    /**
     * Classifies an event type into a severity (docs/backend/13).
     * Unknown events default to LOW.
     */
    public String classify(String eventType) {
        if (eventType == null) return "LOW";
        return SEVERITY_BY_EVENT.getOrDefault(eventType, "LOW");
    }
}