# Delegated Access

User A can delegate READ access to User B for a resource, within A's own permissions.
Delegation has an expiry time.
Delegation record written on-chain.

## Enforcement
- `delegateAccess` requires a future-dated `expiresAt` (backend validates ISO-8601).
- `evaluateAccess` treats a live delegation (matching toDid/resourceId/action,
  active, unexpired) as a substitute for the RBAC role requirement and grants
  with reason `DELEGATED_ACCESS`. ABAC contextual constraints always still apply.
- Delegated access inherits the delegating user's access level (cannot exceed):
  verifying the delegator's own permissions at delegate time is not yet
  enforced (known gap — on-chain cross-contract verification is unwired, see
  docs/security/15_BLOCKCHAIN_SECURITY.md).
