# DID Lifecycle

## States
```
PENDING (pre-enrollment)
    ↓
ACTIVE (enrolled, operational)
    ↓
SUSPENDED (temporarily disabled — reversible)
    ↓
REVOKED (permanently disabled — irreversible)
```

## Transitions
| From | To | Actor | Condition |
|:---|:---|:---|:---|
| PENDING | ACTIVE | System | KYC approved + Fabric CA enrollment complete |
| ACTIVE | SUSPENDED | Admin | Admin decision (e.g., leave of absence) |
| SUSPENDED | ACTIVE | Admin | Reinstatement |
| ACTIVE | REVOKED | Admin | Termination, security breach |
| SUSPENDED | REVOKED | Admin | Escalation |

## Access Control During Lifecycle
| Status | Can access resources | Can be issued VCs | Can transfer assets |
|:---|:---|:---|:---|
| ACTIVE | Yes (if authorized) | Yes | Yes |
| SUSPENDED | No | No | No |
| REVOKED | No | No | No |
