# Verifiable Credentials

## Definition
A Verifiable Credential (VC) is a digitally signed claim issued by an authorized organization about a DID subject.

## Credential Types
| Type | Issuer | Meaning |
|:---|:---|:---|
| `SecurityClearance` | DRDO/MoD Admin | Level 1–5 security clearance |
| `OrgMembership` | BEL/DRDO/MoD Admin | Employment/membership |
| `SystemRole` | System Admin | Technical role (AUDITOR, OPERATOR, etc.) |

## VC Structure (Simplified)
```json
{
  "id": "vc:cypherid:...",
  "type": ["VerifiableCredential", "SecurityClearance"],
  "issuer": "did:cypherid:admin",
  "issuanceDate": "2024-01-01T00:00:00Z",
  "expirationDate": "2025-01-01T00:00:00Z",
  "credentialSubject": {
    "id": "did:cypherid:0x...",
    "clearanceLevel": 3,
    "department": "DRDO",
    "location": "HYD"
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2024-01-01T00:00:00Z",
    "verificationMethod": "did:cypherid:admin#key-1",
    "signature": "..."
  }
}
```

## On-Chain Storage
VC hash (SHA-256 of VC JSON) stored on-chain. Full VC delivered off-chain to subject.
Verification compares presented VC hash against on-chain record.
