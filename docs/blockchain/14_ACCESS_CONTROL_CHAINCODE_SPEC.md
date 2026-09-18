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
Parameters: `did`, `resourceId`, `action`, `contextAttributes`, `vcVerificationResult`, `timestamp`
- Validity is checked by exact match (`result == "VALID"`, never substring) and
  role by exact per-token match; accepts the JSON form
  `{"result":"VALID","roles":"R1,R2"}` and the legacy `VALID,R1,R2` form
- A live delegation (`DELEGATE:` record: matching toDid/resourceId/action,
  active, unexpired) substitutes for the RBAC role requirement and yields
  reason `DELEGATED_ACCESS`; ABAC constraints always still apply
- Cross-contract `verifyVC` invocation is not yet wired: the caller supplies
  `vcVerificationResult` (trust-on-caller — documented limitation, see
  docs/security/15_BLOCKCHAIN_SECURITY.md)
- Evaluates ABAC attributes
- Returns AccessDecision (GRANTED/DENIED + reason)
- Note: EVALUATE — not written to ledger; caller must submit logAccess separately

### logAccess (SUBMIT)
Parameters: `did`, `resourceId`, `action`, `decision`, `reason`, `policyId`, `contextAttributes`, `nonce`, `timestamp`
- Writes immutable AccessLog to ledger
- Emits `AccessGranted` or `AccessDenied` event

### delegateAccess (SUBMIT)
Parameters: `fromDid`, `toDid`, `resourceId`, `action`, `expiresAt`, `nonce`, `timestamp`
- Records a time-bound delegation (enforced by `evaluateAccess`)

### revokeDelegate (SUBMIT)
Parameters: `fromDid`, `toDid`, `resourceId`, `nonce`, `timestamp`
- Deletes the delegation record

### getPolicy / getAccessLog (EVALUATE)
Read-only queries by `policyId` / `logId`.

### createMultiSigRequest (SUBMIT)
Parameters: `requestId`, `resourceId`, `requesterDID`, `requiredApprovers`, `nonce`, `timestamp`
- Creates a pending multi-signature approval request (unanimous threshold)

### approveMultiSig (SUBMIT)
Parameters: `requestId`, `approverDID`, `signature`, `nonce`, `timestamp`
- Rejects unknown approvers and repeat approvals by the same approver
- Enforces the 24h request timeout (marks `EXPIRED`, emits `MultiSigExpired`)
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
