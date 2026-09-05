package com.cypherid.identity.service.controller;

import com.cypherid.identity.service.dto.*;
import com.cypherid.identity.service.service.IdentityManagementService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * IdentityController — REST endpoints for DID lifecycle management.
 * <p>
 * POST /api/v1/identity/did               → Create DID
 * GET  /api/v1/identity/did/{did}         → Resolve DID
 * PUT  /api/v1/identity/did/{did}/suspend → Suspend DID (admin)
 * PUT  /api/v1/identity/did/{did}/revoke  → Revoke DID (admin)
 * GET  /api/v1/identity/dids              → List DIDs (admin)
 */
@RestController
@RequestMapping("/api/v1/identity")
public class IdentityController {

    private final IdentityManagementService identityService;

    public IdentityController(IdentityManagementService identityService) {
        this.identityService = identityService;
    }

    /**
     * Create a new DID for a user.
     * Triggers Fabric CA enrollment + IdentityContract.createDID on-chain.
     */
    @PostMapping("/did")
    public ResponseEntity<CreateDIDResponse> createDID(
            @Valid @RequestBody CreateDIDRequest request,
            @RequestHeader(value = "X-User-DID", required = false) String requestorDid) {

        CreateDIDResponse response = identityService.createDID(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Resolve a DID document by DID.
     */
    @GetMapping("/did/{did}")
    public ResponseEntity<ResolveDIDResponse> resolveDID(
            @PathVariable String did) {

        ResolveDIDResponse response = identityService.resolveDID(did);
        return ResponseEntity.ok(response);
    }

    /**
     * Suspend a DID (admin only).
     */
    @PutMapping("/did/{did}/suspend")
    public ResponseEntity<TxHashResponse> suspendDID(
            @PathVariable String did,
            @Valid @RequestBody SuspendRevokeRequest request,
            @RequestHeader("X-User-DID")   String adminDid,
            @RequestHeader("X-User-Roles") String roles) {

        requireAdminRole(roles);
        TxHashResponse response = identityService.suspendDID(did, adminDid, request.reason());
        return ResponseEntity.ok(response);
    }

    /**
     * Revoke a DID permanently (admin only).
     */
    @PutMapping("/did/{did}/revoke")
    public ResponseEntity<TxHashResponse> revokeDID(
            @PathVariable String did,
            @Valid @RequestBody SuspendRevokeRequest request,
            @RequestHeader("X-User-DID")   String adminDid,
            @RequestHeader("X-User-Roles") String roles) {

        requireAdminRole(roles);
        TxHashResponse response = identityService.revokeDID(did, adminDid, request.reason());
        return ResponseEntity.ok(response);
    }

    /**
     * List all DIDs (admin only).
     */
    @GetMapping("/dids")
    public ResponseEntity<String> listDIDs(
            @RequestParam(required = false) String status,
            @RequestHeader("X-User-Roles") String roles) {

        requireAdminRole(roles);
        return ResponseEntity.ok(identityService.listDIDs(status));
    }

    private void requireAdminRole(String roles) {
        if (roles == null || !roles.contains("ADMIN")) {
            throw new org.springframework.security.access.AccessDeniedException("Admin role required");
        }
    }
}
