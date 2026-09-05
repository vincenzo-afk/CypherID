# Shutdown

```bash
docker compose down
# Preserve volumes for data retention; use --volumes only for full reset
```
Graceful shutdown order: frontend -> gateway -> backend services -> Fabric peers -> orderer -> supporting services.
