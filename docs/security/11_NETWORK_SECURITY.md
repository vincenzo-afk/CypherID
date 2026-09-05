# Network Security

## TLS
All external communication: TLS 1.3.
Internal Docker network: plaintext acceptable for demo; TLS recommended for production.
Fabric peer communication: mTLS using Fabric-generated certificates.

## Firewall
Docker Compose: only ports 8080 and 3000 exposed to host.
Production: additional network firewall rules per deployment environment.

## HTTPS Headers
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```

## CORS
```
Access-Control-Allow-Origin: https://cypherid.local (frontend origin only)
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Allow-Credentials: true
```
