package com.cypherid.audit.service.controller;

import com.cypherid.audit.service.domain.AuditEventEntity;
import com.cypherid.audit.service.service.AuditService;
import com.cypherid.audit.service.service.ReportService;
import java.time.Instant;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

/**
 * AuditController — audit log queries + PDF reports
 * (docs/api/07_AUDIT_APIS.md).
 *
 * <p>GET /api/v1/audit/logs    → filter by date/DID/resource/decision
 * <p>GET /api/v1/audit/report  → PDF (startDate, endDate)
 *
 * <p>Audit data is restricted (docs/access-control/02_RBAC_MODEL.md,
 * docs/frontend/04_ROUTING.md): read access requires SYSTEM_AUDITOR,
 * ORG_ADMIN or SUPER_ADMIN. The gateway validates the JWT and forwards
 * the roles claim as X-User-Roles.
 */
@RestController
@RequestMapping("/api/v1/audit")
public class AuditController {

    /** Roles allowed to read audit data (docs/frontend/04_ROUTING.md). */
    private static final Set<String> ALLOWED_ROLES =
            Set.of("SYSTEM_AUDITOR", "ORG_ADMIN", "SUPER_ADMIN");

    private final AuditService auditService;
    private final ReportService reportService;

    public AuditController(AuditService auditService, ReportService reportService) {
        this.auditService = auditService;
        this.reportService = reportService;
    }

    @GetMapping("/logs")
    public ResponseEntity<Page<AuditEventEntity>> getLogs(
            @RequestHeader("X-User-Roles") String roles,
            @RequestParam(required = false) String did,
            @RequestParam(required = false) String resourceId,
            @RequestParam(required = false) String decision,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @PageableDefault(size = 20) Pageable pageable) {

        requireAuditRole(roles);
        return ResponseEntity.ok(auditService.queryLogs(
                did, resourceId, decision, eventType,
                parseInstant(from), parseInstant(to), pageable));
    }

    @GetMapping(value = "/report", produces = "application/pdf")
    public ResponseEntity<byte[]> getReport(
            @RequestHeader("X-User-Roles") String roles,
            @RequestParam String startDate,
            @RequestParam String endDate) {

        requireAuditRole(roles);
        byte[] pdf = reportService.generateReport(
                Instant.parse(startDate), Instant.parse(endDate));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=cypherid-audit-report.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    /** Enforces audit read access (docs/access-control/02_RBAC_MODEL.md). */
    private static void requireAuditRole(String roles) {
        if (roles == null || roles.isBlank()) {
            throw new AccessDeniedException("Audit access requires SYSTEM_AUDITOR, ORG_ADMIN or SUPER_ADMIN");
        }
        for (String role : roles.split(",")) {
            if (ALLOWED_ROLES.contains(role.trim())) {
                return;
            }
        }
        throw new AccessDeniedException("Audit access requires SYSTEM_AUDITOR, ORG_ADMIN or SUPER_ADMIN");
    }

    private static Instant parseInstant(String s) {
        if (s == null || s.isBlank()) {
            return null;
        }
        return Instant.parse(s);
    }
}
