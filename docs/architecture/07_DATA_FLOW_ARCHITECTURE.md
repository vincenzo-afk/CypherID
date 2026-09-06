# Data Flow Architecture

## Flow 1: User Onboarding
```
User → Web KYC Form
  → Spring Boot (validates form)
  → Fabric CA (issues X.509 certificate)
  → Identity Chaincode (writes DID Document to ledger)
  → User receives DID + private key (shown once)
```

## Flow 2: Verifiable Credential Issuance
```
Admin → Issue VC (e.g., "Security Clearance Level 3")
  → Identity Service (validates issuer authority)
  → Identity Chaincode (stores VC hash on ledger)
  → Kafka event: vc-issued
  → Notification Service → User notification
```

## Flow 3: Classified Document Access
```
User → Request Document #123
  → API Gateway (validates JWT)
  → Access Service → AccessControlChaincode.evaluateAccess(did, "123", "READ")
  → Chaincode: DID active? → VC valid? → ABAC match?
  → IF GRANTED: write AccessLog to ledger → return session token
  → User → Protected Session Service → fetch encrypted content from IPFS
  → Decrypt in Protected Session Service → serve to browser via protected renderer
```

## Flow 4: Security Event Streaming
```
Every access event → Kafka topic: access-logs
  → Audit Service consumer
  → Security Event Service → HIGH severity published to security-alerts
  → WebSocket push to Audit Dashboard
```

## Flow 5: Protected Document Session
```
User authorized for protected document
  → ProtectedSessionService creates session (id, seed, watermark, expiry)
  → Frontend receives session token (not document content)
  → Frontend requests content chunks via session token
  → ProtectedContentService validates session + serves chunk
  → Browser-side renderer applies camera-resistant rendering
  → Watermark overlaid in browser
```
