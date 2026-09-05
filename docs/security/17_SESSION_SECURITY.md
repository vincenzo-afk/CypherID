# Session Security

## Session Token Properties
- Short-lived (10–60 minutes per profile)
- Signed with HS256 (server-secret)
- Bound to userDID (cannot be used by another user)
- Contains sessionId (looked up in Redis for full state)

## Session Fixation Prevention
New session token generated on every new protected session.
Old session tokens invalidated on new session creation for same content.

## Session Hijacking Mitigation
- HTTPS prevents network sniffing of token
- Token bound to DID (attacker needs both token and matching JWT)
- Short TTL limits window of opportunity

## Concurrent Sessions
Configurable: allow 1 or N concurrent sessions per user per content item.
Default: 1 concurrent session per content item.
