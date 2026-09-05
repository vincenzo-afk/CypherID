# Authentication Security

## Password Storage
bcrypt with cost factor 12. Never stored or logged in plaintext.

## JWT Security
- RS256 asymmetric signing (API Gateway can verify without secret)
- Short TTL (15 minutes) minimises stolen token window
- Refresh token rotation (new refresh token on each use)
- Blacklist via Redis on logout and revocation

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
