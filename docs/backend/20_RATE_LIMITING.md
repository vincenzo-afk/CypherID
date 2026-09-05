# Rate Limiting

## Implementation
Spring Cloud Gateway + Redis-backed token bucket rate limiter

## Configuration
Per-route rate limits defined in API Gateway config.
Per-user limits keyed by DID (extracted from JWT sub claim).

## Rate Limit Response
HTTP 429 Too Many Requests
Headers: `Retry-After: {seconds}`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`

## Exemptions
- Health check endpoints: no rate limit
- Internal service-to-service calls: separate rate limit pool

## DDoS Protection
Rate limiting is the first line of DDoS defense.
Combined with: connection limits at load balancer, request size limits at gateway.
