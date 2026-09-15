package com.cypherid.asset.service.controller;

import com.cypherid.asset.service.client.AccessEvaluationClient;
import com.cypherid.asset.service.dto.IssueSessionResponse;
import com.cypherid.asset.service.exception.ForbiddenException;
import com.cypherid.asset.service.service.AssetService;
import com.cypherid.asset.service.session.ProtectedSessionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
 * owner bypass OR access evaluation (Access Service) → GRANTED → issue session + token.
 */
@RestController
@RequestMapping("/api/v1/assets")
public class ProtectedSessionController {

    private static final Logger logger = LoggerFactory.getLogger(ProtectedSessionController.class);

    private final AccessEvaluationClient accessEvaluationClient;
    private final ProtectedSessionService sessionService;
    private final AssetService assetService;

    public ProtectedSessionController(AccessEvaluationClient accessEvaluationClient,
                                      ProtectedSessionService sessionService,
                                      AssetService assetService) {
        this.accessEvaluationClient = accessEvaluationClient;
        this.sessionService = sessionService;
        this.assetService = assetService;
    }

    /**
     * POST /api/v1/assets/{assetId}/protected-session — evaluate access and,
     * if granted, issue a protected session (contentType=DOCUMENT for Phase 7).
     * <p>
     * The asset OWNER always passes: ownership is verified against the
     * on-chain metadata this service already trusts, so owners can open
     * their own uploads without an explicit policy. Everyone else goes
     * through on-chain policy evaluation (default-deny without a policy).
     */
    @PostMapping("/{assetId}/protected-session")
    public ResponseEntity<IssueSessionResponse> issueSession(
            @PathVariable String assetId,
            @RequestHeader("X-User-DID") String userDid,
            @RequestHeader(value = "X-User-Roles", required = false) String roles) {

        // 1. Owner bypass (verified on-chain); otherwise evaluate access.
        boolean isOwner = false;
        try {
            isOwner = userDid != null
                    && userDid.equals(assetService.getAssetMetadata(assetId).ownerDID());
        } catch (Exception e) {
            logger.debug("Owner check failed for {} (failing closed to policy evaluation): {}",
                    assetId, e.getMessage());
        }
        if (!isOwner) {
            try {
                accessEvaluationClient.requireAccess(userDid, roles, assetId, "READ");
            } catch (ForbiddenException denied) {
                NotificationController.publish(userDid, "ACCESS_DENIED",
                        "View denied for " + assetId + ": " + denied.getMessage());
                throw denied;
            }
        }

        // 2. Issue the protected session
        IssueSessionResponse response = sessionService.issueSession(userDid, assetId, "DOCUMENT");
        NotificationController.publish(userDid, "SESSION_ISSUED",
                "Protected session opened for " + assetId + " (" + response.sessionId() + ").");
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}