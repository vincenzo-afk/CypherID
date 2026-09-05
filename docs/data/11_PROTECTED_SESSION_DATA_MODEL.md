# Protected Session Data Model

## Session State (Redis)
Key: `session:{sessionId}`
TTL: session expiry time

```json
{
  "sessionId": "uuid",
  "userDID": "did:cypherid:0x...",
  "contentId": "DRDO-DOC-007",
  "contentType": "DOCUMENT",
  "profile": "HIGH",
  "state": "PROTECTED_VIEW",
  "chunkCount": 3,
  "suspiciousEventCount": 0,
  "expiresAt": "ISO-8601"
}
```

## Session Token (JWT)
Short-lived JWT carrying sessionId only.
Backend resolves full session from Redis using sessionId.

## Session Audit (PostgreSQL)
Full session record written to `protected_sessions` table on creation.
State updates written on each state transition.
Closed at timestamp written on expiry or manual close.

## Chunk Delivery Log (Redis)
Key: `session:{sessionId}:chunks`
Value: sorted set of delivered chunk indices with timestamps.
Used for rate limiting and audit.
