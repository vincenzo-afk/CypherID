package com.cypherid.identity.service.controller;

import com.cypherid.identity.service.dto.*;
import com.cypherid.identity.service.service.CredentialService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * CredentialController — Verifiable Credential lifecycle
 * (docs/api/04_CREDENTIAL_APIS.md).
 *
 * <p>POST   /api/v1/identity/credentials        → issue VC (org admin)
 * <p>GET    /api/v1/identity/credentials/{did}  → list VCs (self or admin)
 * <p>DELETE /api/v1/identity/credentials/{vcId} → revoke VC (issuer admin)
 * <p>POST   /api/v1/identity/credentials/verify → verify presented VC
 */
@RestController
@RequestMapping("/api/v1/identity/credentials")
public class CredentialController {

    private final CredentialService credentialService;

    public CredentialController(CredentialService credentialService) {
        this.credentialService = credentialService;
    }

    /**
     * Issue a Verifiable Credential (org admin only).
     */
    @PostMapping
    public ResponseEntity<IssueCredentialResponse> issueCredential(
            @RequestHeader("X-User-DID") String issuerDid,
            @RequestHeader("X-User-Roles") String roles,
            @Valid @RequestBody IssueCredentialRequest request) {

        requireAdminRole(roles);
        IssueCredentialResponse response = credentialService.issueCredential(issuerDid, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * List all VCs for a DID (owner or admin).
     */
    @GetMapping("/{did}")
    public ResponseEntity<CredentialListResponse> listCredentials(
            @PathVariable String did,
            @RequestHeader("X-User-DID") String requestorDid,
            @RequestHeader(value = "X-User-Roles", required = false) String roles) {

        if (!did.equals(requestorDid) && !isAdmin(roles)) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Can only view own credentials");
        }
        return ResponseEntity.ok(credentialService.listCredentials(did));
    }

    /**
     * Revoke a VC (issuer org admin only).
     */
    @DeleteMapping("/{vcId}")
    public ResponseEntity<TxHashResponse> revokeCredential(
            @PathVariable String vcId,
            @RequestHeader("X-User-DID") String issuerDid,
            @RequestHeader("X-User-Roles") String roles) {

        requireAdminRole(roles);
        return ResponseEntity.ok(credentialService.revokeCredential(vcId, issuerDid));
    }

    /**
     * Verify a presented VC (any authenticated user).
     */
    @PostMapping("/verify")
    public ResponseEntity<VerifyCredentialResponse> verifyCredential(
            @Valid @RequestBody VerifyCredentialRequest request) {

        return ResponseEntity.ok(credentialService.verifyCredential(request));
    }

    private void requireAdminRole(String roles) {
        if (!isAdmin(roles)) {
            throw new org.springframework.security.access.AccessDeniedException("Admin role required");
        }
    }

    private boolean isAdmin(String roles) {
        return roles != null && roles.contains("ADMIN");
    }
}
