# Scalability Architecture

## Current (Hackathon Demo)
Single-host Docker Compose. Not horizontally scaled.

## Designed-For Scale

### Application Services
Stateless Spring Boot services — horizontally scalable behind a load balancer.
Session state in Redis (shared across instances).

### Fabric Network
- Additional peers per organization for fault tolerance
- Multiple orderers (Raft consensus) for ordering service HA
- Additional channels for data isolation between organizations

### Kafka
- Multiple partitions per topic
- Consumer groups for parallel processing

### PostgreSQL
- Read replicas for audit query offload
- Connection pooling via PgBouncer

### IPFS
- Private IPFS cluster for redundancy
- Content pinning for guaranteed availability

## Limits Not Addressed in Demo
- Database sharding
- Multi-region deployment
- CDN for frontend assets
