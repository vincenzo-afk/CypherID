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
Implemented in `backend/api-gateway/src/main/resources/application.yml`
(all paths versioned `/api/v1/**`):

| Route | Upstream | JWT |
|:---|:---|:---|
| `/api/v1/auth/**` | identity-svc:8081 | no (login/refresh/logout) |
| `/api/v1/identity/**` | identity-svc:8081 | yes |
| `/api/v1/access/**` | access-svc:8082 | yes |
| `/api/v1/assets/**`, `/api/v1/protected-content/session/**`, `/api/v1/exams/**`, `/api/v1/videos/**`, `/api/v1/admin/**`, `/api/v1/security/**`, `/api/v1/notifications/**` | asset-svc:8083 | yes |
| `/api/v1/protected-content/chunk`, `/api/v1/protected-content/session-info` | asset-svc:8083 | no — these carry the protected **session** JWT (separate secret/claims, docs/api/09); asset-service parses it strictly |
| `/api/v1/admin/organizations/**`, `/api/v1/admin/users/**` | identity-svc:8081 | yes (first match wins) |
| `/api/v1/audit/**` | audit-svc:8084 | yes |
| `/ws/audit` | audit-svc:8084 (ws://) | yes (Bearer header or `?access_token=`) |
| `/api/v1/health/**` | identity-svc:8081 | no |

The audit WebSocket handshake cannot carry headers in browsers, so
`JwtAuthFilter` also accepts `?access_token=` for `/ws/**` paths.

## Rate Limits
| Endpoint Group | Limit |
|:---|:---|
| `/api/access/request` | 10 req/min per user |
| `/api/protected-content/chunk` | 60 req/min per session |
| `/api/identity/**` | 30 req/min per user |
| Default | 100 req/min per user |

## Security
- All routes require valid JWT except `/api/v1/auth/**` and `/api/v1/health/**`
- JWT claims forwarded to downstream services via headers
