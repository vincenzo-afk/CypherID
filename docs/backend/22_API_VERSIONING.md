# API Versioning

## Strategy
URL-based versioning: `/api/v1/`, `/api/v2/`

## Compatibility
Minor version changes: backward compatible (additive only).
Major version changes: breaking — old version maintained for 6 months.

## Current Version
v1 — all endpoints documented in `docs/api/`

## Chaincode Versioning
Chaincode versions are managed separately via Fabric lifecycle.
Chaincode version ≠ API version.
API may call newer chaincode version without API version bump if interface is compatible.
