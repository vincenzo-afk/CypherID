# Browser Security

## Content Security Policy
Strict CSP applied. See `docs/frontend/20_FRONTEND_SECURITY.md`.

## Same-Origin Policy
All API calls to same origin (API Gateway).
No cross-origin resource sharing beyond defined CORS policy.

## Token Storage
Access JWT: in-memory (JavaScript variable, not localStorage).
Refresh token: httpOnly secure cookie (not accessible to JavaScript).

## XSS Prevention
React default escaping.
No `dangerouslySetInnerHTML`.
User content sanitised before render.

## Clickjacking Prevention
`X-Frame-Options: DENY` — page cannot be embedded in iframe.

## Subresource Integrity
CDN resources (if any) must use SRI hashes.
