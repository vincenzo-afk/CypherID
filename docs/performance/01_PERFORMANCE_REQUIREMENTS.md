# Performance Requirements

## Response Time Targets
| Operation | Target (p95) |
|:---|:---|
| Login (JWT issuance) | < 500ms |
| DID resolution | < 300ms |
| Access evaluation (chaincode) | < 1000ms |
| Asset metadata query | < 300ms |
| Content chunk delivery | < 500ms |
| Audit log query | < 1000ms |
| PDF report generation | < 5000ms |

## Throughput Targets (Demo)
| Metric | Target |
|:---|:---|
| Fabric transactions/sec | > 50 TPS |
| Concurrent protected sessions | > 10 |
| Kafka events/sec | > 100 |

## Rendering Performance Targets
| Profile | Target FPS | CPU Overhead |
|:---|:---|:---|
| LOW | 60 fps | < 2% |
| MEDIUM | 60 fps | < 5% |
| HIGH | 60 fps | < 10% |
| EXTREME | 60 fps | < 15% |

## Failure Targets
| Scenario | Acceptable |
|:---|:---|
| Single peer down | System continues (2 of 3 peers) |
| Redis down | Degraded (session cache miss acceptable) |
| AI service down | System continues (no anomaly detection) |
