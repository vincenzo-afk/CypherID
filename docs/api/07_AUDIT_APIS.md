# Audit APIs

## GET /api/v1/audit/logs
Query access logs with filters (date range, DID, resource, decision).

## GET /api/v1/audit/report
Generate PDF audit report. Query params: startDate, endDate.

## WebSocket /ws/audit
Real-time event stream for Audit Dashboard.
