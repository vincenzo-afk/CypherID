# Authorization Security

## Principle: No Single Point of Trust
Authorization is enforced at two independent layers:
1. Spring Security (application layer) — fast, stateless
2. Chaincode (on-chain) — authoritative, tamper-evident

Both must agree. Application layer cannot bypass on-chain evaluation.

## Deny by Default
If no policy exists for a resource → DENIED.
If DID status unclear → DENIED.
If network error during evaluation → DENIED (fail-secure).

## Privilege Escalation Prevention
Users cannot self-issue VCs.
Users cannot create policies for resources they don't own.
Emergency override requires SUPER_ADMIN role + full audit.

## Authorization Test Requirement
Every protected endpoint must have a test for:
- Unauthenticated access → 401
- Authenticated but insufficient role → 403
- Authenticated with correct role → 200
