# Backend Architecture

## Framework
Spring Boot 3.3.x with Java 21 (LTS)

## Services

| Service | Port | Responsibility |
|:---|:---|:---|
| api-gateway | 8080 | Routing, JWT validation, rate limiting |
| identity-service | 8081 | DID and VC lifecycle |
| access-service | 8082 | Access evaluation, policy management |
| asset-service | 8083 | Asset lifecycle, IPFS, encryption |
| audit-service | 8084 | Audit queries, WebSocket, PDF reports |
| notification-service | 8085 | Event-driven notifications |

## Protection Services (within asset-service or separate)
| Service | Responsibility |
|:---|:---|
| ProtectionPolicyService | Per-resource protection configuration |
| ProtectedSessionService | Session lifecycle |
| WatermarkService | Watermark generation |
| ProtectedContentService | Authorized content delivery |
| SecurityEventService | Security event logging |
| ProtectionConfigurationService | System-wide protection config |

## Cross-Cutting
- Spring Security 6.x — OAuth2 resource server, JWT validation, method security
- Spring Data JPA — PostgreSQL persistence
- Spring Kafka — Kafka producer/consumer
- Spring Data Redis — Cache and session store
- Fabric Gateway Java SDK — Blockchain interaction
- Micrometer + Actuator — Metrics and health

## Java 21 Features Used
- Virtual threads (Project Loom) — for Fabric Gateway calls
- Record classes — for DTOs and chaincode models
- Pattern matching — for response handling
