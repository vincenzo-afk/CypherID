package com.cypherid.asset.service.controller;

import com.cypherid.asset.service.client.AccessEvaluationClient;
import com.cypherid.asset.service.dto.IssueSessionResponse;
import com.cypherid.asset.service.session.ProtectedSessionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * ProtectedSessionController — issues protected sessions after access
 * evaluation (docs/api/10_PROTECTED_SESSION_APIS.md).
 * <p>
 * POST /api/v1/assets/{assetId}/protected-session
 * <p>
 * Flow (docs/protection/documents/01_PROTECTED_DOCUMENT_FLOW.md):
 * access evaluation (Access Service) → GRANTED → issue session + token.
 */
@RestController
@RequestMapping("/api/v1/assets")
public class ProtectedSessionController {

    private final AccessEvaluationClient accessEvaluationClient;
    private final ProtectedSessionService sessionService;

    public ProtectedSessionController(AccessEvaluationClient accessEvaluationClient,
                                      ProtectedSessionService sessionService) {
        this.accessEvaluationClient = accessEvaluationClient;
        this.sessionService = sessionService;
    }

    /**
     * POST /api/v1/assets/{assetId}/protected-session — evaluate access and,
     * if granted, issue a protected session (contentType=DOCUMENT for Phase 7).
     */
    @PostMapping("/{assetId}/protected-session")
    public ResponseEntity<IssueSessionResponse> issueSession(
            @PathVariable String assetId,
            @RequestHeader("X-User-DID") String userDid,
            @RequestHeader(value = "X-User-Roles", required = false) String roles) {

        // 1. Evaluate access on-chain (via Access Service)
        accessEvaluationClient.requireAccess(userDid, roles, assetId, "READ");

        // 2. Issue the protected session
        IssueSessionResponse response = sessionService.issueSession(userDid, assetId, "DOCUMENT");
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}