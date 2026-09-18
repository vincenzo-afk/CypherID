# Environment Configuration

## Environment Files
`.env` file in project root (never committed to version control).
`.env.example` committed as template.

## Required Variables (as consumed by docker-compose.yml)
```bash
# PostgreSQL
POSTGRES_DB=cypherid
POSTGRES_USER=cypherid
POSTGRES_PASSWORD=<secret>

# JWT (shared by gateway + identity service)
JWT_SECRET=<secret, min 256 bits>

# Fabric
FABRIC_CHANNEL=cypherid-channel
FABRIC_ORG_MSP=Org1MSP
FABRIC_PEER_ENDPOINT=peer0.org1.cypherid.com:7051
FABRIC_PEER_OVERRIDE_AUTHORITY=peer0.org1.cypherid.com

# Asset master encryption key (wraps per-asset AES-256 keys at rest)
ASSET_MASTER_KEY=<secret>
```

## Production Hardening (not yet implemented)
Sensitive values should move to Docker secrets (mounted at `/run/secrets/`)
or HashiCorp Vault: `REDIS_PASSWORD`, `JWT_SIGNING_KEY_PATH`,
`FABRIC_WALLET_PATH`, `MASTER_KEY_PATH`. Development: environment
variables acceptable.
