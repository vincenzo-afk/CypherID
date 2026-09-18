# Session Management

## JWT Sessions (User Authentication)
- Access token: 5 hours, stored in browser localStorage (`cypherid_access_token`;
  sent as `Authorization: Bearer`), signature/expiry validated by the gateway
- Refresh token: 24 hours, httpOnly cookie scoped to `/api/v1/auth/refresh`
  (rotated on each refresh)
- Blacklist: Redis (revoked tokens tracked until expiry)

## Protected Content Sessions
- Session token: per-resource, short TTL (10–60 min per profile)
- Session state: Redis (fast) + PostgreSQL (audit)
- Session invalidation: TTL expiry, manual revocation, or security event escalation

## No Server-Side Auth Session
Auth is stateless JWT. No traditional server-side session for authentication.

## Session Fixation Prevention
New session token issued on every protected session creation.
Session token not tied to auth JWT (separate signing keys).
