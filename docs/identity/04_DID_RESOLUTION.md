# DID Resolution

DIDs resolved via `GET /api/v1/identity/did/{did}`.
Backend calls `IdentityChaincode.resolveDID(did)` (EVALUATE tx).
Cached in Redis for 60 seconds (active DIDs only).
