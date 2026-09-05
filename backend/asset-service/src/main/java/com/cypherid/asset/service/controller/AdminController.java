package com.cypherid.asset.service.controller;

import com.cypherid.asset.service.domain.SecurityEventEntity;
import com.cypherid.asset.service.exception.ForbiddenException;
import com.cypherid.asset.service.repository.SecurityEventRepository;
import com.cypherid.asset.service.watermark.WatermarkService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * AdminController — admin-only endpoints
 * (docs/api/11_WATERMARK_APIS.md, docs/api/12_SECURITY_EVENT_APIS.md).
 * <p>
 * GET /api/v1/admin/watermark/{displayId} — forensic watermark lookup (admin, audited)
 * GET /api/v1/security/events            — recent security events (admin/auditor)
 */
@RestController
@RequestMapping("/api/v1")
public class AdminController {

    private final WatermarkService watermarkService;
    private final SecurityEventRepository securityEventRepository;

    public AdminController(WatermarkService watermarkService,
                           SecurityEventRepository securityEventRepository) {
        this.watermarkService = watermarkService;
        this.securityEventRepository = securityEventRepository;
    }

    /**
     * GET /api/v1/admin/watermark/{displayId} — resolve a watermark display ID
     * to its session and user (admin only).
     */
    @GetMapping("/admin/watermark/{displayId}")
    public ResponseEntity<WatermarkService.WatermarkForensic> watermarkForensic(
            @PathVariable String displayId,
            @RequestHeader("X-User-Roles") String roles) {

        requireAdminRole(roles);
        return ResponseEntity.ok(watermarkService.lookup(displayId));
    }

    /**
     * GET /api/v1/security/events — recent security events (admin only).
     */
    @GetMapping("/security/events")
    public ResponseEntity<List<SecurityEventEntity>> securityEvents(
            @RequestHeader("X-User-Roles") String roles) {

        requireAdminRole(roles);
        return ResponseEntity.ok(securityEventRepository.findTop100ByOrderByCreatedAtDesc());
    }

    private void requireAdminRole(String roles) {
        if (roles == null || !roles.contains("ADMIN")) {
            throw new ForbiddenException("ADMIN_ROLE_REQUIRED", "Admin role required");
        }
    }
}