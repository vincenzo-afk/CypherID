# Deployment Architecture

## Single-Host Docker Compose Deployment

All services run on a single host via Docker Compose for hackathon demo.

### Network Topology
- Docker bridge network: `cypherid-net`
- All services communicate by container name
- Only API Gateway and Frontend ports exposed to host

### Volume Mounts
- Fabric crypto material: `./crypto-config:/etc/hyperledger/fabric`
- PostgreSQL data: `postgres-data:/var/lib/postgresql/data`
- IPFS data: `ipfs-data:/data/ipfs`
- Redis data: `redis-data:/data`

### Startup Order
1. Zookeeper
2. Kafka
3. Redis
4. PostgreSQL
5. CouchDB instances
6. Fabric CA instances
7. Fabric Orderer
8. Fabric Peers
9. IPFS
10. Backend services (identity, access, asset, audit)
11. API Gateway
12. Frontend

### Health Checks
Every service defines a health check. Backend services wait for Fabric peer health before starting.
