# Protected Session Service

## Part of
`asset-service` package (`com.cypherid.asset.session`)

## Responsibilities
- Issue protected sessions after access is granted
- Manage session lifecycle (state transitions)
- Session storage in Redis + PostgreSQL
- Session token (JWT) generation and validation

## Session Token
Short-lived JWT (HS256), claims: sessionId, userDID, contentId, contentType, profile, exp.
Signed with session-specific secret (not the main JWT signing key).

## State Management
State stored in Redis for performance.
State changes mirrored to PostgreSQL for audit.
State machine logic: see `docs/protection/07_PROTECTED_SESSION_LIFECYCLE.md`.
