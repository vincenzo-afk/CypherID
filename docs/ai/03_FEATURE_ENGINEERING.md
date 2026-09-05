# Feature Engineering

## Input: AccessLog Event (from Kafka)
```json
{
  "did": "did:cypherid:0x...",
  "resourceId": "DRDO-DOC-007",
  "action": "READ",
  "decision": "GRANTED",
  "timestamp": "ISO-8601",
  "ipAddress": "192.168.1.1",
  "deviceId": "device-uuid",
  "classification": "SECRET"
}
```

## Extracted Features
| Feature | Description | Type |
|:---|:---|:---|
| `hour_of_day` | Hour (0–23) | Integer |
| `day_of_week` | Day (0=Mon, 6=Sun) | Integer |
| `access_rate_1min` | Accesses in last 1 minute | Float |
| `access_rate_10min` | Accesses in last 10 minutes | Float |
| `denied_rate_10min` | Denied accesses in last 10 minutes | Float |
| `classification_score` | Numeric encoding of classification | Integer |
| `dept_mismatch` | 1 if resource dept != user dept | Binary |
| `ip_deviation` | Distance from user's historical IP centroid | Float |

## Feature Store
Recent access events stored in Redis (sliding window, last 30 minutes per user).
Feature extraction reads from Redis.
