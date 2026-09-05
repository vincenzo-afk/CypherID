package com.cypherid.access.service.controller;

import com.cypherid.access.service.dto.*;
import com.cypherid.access.service.service.DelegationService;
import com.cypherid.access.service.service.MultiSigService;
import com.cypherid.access.service.service.PolicyEngineService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * AccessController — REST endpoints for RBAC + ABAC access control.
 * <p>
 * Endpoints (docs/api/05_ACCESS_CONTROL_APIS.md, docs/api/08_POLICY_APIS.md):
 * POST /api/v1/access/request                    → evaluate access
 * POST /api/v1/access/policies                   → create policy (admin)
 * GET  /api/v1/access/policies                   → list policies (admin)
 * GET  /api/v1/access/policies/{resourceId}      → get policy (admin)
 * POST /api/v1/access/delegate                   → delegate access
 * PUT  /api/v1/access/delegate/revoke            → revoke delegation
 * POST /api/v1/access/multisig                   → create multi-sig request
 * POST /api/v1/access/multisig/{id}/approve      → approve multi-sig
 * GET  /api/v1/access/logs/{logId}               → read access log
 * <p>
 * The API Gateway validates JWTs and injects X-User-DID / X-User-Roles.
 */
@RestController
@RequestMapping("/api/v1/access")
public class AccessController {

    private final PolicyEngineService policyEngineService;
    private final DelegationService delegationService;
    private final MultiSigService multiSigService;

    public AccessController(PolicyEngineService policyEngineService,
                            DelegationService delegationService,
                            MultiSigService multiSigService) {
        this.policyEngineService = policyEngineService;
        this.delegationService = delegationService;
        this.multiSigService = multiSigService;
    }

    // ─── Access requests ──────────────────────────────────────────────────────

    /**
     * POST /api/v1/access/request — evaluate an access request on-chain.
     * GRANTED → 200 with decision; DENIED → 403 with reason code.
     */
    @PostMapping("/request")
    public ResponseEntity<AccessDecisionResponse> requestAccess(
            @RequestHeader("X-User-DID")   String did,
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @Valid @RequestBody AccessRequest request) {

        AccessDecisionResponse response = policyEngineService.requestAccess(did, roles, request);
        return ResponseEntity.ok(response);
    }

    // ─── Policy management ────────────────────────────────────────────────────

    /**
     * POST /api/v1/access/policies — create an access policy (admin only).
     */
    @PostMapping("/policies")
    public ResponseEntity<CreatePolicyResponse> createPolicy(
            @RequestHeader("X-User-DID")   String adminDid,
            @RequestHeader("X-User-Roles") String roles,
            @Valid @RequestBody CreatePolicyRequest request) {

        CreatePolicyResponse response = policyEngineService.createPolicy(adminDid, roles, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /api/v1/access/policies — list all policies (admin only).
     */
    @GetMapping("/policies")
    public ResponseEntity<List<PolicyResponse>> listPolicies(
            @RequestHeader("X-User-Roles") String roles) {

        requireAdminRole(roles);
        return ResponseEntity.ok(policyEngineService.listPolicies());
    }

    /**
     * GET /api/v1/access/policies/{resourceId} — get policy for a resource (admin only).
     */
    @GetMapping("/policies/{resourceId}")
    public ResponseEntity<PolicyResponse> getPolicyByResource(
            @PathVariable String resourceId,
            @RequestHeader("X-User-Roles") String roles) {

        requireAdminRole(roles);
        return ResponseEntity.ok(policyEngineService.getPolicyByResourceId(resourceId));
    }

    // ─── Delegation ───────────────────────────────────────────────────────────

    /**
     * POST /api/v1/access/delegate — delegate access to another user.
     */
    @PostMapping("/delegate")
    public ResponseEntity<DelegationResponse> delegate(
            @RequestHeader("X-User-DID") String fromDid,
            @Valid @RequestBody DelegateAccessRequest request) {

        DelegationResponse response = delegationService.delegate(
                fromDid, request.toDID(), request.resourceId(),
                request.action(), request.expiresAt());
        return ResponseEntity.ok(response);
    }

    /**
     * PUT /api/v1/access/delegate/revoke — revoke a delegation.
     */
    @PutMapping("/delegate/revoke")
    public ResponseEntity<DelegationResponse> revokeDelegate(
            @RequestHeader("X-User-DID") String fromDid,
            @Valid @RequestBody RevokeDelegateRequest request) {

        DelegationResponse response = delegationService.revoke(
                fromDid, request.toDID(), request.resourceId());
        return ResponseEntity.ok(response);
    }

    // ─── Multi-signature approval ─────────────────────────────────────────────

    /**
     * POST /api/v1/access/multisig — create a multi-sig approval request.
     */
    @PostMapping("/multisig")
    public ResponseEntity<MultiSigResponse> createMultiSig(
            @RequestHeader("X-User-DID") String requesterDid,
            @Valid @RequestBody MultiSigCreateRequest request) {

        MultiSigResponse response = multiSigService.create(requesterDid, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * POST /api/v1/access/multisig/{requestId}/approve — record an approval.
     */
    @PostMapping("/multisig/{requestId}/approve")
    public ResponseEntity<MultiSigResponse> approveMultiSig(
            @PathVariable String requestId,
            @RequestHeader("X-User-DID") String approverDid,
            @Valid @RequestBody MultiSigApproveRequest request) {

        MultiSigResponse response = multiSigService.approve(requestId, approverDid, request.signature());
        return ResponseEntity.ok(response);
    }

    // ─── Audit ────────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/access/logs/{logId} — read an immutable access log entry.
     */
    @GetMapping("/logs/{logId}")
    public ResponseEntity<AccessLogResponse> getAccessLog(@PathVariable String logId) {
        return ResponseEntity.ok(policyEngineService.getAccessLog(logId));
    }

    private void requireAdminRole(String roles) {
        if (roles == null || !roles.contains("ADMIN")) {
            throw new org.springframework.security.access.AccessDeniedException("Admin role required");
        }
    }
}