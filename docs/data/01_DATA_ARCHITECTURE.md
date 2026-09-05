# Data Architecture

## Storage Layers

| Store | Technology | What Lives Here |
|:---|:---|:---|
| Blockchain Ledger | Hyperledger Fabric + CouchDB | DID Documents, VCs (hash), Access Policies, Access Logs, Asset Records, Security Alerts |
| Relational DB | PostgreSQL 16 | Users, Sessions, Asset Metadata, Watermarks, Security Events, AI Alerts |
| Cache | Redis 7 | JWT tokens, Session tokens, Rate limit counters, Nonce cache |
| File Storage | IPFS | Encrypted asset files, Encrypted exam content, Encrypted video |

## Data Ownership Rules

### On-Chain (Authoritative)
- Identity state (DID status)
- Access decision records (tamper-evident audit)
- Asset ownership (provenance chain)
- Policy definitions
- Security alerts (AI-generated)

### Off-Chain (Operational)
- User profile metadata
- Protected session state
- Watermark records
- Security event details
- AI model input/output logs

### IPFS (Content)
- Encrypted files only
- Never plaintext content

## Data Flow
Off-chain data MUST be consistent with on-chain state.
On-chain state is authoritative in case of conflict.
