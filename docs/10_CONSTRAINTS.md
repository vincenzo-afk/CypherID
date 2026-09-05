# Constraints

## Technical Constraints

1. **Java 21 LTS** — Primary language for all backend and chaincode.
2. **Hyperledger Fabric 2.5** — Blockchain platform; no public chains.
3. **Docker Compose** — Deployment method; no Kubernetes in scope.
4. **Browser-only frontend** — React 18; no mobile native app.
5. **Standard cryptography only** — No custom cryptographic primitives.
6. **No hardware requirements** — Protection layer must work without special hardware.

## Security Constraints

1. No secrets in source code or version control.
2. All inter-service communication must be authenticated.
3. Protected content must not be sent to unauthorized clients.
4. Blockchain must not be used to distribute decryption keys.
5. Camera resistance claims must be empirically qualified, not absolute.

## Time Constraints

48-hour hackathon delivery window. See `docs/architecture/01_SYSTEM_ARCHITECTURE.md` for the hackathon roadmap.

## Legal / Ethical Constraints

1. Watermarking must not expose sensitive internal security information unnecessarily.
2. Capture monitoring must not falsely claim OS-level detection capability.
3. Security event logging must minimize personal data stored.
