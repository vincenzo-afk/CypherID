# Access Service

## Package
`com.cypherid.access`

## Port
8082

## Responsibilities
- Access request evaluation (delegates to chaincode)
- Policy creation and management
- Multi-signature request orchestration
- Access delegation management
- Protected session issuance (delegates to ProtectedSessionService)

## Spring Boot Components
- `AccessController` — REST endpoints
- `PolicyEngineService` — Orchestrates evaluation
- `FabricAccessClient` — Fabric Gateway wrapper for AccessControlChaincode
- `DelegationService` — Delegation lifecycle

## Dependencies
- Fabric Gateway Java SDK
- PostgreSQL
- Redis
- Kafka (access-logs producer)
