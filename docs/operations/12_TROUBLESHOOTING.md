# Troubleshooting

| Symptom | Likely Cause | Check |
|:---|:---|:---|
| 503 FABRIC_UNAVAILABLE | Peer down | `docker compose ps`, `GET /api/v1/health/fabric` |
| Chunk delivery slow | IPFS latency | IPFS node health |
| Access always denied | Missing policy | Check `AccessPolicy` exists for resource |
| Rendering choppy | Low-end device | Check profile; consider LOW/MEDIUM |
