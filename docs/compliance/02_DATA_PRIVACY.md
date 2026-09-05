# Data Privacy

## Data Categories Processed
| Category | Examples | Lawful Basis |
|:---|:---|:---|
| Identity data | DID, name, org, department | Employment/contractual necessity |
| Access logs | Which resource, when, decision | Legitimate interest (security audit) |
| Behavioural data | AI features (access patterns) | Legitimate interest (security) |
| Document metadata | Asset ID, classification, owner | Contractual necessity |

## Data Subject Rights
- Access: users can view their DID, VCs, and access history via Identity Wallet
- Correction: DID metadata can be updated via `updateDID`
- Erasure: difficult (blockchain immutability); operational data deletable from PostgreSQL
- Portability: DID document and VCs exportable

## Blockchain and Privacy
On-chain records are immutable. GDPR right to erasure conflicts with blockchain immutability.
Mitigation: store minimum on-chain; personal data in PostgreSQL (deletable).
