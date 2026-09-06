# Component Architecture

## Identity Service Components
- `DIDController` — REST endpoints for DID lifecycle
- `DIDRegistryClient` — Fabric Gateway client for IdentityChaincode
- `CredentialService` — VC issuance and verification logic
- `KYCService` — KYC form validation and Fabric CA enrollment
- `KeyRecoveryService` — Shamir's Secret Sharing for key recovery

## Access Service Components
- `AccessController` — REST endpoints for access requests
- `PolicyEngineService` — Orchestrates RBAC + ABAC evaluation
- `AccessControlClient` — Fabric Gateway client for AccessControlChaincode
- `DelegationService` — Manages access delegation records

## Asset Service Components
- `AssetController` — REST endpoints for asset lifecycle
- `AssetClient` — Fabric Gateway client for AssetChaincode
- `IPFSService` — Manages IPFS upload/retrieval
- `EncryptionService` — AES-256-GCM encrypt/decrypt

## Audit Service Components
- `AuditController` — REST endpoints for audit queries
- `AuditWebSocketHandler` — Real-time WebSocket stream
- `ReportService` — PDF generation via iText

## Protection Components
- `ProtectionPolicyService` — Per-resource protection configuration
- `ProtectedSessionService` — Session lifecycle, key binding, expiry
- `WatermarkService` — Session-specific watermark generation
- `ProtectedContentService` — Authorized content delivery
- `SecurityEventService` — Security event logging and response
