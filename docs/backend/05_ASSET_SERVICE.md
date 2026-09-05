# Asset Service

## Package
`com.cypherid.asset`

## Port
8083

## Responsibilities
- Asset upload, minting, transfer, burn
- IPFS integration
- AES-256-GCM encryption/decryption
- Protected content delivery (ProtectedContentService)

## Spring Boot Components
- `AssetController` — REST endpoints
- `AssetService` — Asset lifecycle
- `FabricAssetClient` — Fabric Gateway wrapper
- `IPFSService` — IPFS upload/retrieval
- `EncryptionService` — AES-256-GCM
- `ProtectedContentController` — Protected chunk delivery
- `ProtectedContentService` — Session validation + decrypt + serve
- `ProtectedSessionService` — Session lifecycle
- `WatermarkService` — Watermark generation
- `SecurityEventService` — Security event logging

## Dependencies
- Fabric Gateway Java SDK
- PostgreSQL (asset metadata, sessions, watermarks, events)
- Redis (session state cache)
- IPFS node
- Kafka (asset-events, protection-events, security-alerts producers)
