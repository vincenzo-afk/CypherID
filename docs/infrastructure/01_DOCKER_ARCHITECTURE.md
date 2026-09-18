# Docker Architecture

## Container Images

| Service | Base Image | Build |
|:---|:---|:---|
| Fabric peer | hyperledger/fabric-peer:2.5 | Official |
| Fabric orderer | hyperledger/fabric-orderer:2.5 | Official |
| Fabric CA | hyperledger/fabric-ca:1.5 | Official |
| CouchDB | couchdb:3.3 | Official |
| PostgreSQL | postgres:16-alpine | Official |
| IPFS | ipfs/kubo:latest | Official |
| Kafka | confluentinc/cp-kafka:7.x | Official |
| Zookeeper | confluentinc/cp-zookeeper:7.x | Official |
| Redis | redis:7-alpine | Official |
| Backend services | eclipse-temurin:21-jre-alpine | Custom (Gradle build) |
| Frontend | node:20-alpine (build) + nginx:1.25-alpine (serve) | Custom (multi-stage build) |

## Build Process
```bash
# Build all backend services
./gradlew bootJar

# Build Docker images
docker compose build

# Start infrastructure + services (Fabric behind --profile fabric)
docker compose up -d
docker compose --profile fabric up -d   # only with Phase 2 crypto material
```

## Frontend Serving (production)
`frontend/nginx.conf` serves the SPA and proxies `/api/` + `/ws/` to
`api-gateway:8080` (see `frontend/Dockerfile`). The dev server mirrors this
via `vite.config.js` (`/api` + `/ws` proxy).

## Resource Requirements (Demo)
- RAM: 16 GB minimum
- CPU: 4 cores minimum
- Disk: 20 GB for images + data
