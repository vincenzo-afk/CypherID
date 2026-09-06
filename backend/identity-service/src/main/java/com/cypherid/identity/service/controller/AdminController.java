package com.cypherid.identity.service.controller;

import com.cypherid.identity.service.domain.User;
import com.cypherid.identity.service.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/**
 * AdminController — super-admin organization registry and user role
 * management (docs/api/15_ADMIN_APIS.md).
 *
 * <p>POST /api/v1/admin/organizations   → register org (super admin)
 * <p>PUT  /api/v1/admin/users/{did}/role → assign/modify role (admin)
 * <p>GET  /api/v1/admin/organizations   → list registered orgs (admin)
 */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    private static final Logger logger = LoggerFactory.getLogger(AdminController.class);

    /** Demo org registry: orgId → record (real org onboarding is a Fabric network op). */
    private static final Map<String, Map<String, Object>> ORG_REGISTRY = new ConcurrentHashMap<>();

    private final UserRepository userRepository;

    public AdminController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Register an organization (super admin only).
     */
    @PostMapping("/organizations")
    public ResponseEntity<Map<String, Object>> registerOrganization(
            @RequestHeader("X-User-DID") String adminDid,
            @RequestHeader("X-User-Roles") String roles,
            @Valid @RequestBody RegisterOrgRequest request) {

        requireSuperAdmin(roles);
        String orgId = "ORG-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Map<String, Object> record = new ConcurrentHashMap<>();
        record.put("orgId", orgId);
        record.put("name", request.name());
        record.put("mspId", request.mspId() != null ? request.mspId() : request.name() + "MSP");
        record.put("registeredBy", adminDid);
        record.put("registeredAt", Instant.now().toString());
        record.put("status", "ACTIVE");
        ORG_REGISTRY.put(orgId, record);
        logger.info("Organization registered: {} ({}) by {}", request.name(), orgId, adminDid);
        return ResponseEntity.status(HttpStatus.CREATED).body(record);
    }

    /**
     * List registered organizations (admin only).
     */
    @GetMapping("/organizations")
    public ResponseEntity<List<Map<String, Object>>> listOrganizations(
            @RequestHeader("X-User-Roles") String roles) {

        requireAdminRole(roles);
        return ResponseEntity.ok(List.copyOf(ORG_REGISTRY.values()));
    }

    /**
     * Assign or modify a user's role/clearance (admin only).
     * The clearance level doubles as the RBAC role anchor kept in sync
     * with on-chain policy evaluation (docs/access-control/).
     */
    @PutMapping("/users/{did}/role")
    public ResponseEntity<Map<String, Object>> assignRole(
            @PathVariable String did,
            @RequestHeader("X-User-DID") String adminDid,
            @RequestHeader("X-User-Roles") String roles,
            @Valid @RequestBody AssignRoleRequest request) {

        requireAdminRole(roles);
        User user = userRepository.findByDid(did)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "DID not found: " + did));
        user.setClearanceLevel(request.role());
        if (request.organization() != null && !request.organization().isBlank()) {
            user.setOrganization(request.organization());
        }
        userRepository.save(user);
        logger.info("Role assigned: {} → {} by {}", did, request.role(), adminDid);
        return ResponseEntity.ok(Map.of(
                "did", did,
                "role", request.role(),
                "organization", user.getOrganization(),
                "updatedBy", adminDid));
    }

    private void requireAdminRole(String roles) {
        if (roles == null || !roles.contains("ADMIN")) {
            throw new org.springframework.security.access.AccessDeniedException("Admin role required");
        }
    }

    private void requireSuperAdmin(String roles) {
        if (roles == null || !roles.contains("SUPER_ADMIN")) {
            throw new org.springframework.security.access.AccessDeniedException("Super-admin role required");
        }
    }

    public record RegisterOrgRequest(
        @NotBlank String name,
        String mspId
    ) {}

    public record AssignRoleRequest(
        @NotBlank String role,
        String organization
    ) {}
}
