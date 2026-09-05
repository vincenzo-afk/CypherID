# Security Events

## Event Types
| Type | Severity | Trigger |
|:---|:---|:---|
| TAB_HIDDEN | LOW | Browser tab hidden during protected view |
| FOCUS_LOST | LOW | Window focus lost during protected view |
| PRINT_DIALOG | MEDIUM | beforeprint event fired |
| FULLSCREEN_EXIT | LOW | Fullscreen exited during exam |
| REPEATED_FOCUS_LOSS | MEDIUM | 3+ focus loss events in 5 minutes |
| SESSION_OBSCURED | MEDIUM | Session entered CONTENT_OBSCURED state |
| AI_ANOMALY | HIGH | Isolation Forest anomaly detected |
| EMERGENCY_OVERRIDE | HIGH | Super-admin emergency access granted |
| MULTISIG_APPROVED | MEDIUM | Multi-signature approval completed |
| RAPID_ACCESS | HIGH | >10 resource accesses per minute |
| UNAUTHORIZED_ATTEMPT | MEDIUM | Access denied for classified resource |

## High-Severity Events
HIGH severity events are written to blockchain as SecurityAlert records.
This ensures tamper-evident audit trail for high-risk events.

## SecurityAlert On-Chain Model
```json
{
  "alertId": "uuid",
  "userDID": "did:cypherid:0x...",
  "eventType": "AI_ANOMALY",
  "severity": "HIGH",
  "description": "...",
  "timestamp": "ISO-8601",
  "evidence": { ... }
}
```
