package com.cypherid.audit.service.controller;

import com.cypherid.audit.service.domain.AuditEventEntity;
import com.cypherid.audit.service.service.AuditService;
import com.cypherid.audit.service.service.ReportService;
import java.time.Instant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * AuditController — audit log queries + PDF reports
 * (docs/api/07_AUDIT_APIS.md).
 *
 * <p>GET /api/v1/audit/logs    → filter by date/DID/resource/decision
 * <p>GET /api/v1/audit/report  → PDF (startDate, endDate)
 */
@RestController
@RequestMapping("/api/v1/audit")
public class AuditController {

    private final AuditService auditService;
    private final ReportService reportService;

    public AuditController(AuditService auditService, ReportService reportService) {
        this.auditService = auditService;
        this.reportService = reportService;
    }

    @GetMapping("/logs")
    public ResponseEntity<Page<AuditEventEntity>> getLogs(
            @RequestParam(required = false) String did,
            @RequestParam(required = false) String resourceId,
            @RequestParam(required = false) String decision,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @PageableDefault(size = 20) Pageable pageable) {

        return ResponseEntity.ok(auditService.queryLogs(
                did, resourceId, decision, eventType,
                parseInstant(from), parseInstant(to), pageable));
    }

    @GetMapping(value = "/report", produces = "application/pdf")
    public ResponseEntity<byte[]> getReport(
            @RequestParam String startDate,
            @RequestParam String endDate) {

        byte[] pdf = reportService.generateReport(
                Instant.parse(startDate), Instant.parse(endDate));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=cypherid-audit-report.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    private static Instant parseInstant(String s) {
        if (s == null || s.isBlank()) {
            return null;
        }
        return Instant.parse(s);
    }
}
