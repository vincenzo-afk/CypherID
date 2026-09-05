# Secret Management

## Secret Types
- Database passwords
- Redis password
- JWT signing keys
- Master encryption key
- Fabric admin credentials

## Storage (Demo)
Docker Compose `.env` file (not committed to VCS).
Docker secrets (`/run/secrets/`).

## Storage (Production)
HashiCorp Vault or cloud KMS (AWS Secrets Manager, GCP Secret Manager).

## Rules
- Never in source code
- Never in Docker image layers
- Never in log output
- Never in API responses
- Never in environment variables that are inherited by child processes unnecessarily

## Secret Injection
Services read secrets at startup from Docker secrets or environment.
Secrets not stored in memory longer than necessary.
