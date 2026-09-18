# Authentication

## Mechanism
JWT (JSON Web Tokens) — stateless authentication

## Token Issuance
POST `/api/v1/auth/login`
- Request: `{ "did": "did:cypherid:0x...", "password": "...", "nonce": "uuid" }`
- Validates credentials against PostgreSQL (bcrypt password hash) and rejects
  suspended/revoked DIDs (403). The DID lookup trims surrounding whitespace.
- Failed logins are counted in Redis; unknown DIDs and wrong passwords both
  record a failed attempt (5 failures → 15-minute lockout, 429).
- Returns: `{ "accessToken": "...", "expiresIn": 18000, "tokenType": "Bearer" }`
  with the refresh token delivered as an httpOnly cookie scoped to
  `/api/v1/auth/refresh` (never in the JSON body, per docs/api/02).

## Access Token
- Algorithm: HS256 (HMAC-SHA, shared `jwt.secret` — see JwtService/JwtAuthFilter;
  RS256 is not implemented)
- TTL: 5 hours (`jwt.expiration-seconds: 18000` in identity-service and gateway)
- Claims: `sub` (DID), `iat`, `exp`, `jti`, `org`, `roles` (comma-joined string,
  not an array — see JwtService.issueAccessToken)

## Refresh Token
- TTL: 24 hours (`jwt.refresh-expiration-seconds: 86400`)
- Opaque UUID stored in Redis (`jwt:refresh:*`), delivered as httpOnly cookie
- Single-use (rotated on each refresh; the old token is revoked)

## JWT Blacklist
- Revoked access-token JTIs stored in Redis with TTL = remaining token lifetime
- Gateway validates the signature/expiry but does NOT check the Redis
  blacklist (documented limitation — logout revocation is enforced on
  refresh-token reuse and downstream validation paths)

## Logout
POST `/api/v1/auth/logout`
- Adds access token JTI to Redis blacklist
- Deletes refresh token from Redis
