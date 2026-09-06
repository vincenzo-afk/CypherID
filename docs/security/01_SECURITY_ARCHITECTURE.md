# Security Architecture

## Defence-in-Depth Layers

```
Layer 1  — Network (TLS 1.3, rate limiting, IP allowlist optional)
Layer 2  — Authentication (JWT, DID-based)
Layer 3  — Authorization (Spring Security + on-chain chaincode)
Layer 4  — Data Encryption (AES-256-GCM at rest, TLS in transit)
Layer 5  — Session Management (short-lived tokens, Redis blacklist)
Layer 6  — Audit (immutable blockchain ledger)
Layer 7  — Session Monitoring (security events, Kafka pipeline)
Layer 8  — Content Protection (camera-resistant rendering, watermarking)
```

## Security Principles
- Deny by default
- Least privilege
- Defence in depth
- Fail securely (errors return 403/500, not data)
- No security by obscurity — limitations documented openly
