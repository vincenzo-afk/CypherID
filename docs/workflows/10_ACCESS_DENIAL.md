# Access Denial Workflow

Access denied = HTTP 403 + reason code.
Denial logged on-chain as AccessLog with decision=DENIED.
AI service receives denial event via Kafka (feeds anomaly detection).
