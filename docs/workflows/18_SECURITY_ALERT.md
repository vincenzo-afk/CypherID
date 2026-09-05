# Security Alert Workflow

1. AI service detects anomaly → POST /api/security/ai-alert
2. SecurityEventService writes on-chain SecurityAlert
3. SecurityAlertCreated event → Kafka → WebSocket
4. Audit Dashboard shows alert in real-time
