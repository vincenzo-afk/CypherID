# Security Event Service

## Part of
`asset-service` package (`com.cypherid.asset.security`)

## Responsibilities
- Receive security events from frontend (via API)
- Classify events by severity
- Log to PostgreSQL security_events
- Write HIGH severity events to blockchain as SecurityAlert
- Publish security-alerts to Kafka

## Event Severity Classification
| Event Type | Severity |
|:---|:---|
| TAB_HIDDEN | LOW |
| FOCUS_LOST | LOW |
| REPEATED_FOCUS_LOSS | MEDIUM |
| PRINT_DIALOG | MEDIUM |
| FULLSCREEN_EXIT (exam) | MEDIUM |
| SESSION_OBSCURED | MEDIUM |
| EMERGENCY_OVERRIDE | HIGH |
