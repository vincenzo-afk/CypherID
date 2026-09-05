# Authentication

## Mechanism
JWT (JSON Web Tokens) — stateless authentication

## Token Issuance
POST `/api/auth/login`
- Request: `{ "did": "did:cypherid:0x...", "password": "..." }` or DID + signature
- Validates credentials against PostgreSQL (hashed password) and Fabric (DID active check)
- Returns: `{ "accessToken": "...", "refreshToken": "...", "expiresIn": 900 }`

## Access Token
- Algorithm: RS256 (RSA 256-bit)
- TTL: 15 minutes
- Claims: `sub` (DID), `iat`, `exp`, `roles`, `org`

## Refresh Token
- TTL: 7 days
- Stored in Redis (allows revocation)
- Single-use (rotated on each refresh)

## JWT Blacklist
- Revoked tokens stored in Redis with TTL = remaining token lifetime
- Gateway checks blacklist on every request

## Logout
POST `/api/auth/logout`
- Adds access token to Redis blacklist
- Deletes refresh token from Redis
