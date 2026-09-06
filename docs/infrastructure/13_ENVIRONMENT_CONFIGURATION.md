# Environment Configuration

## Environment Files
`.env` file in project root (never committed to version control).
`.env.example` committed as template.

## Required Variables
```bash
# PostgreSQL
POSTGRES_DB=cypherid
POSTGRES_USER=cypherid_app
POSTGRES_PASSWORD=<secret>

# Redis
REDIS_PASSWORD=<secret>

# JWT
JWT_SIGNING_KEY_PATH=/run/secrets/jwt_signing_key
JWT_SESSION_SECRET=<secret>

# Fabric
FABRIC_WALLET_PATH=/etc/cypherid/wallet
FABRIC_GATEWAY_PEER=peer0.org1.cypherid.com:7051
FABRIC_CHANNEL=cypherid-channel

# Master encryption key
MASTER_KEY_PATH=/run/secrets/master_key

# IPFS
IPFS_API_URL=http://ipfs:5001
```

## Secrets
Sensitive values via Docker secrets (mounted at `/run/secrets/`).
Development: environment variables acceptable.
Production: Docker secrets or HashiCorp Vault.
