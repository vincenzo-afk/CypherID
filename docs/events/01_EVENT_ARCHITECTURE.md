# Event Architecture

## Event Categories

### Blockchain Events (on-chain, immutable)
Emitted by chaincodes via `stub.setEvent(name, payload)`.
Consumed by backend services via Fabric event listener.

### Kafka Events (async, streaming)
Produced by backend services.
Consumed by: AI anomaly service, Audit service, Notification service.

### WebSocket Events (real-time, browser)
Published by Audit service.
Consumed by: Audit Dashboard frontend.

### Security Events (structured log)
Written to PostgreSQL security_events table.
High-severity events also written on-chain as SecurityAlert.

## Kafka Topics
| Topic | Producer | Consumer(s) |
|:---|:---|:---|
| `access-logs` | Access Service | AI Anomaly Service, Audit Service |
| `identity-events` | Identity Service | Notification Service, Audit Service |
| `asset-events` | Asset Service | Notification Service, Audit Service |
| `security-alerts` | Security Event Service | Audit Service, WebSocket |
| `protection-events` | Protected Session Service | Audit Service |
