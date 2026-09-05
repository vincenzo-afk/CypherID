# Security Compliance

## Applicable Standards (Reference)
- OWASP Top 10 — Web application security
- NIST SP 800-53 — Security controls (reference for defence context)
- ISO 27001 — Information security management (aspirational for production)

## OWASP Top 10 Mitigations
| Risk | Mitigation in CypherID |
|:---|:---|
| A01 Broken Access Control | On-chain RBAC + ABAC; deny by default |
| A02 Cryptographic Failures | AES-256-GCM; TLS 1.3; bcrypt; no MD5/SHA1 |
| A03 Injection | JPA parameterized queries; Bean Validation |
| A04 Insecure Design | Architecture documented; threat model maintained |
| A05 Security Misconfiguration | Docker secrets; no debug in production |
| A06 Vulnerable Components | OWASP Dependency Check in build |
| A07 Auth Failures | JWT + bcrypt + rate limiting + blacklist |
| A08 Software Integrity Failures | SRI for CDN; signed Fabric artifacts |
| A09 Logging Failures | Blockchain audit trail; structured logs |
| A10 SSRF | No server-side URL fetching from user input |
