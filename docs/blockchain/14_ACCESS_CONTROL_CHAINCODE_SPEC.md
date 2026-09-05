# Access Control Chaincode Specification

## Contract Name
`AccessControlContract`

## State Keys
| Key Pattern | Value Type | Description |
|:---|:---|:---|
| `POLICY:{policyId}` | AccessPolicy JSON | Access policy |
| `ACCESS_LOG:{txId}` | AccessLog JSON | Access decision record |
| `DELEGATE:{fromDID}:{toDID}:{resourceId}` | DelegationRecord JSON | Delegation record |
| `MULTISIG:{requestId}` | MultiSigRequest JSON | Multi-signature request |

## Transactions

### createPolicy (SUBMIT)
Parameters: `policyId`, `resourceId`, `requiredRole`, `abacAttributes`, `action`, `adminDID`, `nonce`, `timestamp`
- Verifies adminDID is authorized
- Creates AccessPolicy

### evaluateAccess (EVALUATE)
Parameters: `did`, `resourceId`, `action`, `contextAttributes`, `timestamp`
- Calls IdentityContract.verifyVC for required role
- Evaluates ABAC attributes
- Returns AccessDecision (GRANTED/DENIED + reason)
- Note: EVALUATE — not written to ledger; caller must submit logAccess separately

### logAccess (SUBMIT)
Parameters: `did`, `resourceId`, `action`, `decision`, `reason`, `nonce`, `timestamp`
- Writes immutable AccessLog to ledger
- Emits `AccessGranted` or `AccessDenied` event

### createMultiSigRequest (SUBMIT)
Parameters: `requestId`, `resourceId`, `requesterDID`, `requiredApprovers`, `nonce`, `timestamp`
- Creates a pending multi-signature approval request

### approveMultiSig (SUBMIT)
Parameters: `requestId`, `approverDID`, `signature`, `nonce`, `timestamp`
- Records approval
- If threshold met, marks request APPROVED and emits event

## AccessPolicy Model
```json
{
  "policyId": "...",
  "resourceId": "DRDO-DOC-007",
  "requiredRole": "CLEARANCE_LEVEL_3",
  "abacAttributes": {"dept": "DRDO", "location": "HYD"},
  "action": "READ",
  "active": true,
  "createdBy": "did:cypherid:admin",
  "createdAt": "ISO-8601"
}
```
