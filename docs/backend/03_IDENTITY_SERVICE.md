# Identity Service

## Package
`com.cypherid.identity`

## Port
8081

## Responsibilities
- DID creation, resolution, suspension, revocation
- VC issuance and verification
- KYC form processing
- Fabric CA enrollment
- Key recovery (Shamir's)

## Spring Boot Components
- `DIDController` — REST endpoints
- `DIDService` — Business logic
- `CredentialService` — VC operations
- `FabricIdentityClient` — Fabric Gateway wrapper
- `KYCService` — KYC validation and approval

## Dependencies
- Fabric Gateway Java SDK
- Spring Security (JWT validation via API Gateway forwarded claims)
- PostgreSQL (user records)
- Redis (DID resolution cache)
- Kafka (identity-events producer)
