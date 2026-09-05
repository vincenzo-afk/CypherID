# Trust Model

## Trusted Components
| Component | Trust Level | Reason |
|:---|:---|:---|
| Hyperledger Fabric Ledger | Highest | Cryptographic immutability |
| Fabric CA | High | Root of trust for identities |
| Spring Security | High | Standard, audited framework |
| PostgreSQL | Medium | Trusted but mutable |
| Redis | Medium | Trusted but volatile |
| Browser (user's) | Low | Outside system control |
| User's device | Untrusted | Cannot verify device integrity |

## Zero Trust Application
No component trusts another implicitly.
API Gateway validates JWT before routing.
Services re-validate claims from gateway headers.
Chaincode re-validates identity via IdentityContract before any operation.
