# Failure Domains

## Fabric Network Failure
- Impact: Access decisions, DID operations, asset operations unavailable
- Mitigation: Redis caches last-known access decisions for short-term continuity (read-only)
- Recovery: Fabric network restart; world state restored from CouchDB

## PostgreSQL Failure
- Impact: User metadata and protected session management unavailable
- Recovery: PostgreSQL restart from persistent volume; point-in-time backup restore

## Kafka Failure
- Impact: Audit streaming degraded
- Mitigation: Services continue operating; events queued locally
- Recovery: Kafka restart; consumers catch up from offset

## Redis Failure
- Impact: Session cache miss; JWT blacklist unavailable; rate limiting disabled
- Mitigation: Services fall back to database session lookup; stricter rate limiting fallback
- Recovery: Redis restart; cache warm-up from PostgreSQL

## IPFS Failure
- Impact: Asset upload and retrieval unavailable
- Recovery: IPFS node restart from persistent volume
