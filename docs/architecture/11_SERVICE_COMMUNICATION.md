# Service Communication

## Synchronous (REST/HTTP)
| Caller | Callee | Protocol |
|:---|:---|:---|
| Frontend | API Gateway | HTTPS |
| API Gateway | Identity Service | HTTP (internal) |
| API Gateway | Access Service | HTTP (internal) |
| API Gateway | Asset Service | HTTP (internal) |
| API Gateway | Audit Service | HTTP (internal) |
| Services | Fabric Peers | gRPC (Fabric Gateway) |
| AI Service | Security Event Service | HTTP |

## Asynchronous (Kafka)
| Producer | Topic | Consumer |
|:---|:---|:---|
| Access Service | access-logs | AI Anomaly Service |
| Identity Service | identity-events | Notification Service |
| Access Service | access-events | Audit Service |
| Asset Service | asset-events | Audit Service, Notification Service |
| Security Event Service | security-alerts | Audit Service, WebSocket |

## WebSocket
| Service | Channel | Consumer |
|:---|:---|:---|
| Audit Service | /ws/audit | Audit Dashboard (Frontend) |
