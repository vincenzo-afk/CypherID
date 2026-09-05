# Authentication APIs

## POST /api/v1/auth/login
Authenticate and receive JWT tokens.

**Request:**
```json
{
  "did": "did:cypherid:0x...",
  "password": "...",
  "nonce": "uuid"
}
```

**Response 200:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

**Errors:** 401 (invalid credentials), 403 (DID suspended/revoked)

---

## POST /api/v1/auth/refresh
Refresh access token using refresh token.

**Request:** (refresh token in httpOnly cookie)

**Response 200:** Same as login response.

**Errors:** 401 (invalid/expired refresh token)

---

## POST /api/v1/auth/logout
Invalidate current session.

**Headers:** `Authorization: Bearer {accessToken}`

**Response 200:** `{ "message": "Logged out successfully" }`

---

## GET /api/v1/auth/me
Return current user info from JWT claims.

**Response 200:**
```json
{
  "did": "did:cypherid:0x...",
  "org": "DRDO",
  "roles": ["CLEARANCE_LEVEL_3"]
}
```
