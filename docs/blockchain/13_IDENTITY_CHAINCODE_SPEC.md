# Identity Chaincode Specification

## Contract Name
`IdentityContract`

## State Keys
| Key Pattern | Value Type | Description |
|:---|:---|:---|
| `DID:{did}` | DIDDocument JSON | DID document |
| `VC:{did}:{vcId}` | VerifiableCredential JSON | Issued VC (full JSON — SIH demo shortcut, see limitations) |
| `NONCE:{did}:{nonce}` | String | Replay protection nonce (one key per transaction) |

## Transactions

### createDID (SUBMIT)
Parameters: `did`, `publicKey`, `metadata`, `nonce`, `timestamp`
- Verifies DID does not already exist
- Verifies nonce not replayed
- Creates DIDDocument with status ACTIVE
- Emits `DIDCreated` event

### updateDID (SUBMIT)
Parameters: `did`, `metadata`, `nonce`, `timestamp` — correction / key rotation
(see docs/compliance/02_DATA_PRIVACY.md, docs/identity/09_KEY_MANAGEMENT.md).

### listDIDsByStatus (EVALUATE)
Range query over `DID:` keys filtered by status.

### resolveDID (EVALUATE)
Parameters: `did`
- Returns DIDDocument JSON or throws if not found

### suspendDID (SUBMIT)
Parameters: `did`, `adminDid`, `reason`, `nonce`, `timestamp`
- Verifies caller is authorized admin
- Sets status to SUSPENDED

### revokeDID (SUBMIT)
Parameters: `did`, `adminDid`, `reason`, `nonce`, `timestamp`
- Verifies caller is authorized admin
- Sets status to REVOKED (irreversible)

### issueVC (SUBMIT)
Parameters: `did`, `vcId`, `vcJSON`, `issuerDID`, `issuerSignature`, `nonce`, `timestamp`
- Verifies issuer DID is active (credential-type authorization and VC-expiry
  checks are enforced by the backend CredentialService, not on-chain —
  documented limitation)
- Stores the VC JSON on-chain (SIH demo shortcut; production should store a
  hash + private-data collection — see docs/security/20_BLOCKCHAIN_SECURITY.md)
- Emits `VCIssued` event

### revokeVC (SUBMIT)
Parameters: `did`, `vcId`, `issuerDID`, `nonce`, `timestamp`
- Verifies issuer owns the VC
- Sets VC status to REVOKED

### verifyVC (EVALUATE)
Parameters: `did`, `vcId`
- Returns `{"result":"VALID"|"REVOKED"|"NOT_FOUND"|"SUBJECT_DID_INACTIVE", ...}`

## DIDDocument Model
```json
{
  "did": "did:cypherid:0x...",
  "publicKey": "...",
  "metadata": "...",
  "status": "ACTIVE|SUSPENDED|REVOKED",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "version": 1
}
```
