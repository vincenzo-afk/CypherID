# Cryptography

## Algorithms in Use

| Use Case | Algorithm | Key Size | Notes |
|:---|:---|:---|:---|
| File encryption | AES-GCM | 256-bit | Authenticated encryption |
| JWT signing (access) | RS256 | 2048-bit RSA | Asymmetric |
| JWT signing (session) | HS256 | 256-bit HMAC | Symmetric |
| DID identity | Ed25519 | 256-bit | Signing |
| Fabric transaction signing | ECDSA P-256 | 256-bit | Fabric standard |
| Password hashing | bcrypt | cost=12 | |
| Key derivation | HKDF-SHA256 | — | For wrapping keys |
| TLS | TLS 1.3 | — | All external comms |

## Prohibited
- MD5 (for any security purpose)
- SHA-1 (for any security purpose)
- DES, 3DES
- RSA with key < 2048 bits
- AES-ECB mode
- Custom cryptographic algorithms

## Randomness
- All cryptographic random: `java.security.SecureRandom` (Java)
- All cryptographic random: `secrets` module (Python)
- `Math.random()` is NEVER used for security purposes

## Key Wrapping
Asset encryption keys are wrapped (encrypted) using a master key before storage in PostgreSQL.
Master key stored as Docker secret / HSM key reference.
