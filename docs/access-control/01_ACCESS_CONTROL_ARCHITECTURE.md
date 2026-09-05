# Access Control Architecture

## Design Principles
- All access decisions are made on-chain via chaincode (not in application layer alone)
- Every decision is recorded as an immutable blockchain transaction
- Deny-by-default: access denied unless explicitly granted by policy
- Separation of policy administration from access evaluation

## Evaluation Flow
```
Access Request
    │
    ▼
API Gateway (JWT validation)
    │
    ▼
Access Service (extract DID from JWT)
    │
    ▼
AccessControlChaincode.evaluateAccess(did, resourceId, action, contextAttributes)
    │
    ├── Is DID ACTIVE? (calls IdentityContract)
    ├── Does DID hold required VC/Role?
    ├── Do ABAC attributes match policy?
    │
    ▼
AccessDecision (GRANTED / DENIED + reason code)
    │
    ▼
AccessControlChaincode.logAccess (write to ledger)
    │
    ▼
IF GRANTED → Protected Session Service (issue session token)
IF DENIED  → Return 403 with reason code
```

## Zero-Trust Model
No implicit trust between services or between users and resources.
Every request is fully re-evaluated against the current on-chain state.
