# Threat Model

## Threat Actors

| Actor | Motivation | Access Level | Sophistication |
|:---|:---|:---|:---|
| Unauthorized external | Data theft | None | Low–Medium |
| Authenticated user (unauthorized resource) | Access beyond permissions | System access | Low |
| Insider threat | Data exfiltration, sabotage | Full system access | Medium–High |
| Admin (rogue) | Unauthorized data access, policy manipulation | Admin access | High |
| Nation-state / APT | Systemic compromise | Targeted | Very High |

## Asset Classification (Security)
| Asset | Criticality |
|:---|:---|
| Fabric CA private keys | Critical |
| Asset encryption keys | Critical |
| User private keys | Critical (user-held) |
| JWT signing keys | High |
| Protected session tokens | High |
| DID Documents | Medium |
| Access logs | Medium |
| User metadata | Low |

## STRIDE Analysis
| Threat | Mitigation |
|:---|:---|
| Spoofing | JWT + DID authentication; Fabric X.509 identity |
| Tampering | Blockchain immutability; TLS in transit; AES-256-GCM at rest |
| Repudiation | Immutable blockchain audit trail with tx hashes |
| Information Disclosure | Access control on all endpoints; encryption of content; no keys in browser |
| Denial of Service | Rate limiting; connection limits |
| Elevation of Privilege | Deny-by-default; method-level security; on-chain policy enforcement |
