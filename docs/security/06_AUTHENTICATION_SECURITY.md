# Authentication Security

## Password Storage
bcrypt with cost factor 12. Never stored or logged in plaintext.

## JWT Security
- HS256 symmetric signing with shared `jwt.secret` (gateway and identity
  service share the secret; RS256 is not implemented)
- Access TTL 5 hours / refresh TTL 24 hours (see backend/16_AUTHENTICATION.md)
- Refresh token rotation (new refresh token on each use)
- Access-token JTI blacklist via Redis on logout/revocation (gateway does not
  consult the blacklist — limitation, see backend/16)

## DID Authentication
DID-based challenge-response available as alternative to password:
- Server sends nonce
- Client signs with DID private key
- Server verifies signature against on-chain public key

## Brute Force Protection
- Rate limiting: 5 failed logins → 15-minute lockout
- Lockout state in Redis

## Multi-Factor (Advanced)
TOTP-based MFA can be added; not in demo scope.
