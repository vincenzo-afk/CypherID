# API Gateway

## Technology
Spring Cloud Gateway

## Responsibilities
1. **JWT Validation** — Validates all incoming JWT tokens before routing
2. **Rate Limiting** — Redis-backed rate limiting per user DID
3. **SSL Termination** — TLS termination (production); HTTP in dev
4. **Routing** — Routes requests to downstream services
5. **Request ID** — Adds `X-Request-ID` header to all requests

## Route Configuration
```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: identity-service
          uri: http://identity-svc:8081
          predicates:
            - Path=/api/identity/**
        - id: access-service
          uri: http://access-svc:8082
          predicates:
            - Path=/api/access/**
        - id: asset-service
          uri: http://asset-svc:8083
          predicates:
            - Path=/api/assets/**
        - id: audit-service
          uri: http://audit-svc:8084
          predicates:
            - Path=/api/audit/**
        - id: protected-content
          uri: http://asset-svc:8083
          predicates:
            - Path=/api/protected-content/**
```

## Rate Limits
| Endpoint Group | Limit |
|:---|:---|
| `/api/access/request` | 10 req/min per user |
| `/api/protected-content/chunk` | 60 req/min per session |
| `/api/identity/**` | 30 req/min per user |
| Default | 100 req/min per user |

## Security
- All routes require valid JWT except `/api/auth/**`
- JWT claims forwarded to downstream services via headers
