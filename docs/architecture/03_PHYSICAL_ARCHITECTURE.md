# Physical Architecture

## Docker Compose Services

| Service | Container | Port(s) | Notes |
|:---|:---|:---|:---|
| Orderer | fabric-orderer | 7050 | Raft single orderer for demo |
| Peer Org1 | peer0.org1 | 7051 | CouchDB backed |
| Peer Org2 | peer0.org2 | 8051 | CouchDB backed |
| Peer Org3 | peer0.org3 | 9051 | CouchDB backed |
| Fabric CA Org1 | ca.org1 | 7054 | |
| Fabric CA Org2 | ca.org2 | 8054 | |
| Fabric CA Org3 | ca.org3 | 9054 | |
| CouchDB (Org1) | couchdb0 | 5984 | |
| CouchDB (Org2) | couchdb1 | 6984 | |
| CouchDB (Org3) | couchdb2 | 7984 | |
| PostgreSQL | postgres | 5432 | |
| IPFS | ipfs | 4001, 5001 | |
| Kafka | kafka | 9092 | |
| Zookeeper | zookeeper | 2181 | |
| Redis | redis | 6379 | |
| API Gateway | gateway | 8080 | Spring Cloud Gateway |
| Identity Service | identity-svc | 8081 | |
| Access Service | access-svc | 8082 | |
| Asset Service | asset-svc | 8083 | |
| Audit Service | audit-svc | 8084 | |
| Frontend | frontend | 3000 | React dev server |
