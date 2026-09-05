# Audit Service

## Package
`com.cypherid.audit`

## Port
8084

## Responsibilities
- Audit log queries (Fabric + PostgreSQL)
- Real-time WebSocket event streaming
- PDF audit report generation

## Spring Boot Components
- `AuditController` — REST endpoints
- `AuditService` — Query orchestration
- `FabricAuditClient` — Fabric event listener + query
- `AuditWebSocketHandler` — WebSocket push
- `ReportService` — iText PDF generation

## Dependencies
- Fabric Gateway Java SDK
- PostgreSQL (security_events, sessions)
- Redis (WebSocket subscriptions)
- Kafka consumer (access-logs, security-alerts, protection-events)
- iText 7 (PDF)
