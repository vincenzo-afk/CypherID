# Error Handling

## Global Exception Handler
`@RestControllerAdvice` — catches all unhandled exceptions and returns standard error envelope.

## Fabric Exception Handling
`ChaincodeException` from Fabric → mapped to appropriate HTTP status + error code.
Fabric connectivity error → HTTP 503 + `FABRIC_UNAVAILABLE`.

## Sensitive Error Information
Error responses MUST NOT include:
- Stack traces (in production)
- Internal system paths
- Database query details
- Encryption key information

## Logging
All exceptions logged with correlation ID.
Stack traces logged server-side (not returned to client).
