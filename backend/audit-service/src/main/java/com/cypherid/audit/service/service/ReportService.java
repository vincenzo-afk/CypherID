package com.cypherid.audit.service.service;

import com.cypherid.audit.service.domain.AuditEventEntity;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.UnitValue;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

/**
 * ReportService — iText 7 PDF audit report generation
 * (GET /api/v1/audit/report?startDate&endDate).
 */
@Service
public class ReportService {

    private final AuditService auditService;

    public ReportService(AuditService auditService) {
        this.auditService = auditService;
    }

    public byte[] generateReport(Instant from, Instant to) {
        List<AuditEventEntity> events = auditService.queryLogs(
                        null, null, null, null, from, to,
                        PageRequest.of(0, 1000, Sort.by(Sort.Direction.DESC, "eventTime")))
                .getContent();

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(out);
            PdfDocument pdf = new PdfDocument(writer);
            Document doc = new Document(pdf);

            doc.add(new Paragraph("CypherID Audit Report").setBold().setFontSize(18));
            doc.add(new Paragraph("Range: " + from + " → " + to).setFontSize(10));
            doc.add(new Paragraph("Generated: " + Instant.now()).setFontSize(10));
            doc.add(new Paragraph("Total events: " + events.size()).setFontSize(10));
            doc.add(new Paragraph(" "));

            Table table = new Table(UnitValue.createPercentArray(new float[]{22, 18, 18, 14, 28}));
            table.setWidth(UnitValue.createPercentValue(100));
            table.addHeaderCell(new Cell().add(new Paragraph("Time").setBold().setFontSize(8)));
            table.addHeaderCell(new Cell().add(new Paragraph("DID").setBold().setFontSize(8)));
            table.addHeaderCell(new Cell().add(new Paragraph("Resource").setBold().setFontSize(8)));
            table.addHeaderCell(new Cell().add(new Paragraph("Decision").setBold().setFontSize(8)));
            table.addHeaderCell(new Cell().add(new Paragraph("TxHash").setBold().setFontSize(8)));

            for (AuditEventEntity e : events) {
                table.addCell(new Cell().add(new Paragraph(str(e.getEventTime())).setFontSize(7)));
                table.addCell(new Cell().add(new Paragraph(trunc(str(e.getDid()), 24)).setFontSize(7)));
                table.addCell(new Cell().add(new Paragraph(trunc(str(e.getResourceId()), 24)).setFontSize(7)));
                table.addCell(new Cell().add(new Paragraph(str(e.getDecision())).setFontSize(7)));
                table.addCell(new Cell().add(new Paragraph(trunc(str(e.getTxHash()), 24)).setFontSize(7)));
            }
            doc.add(table);
            doc.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("PDF report generation failed: " + e.getMessage(), e);
        }
    }

    private static String str(Object o) {
        return o == null ? "" : o.toString();
    }

    private static String trunc(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }
}
