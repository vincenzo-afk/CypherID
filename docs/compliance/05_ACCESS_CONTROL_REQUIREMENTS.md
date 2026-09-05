# Access Control Requirements

## Separation of Duties
- Identity issuing (Fabric CA admin) separate from access policy administration
- Emergency override requires SUPER_ADMIN (separate from ORG_ADMIN)
- Audit access (SYSTEM_AUDITOR) separate from operational access

## Need-to-Know
ABAC policies enforce need-to-know: department, location, time restrictions.

## Least Privilege
Default: no access to any resource.
Access granted only by explicit policy + matching VC.

## Periodic Review
Access policies should be reviewed periodically.
Expired VCs automatically revoke access (enforced by chaincode expiry check).
