# Access Denial Workflow

Access denied = HTTP 403 + reason code.
Denial logged on-chain as AccessLog with decision=DENIED.
Denial event published to Kafka access-logs topic (consumed by the Audit service).
