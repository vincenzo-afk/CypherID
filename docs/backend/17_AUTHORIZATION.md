# Authorization

## Framework
Spring Security 6.x

## Method-Level Security
```java
@PreAuthorize("hasRole('ORG_ADMIN')")
public void createPolicy(PolicyRequest request) { ... }

@PreAuthorize("hasRole('SUPER_ADMIN')")
public void emergencyOverride(String resourceId) { ... }

@PreAuthorize("#did == authentication.principal.did or hasRole('ORG_ADMIN')")
public DIDDocument resolveDID(String did) { ... }
```

## On-Chain Authorization
Application-layer Spring Security is a FIRST filter.
On-chain chaincode evaluation is the AUTHORITATIVE decision.
Both must pass for access to be granted.

## Admin Roles
| Role | Spring Security Role | Chaincode Authority |
|:---|:---|:---|
| Org Admin | `ORG_ADMIN` | Can issue VCs for their org |
| Super Admin | `SUPER_ADMIN` | Emergency override |
| System Auditor | `SYSTEM_AUDITOR` | Read-only audit access |
