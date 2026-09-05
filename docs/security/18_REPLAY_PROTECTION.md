# Replay Protection

## Chaincode (On-Chain)
Every SUBMIT transaction includes:
- `nonce`: monotonically increasing per-DID counter stored in world state
- `timestamp`: must be within ±5 minutes of peer time

Chaincode rejects:
- Nonce already used
- Timestamp outside window

## API (Application Layer)
Idempotency-Key header prevents duplicate API calls.
Key stored in Redis with TTL = 10 minutes.
Duplicate key with same payload → original response returned.

## Session Tokens
Session tokens are single-issue (not re-usable after expiry).
Redis blacklist tracks invalidated tokens.
