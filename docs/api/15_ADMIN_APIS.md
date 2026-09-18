# Admin APIs

## POST /api/v1/admin/users
Create a user account and DID (org admin only). The response contains the DID,
private key, and a unique one-time password. Credentials are returned once and
are never persisted in plaintext.

## POST /api/v1/admin/organizations
Register new organization (super admin only).

## GET /api/v1/admin/organizations
List registered organizations (admin only).

## PUT /api/v1/admin/users/{did}/role
Assign/modify user role. Unknown DID is 404 (not 500).

## POST /api/v1/access/emergency-override
Emergency override (super admin only, fully audited).
Implemented in the access service (`AccessController`); gateway routes
`/api/v1/access/**` to the access service.
