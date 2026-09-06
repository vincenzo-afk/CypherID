# Admin APIs

## POST /api/v1/admin/organizations
Register new organization (super admin only).

## PUT /api/v1/admin/users/{did}/role
Assign/modify user role.

## POST /api/v1/access/emergency-override
Emergency override (super admin only, fully audited).
Implemented in the access service (`AccessController`); gateway routes
`/api/v1/access/**` to the access service.
