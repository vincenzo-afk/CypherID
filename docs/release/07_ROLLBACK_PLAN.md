# Rollback Plan

## Backend Services
Revert Docker image tag. Restart services.

## Chaincode
Chaincode versions are immutable once committed.
Rollback: redeploy previous version with higher sequence number.

## Database
PostgreSQL: apply reverse migration scripts.

## Fabric Network
Network configuration changes: difficult to roll back.
Plan: always test config changes on staging network first.
