# Data Retention (Compliance)

See `docs/data/15_DATA_RETENTION.md` for technical retention details.

## Compliance Retention Requirements
| Data Type | Minimum Retention | Regulation |
|:---|:---|:---|
| Access logs | 7 years | Audit requirements |
| Identity records | Duration of employment + 7 years | HR compliance |
| Security events | 7 years | Security compliance |
| Blockchain records | Permanent (immutable) | By design |

## Deletion Process
PostgreSQL data: automated deletion job per retention schedule.
IPFS content: unpinning after asset burn + retention period.
Blockchain: not deletable (by design).
