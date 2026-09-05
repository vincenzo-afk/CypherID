# Security Testing

## Authorization Tests

### AT-01: Access without JWT
- Request any protected endpoint without Authorization header
- Expected: HTTP 401

### AT-02: Access with expired JWT
- Use expired JWT token
- Expected: HTTP 401

### AT-03: Access resource with insufficient clearance
- Authenticate as CLEARANCE_LEVEL_1 user
- Request resource requiring CLEARANCE_LEVEL_3
- Expected: HTTP 403, reason ACCESS_DENIED_INSUFFICIENT_ROLE

### AT-04: Access another user's session token
- Authenticate as user A, get session token
- Use session token as user B
- Expected: HTTP 401 (DID mismatch)

### AT-05: Replay protected session token
- Record a valid chunk request
- Replay after session expiry
- Expected: HTTP 401

### AT-06: Request protected content without session
- Direct request to `/api/protected-content/chunk` without session token
- Expected: HTTP 401

### AT-07: Enumerate asset IDs
- Request assets/{id}/protected-session for IDs the user cannot access
- Expected: HTTP 403 (not 404 — avoid ID enumeration)

## Injection Tests

### IT-01: SQL injection in DID parameter
- Input: `' OR 1=1 --` as DID
- Expected: validation error HTTP 400 (JPA parameterized; injection not possible)

### IT-02: IPFS hash injection
- Manipulate IPFS hash to point to different content
- Expected: Hash validated against on-chain record; mismatch detected

## Session Security Tests

### ST-01: Session token in URL
- Verify session tokens are never sent as URL query parameters in production
- Expected: Bearer header only

### ST-02: Session expiry enforced
- Create session, wait for expiry (or manipulate exp claim)
- Expected: HTTP 401 after expiry
