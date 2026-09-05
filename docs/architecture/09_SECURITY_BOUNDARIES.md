# Security Boundaries

## Cryptographic Boundary
All cryptographic operations use standard algorithms:
- Identity signatures: Ed25519 or ECDSA P-256
- Data encryption: AES-256-GCM
- Key derivation: HKDF
- TLS: TLS 1.3

Custom cryptographic primitives are PROHIBITED.

## Authorization Boundary
Every protected resource access requires:
1. Valid JWT (authentication)
2. DID active on-chain (identity)
3. Required VC present (credential)
4. RBAC role match (role)
5. ABAC attribute match (context)
6. Valid protected session (for protected content)

No step may be bypassed.

## Content Delivery Boundary
Protected content MUST NOT be sent to the browser in plaintext.
Content is served in chunks via authenticated session, rendered by protected renderer.
Decryption keys are never exposed to the browser.

## Audit Boundary
Every access decision, security event, and admin action is written to the blockchain ledger.
Ledger records are immutable; tampering is cryptographically detectable.
