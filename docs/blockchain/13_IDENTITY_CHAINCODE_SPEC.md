# Identity Chaincode Specification

## Contract Name
`IdentityContract`

## State Keys
| Key Pattern | Value Type | Description |
|:---|:---|:---|
| `DID:{did}` | DIDDocument JSON | DID document |
| `VC:{did}:{vcId}` | VerifiableCredential JSON | Issued VC |
| `NONCE:{did}` | String | Replay protection nonce |

## Transactions

### createDID (SUBMIT)
Parameters: `did`, `publicKey`, `metadata`, `nonce`, `timestamp`
- Verifies DID does not already exist
- Verifies nonce not replayed
- Creates DIDDocument with status ACTIVE
- Emits `DIDCreated` event

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
- Verifies issuer DID is active
- Verifies issuer is authorized to issue this credential type
- Stores VC hash on-chain
- Emits `VCIssued` event

### revokeVC (SUBMIT)
Parameters: `did`, `vcId`, `issuerDID`, `nonce`, `timestamp`
- Verifies issuer owns the VC
- Sets VC status to REVOKED

### verifyVC (EVALUATE)
Parameters: `did`, `vcId`
- Returns verification result (valid/revoked/not-found)

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
