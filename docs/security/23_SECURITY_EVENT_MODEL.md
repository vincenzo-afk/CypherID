# Security Event Model

See `docs/events/08_SECURITY_EVENTS.md` for event types and severity.

## Event Lifecycle
1. Event occurs (browser event, AI anomaly, admin action)
2. SecurityEventService classifies severity
3. PostgreSQL security_events record written
4. If HIGH severity: on-chain SecurityAlert written
5. Kafka security-alerts topic published
6. WebSocket push to Audit Dashboard
7. Admin notification (if admin is connected)

## Event Retention
PostgreSQL events: 7 years.
On-chain alerts: permanent.
