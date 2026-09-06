# Security Alert Workflow

1. Browser capture event or admin action detected → POST /api/v1/protected-content/session/{id}/event
2. SecurityEventService writes PostgreSQL security_events record (+ on-chain SecurityAlert for HIGH severity)
3. Kafka security-alerts topic → WebSocket push
4. Audit Dashboard shows alert in real-time
