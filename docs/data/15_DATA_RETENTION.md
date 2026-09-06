# Data Retention

## Blockchain (Immutable)
All on-chain records are permanent by design.
Access logs, DID history, asset provenance: retained indefinitely.

## PostgreSQL
| Table | Retention |
|:---|:---|
| users | Indefinite (for audit) |
| protected_sessions | 7 years (compliance) |
| watermarks | 7 years (forensic) |
| security_events | 7 years (compliance) |
| asset_encryption_keys | Until asset burned + 1 year |

## Redis
| Key Type | TTL |
|:---|:---|
| Access JWT | Token expiry (15 min) |
| Refresh JWT | 7 days |
| Session state | Session expiry |
| Rate limit counters | 1 minute rolling window |
| JWT blacklist | Original token TTL remainder |

## IPFS
Encrypted files retained as long as asset is ACTIVE.
After burn: file may remain on IPFS (content-addressed; deletion not guaranteed on distributed nodes).
Production: private pinning service allows controlled deletion.

## Audit Logs
Blockchain audit logs are the authoritative record.
PostgreSQL security_events: supplementary operational record.
