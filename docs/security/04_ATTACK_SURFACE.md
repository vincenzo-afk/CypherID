# Attack Surface

## External Attack Surface
- API Gateway (HTTPS port 8080) — primary entry
- Frontend (port 3000) — static assets, WebSocket
- IPFS API (port 5001) — admin only, should not be exposed externally

## Internal Attack Surface
- Inter-service REST APIs (internal Docker network)
- Kafka topics (authenticated in production; plaintext in demo)
- Redis (password-protected)
- PostgreSQL (password-protected)
- Fabric peer gRPC (mTLS)

## Minimisation
- Only ports 8080 and 3000 exposed to host in Docker Compose
- All other ports internal to Docker bridge network
- No debug endpoints exposed in production profile
