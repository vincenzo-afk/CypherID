# RBAC Model

## Roles
| Role | Level | Description |
|:---|:---|:---|
| `CLEARANCE_LEVEL_1` | 1 | Basic access |
| `CLEARANCE_LEVEL_2` | 2 | Restricted access |
| `CLEARANCE_LEVEL_3` | 3 | Classified access |
| `CLEARANCE_LEVEL_4` | 4 | Secret access |
| `CLEARANCE_LEVEL_5` | 5 | Top Secret access |
| `SYSTEM_AUDITOR` | — | Read-only access to audit logs |
| `SYSTEM_OPERATOR` | — | Operational management |
| `ORG_ADMIN` | — | Organization-level administration |
| `SUPER_ADMIN` | — | System-wide administration |

## Role Assignment
Roles are assigned via Verifiable Credentials. Role = VC credential type.
A user holds a role if they hold a valid (non-revoked) VC of that type.

## Role Hierarchy
Higher clearance levels implicitly include lower levels for access evaluation.
