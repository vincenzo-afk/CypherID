package com.cypherid.asset.service.controller;

import com.cypherid.asset.service.dto.AiAlertRequest;
import com.cypherid.asset.service.dto.MessageResponse;
import com.cypherid.asset.service.security.AiAlertService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * AiAlertController — receives anomaly alerts from the Python AI service
 * (docs/ai/01_AI_ARCHITECTURE.md: POST /api/security/ai-alert).
 * <p>
 * This is an internal service-to-service endpoint (ai-svc → asset-service);
 * it is reachable inside the Docker network only.
 */
@RestController
public class AiAlertController {

    private final AiAlertService aiAlertService;

    public AiAlertController(AiAlertService aiAlertService) {
        this.aiAlertService = aiAlertService;
    }

    @PostMapping("/api/security/ai-alert")
    public ResponseEntity<MessageResponse> receiveAlert(@Valid @RequestBody AiAlertRequest request) {
        return ResponseEntity.ok(aiAlertService.recordAlert(request));
    }
}