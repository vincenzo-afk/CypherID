# Health APIs

## GET /api/v1/health
Overall system health.

**Response 200:**
```json
{
  "status": "UP",
  "components": {
    "fabric": { "status": "UP", "blockHeight": 1234 },
    "postgresql": { "status": "UP" },
    "redis": { "status": "UP" },
    "kafka": { "status": "UP" },
    "ipfs": { "status": "UP" },
    "aiService": { "status": "UP" }
  }
}
```

---

## GET /api/v1/health/fabric
Fabric-specific health (peer status, channel info).

**Response 200:**
```json
{
  "peers": [
    { "name": "peer0.org1", "status": "UP", "blockHeight": 1234 },
    { "name": "peer0.org2", "status": "UP", "blockHeight": 1234 },
    { "name": "peer0.org3", "status": "UP", "blockHeight": 1234 }
  ],
  "channelName": "cypherid-channel",
  "chaincodes": ["IdentityContract", "AccessControlContract", "AssetContract"]
}
```

---

## GET /actuator/prometheus
Prometheus metrics endpoint (internal use; not exposed externally).
