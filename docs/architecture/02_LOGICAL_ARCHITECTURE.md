# Logical Architecture

## Logical Layers

### Presentation Layer
React 18 SPA served via static hosting or Spring Boot. Communicates exclusively with API Gateway.

### API Gateway Layer
Spring Cloud Gateway provides:
- JWT validation (stateless)
- Rate limiting (Redis-backed)
- SSL/TLS termination
- Request routing to downstream services

### Application Services Layer
Stateless Spring Boot microservices. Each service owns its domain logic and communicates with:
- Hyperledger Fabric (via Fabric Gateway Java SDK)
- PostgreSQL (via JPA/Hibernate)
- Kafka (via Spring Kafka)
- Redis (via Spring Data Redis)
- Other services (via REST or Kafka events)

### Blockchain Layer
Permissioned Hyperledger Fabric network. Provides:
- Immutable ledger of identity, access, and asset state
- On-chain policy enforcement via chaincode
- Cryptographic audit trail

### Persistence Layer
- PostgreSQL: relational app metadata (users, assets, sessions, events)
- CouchDB: Fabric world state (rich queries for chaincode)
- IPFS: encrypted binary file storage

### Protection Layer
Browser-side rendering engine (Canvas/WebGL/CSS) plus Java backend services for session and watermark management.
