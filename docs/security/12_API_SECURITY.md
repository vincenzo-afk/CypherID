# API Security

## Input Validation
All request bodies: Bean Validation (JSR-380).
All path variables: format validation (regex for DID, UUID for IDs).
File uploads: MIME type check, size limit (50 MB default).

## Output Encoding
Spring Boot JSON serialization handles encoding.
No raw string concatenation in responses.

## Error Messages
Error messages must not leak:
- Stack traces
- Database query details
- Internal paths
- Encryption information

## API Rate Limiting
See `docs/backend/20_RATE_LIMITING.md`.

## Idempotency
POST endpoints for resource creation accept Idempotency-Key header.
Prevents duplicate submissions from network retries.
