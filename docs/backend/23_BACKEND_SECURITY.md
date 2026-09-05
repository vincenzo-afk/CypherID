# Backend Security

## Input Validation
- All request bodies validated via Bean Validation (JSR-380)
- Path variables validated for format (DID syntax, UUID format)
- File uploads: MIME type validation, size limits
- No direct use of request parameters in SQL queries (JPA parameterized queries only)

## SQL Injection
- All database access via JPA/Hibernate with parameterized queries
- No native SQL queries with string concatenation
- CouchDB queries via Fabric chaincode (not direct DB access)

## Secrets Management
- No secrets in source code
- Secrets via Docker secrets or environment variables
- JWT signing keys stored as secrets, rotated per key rotation schedule

## CORS
Strict CORS policy — only frontend origin allowed

## HTTPS
TLS 1.3 enforced in production. HTTP disabled.

## Dependency Security
- Gradle dependency version locking
- Automated dependency vulnerability scanning (OWASP Dependency Check)

## Logging
- No sensitive data logged (no passwords, no tokens, no plaintext content)
- Structured JSON logs with correlation IDs
- Audit logs written to blockchain (tamper-evident)
