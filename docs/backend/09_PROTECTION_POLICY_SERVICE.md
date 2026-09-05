# Protection Policy Service

## Part of
`asset-service` package (`com.cypherid.asset.protection`)

## Responsibilities
- Store and retrieve protection policy per resource (document/exam/video)
- Map resource classification → default protection profile
- Allow admin override of protection profile per resource

## Data
Stored in PostgreSQL `resource_protection_policies` table:
```sql
CREATE TABLE resource_protection_policies (
  resource_id VARCHAR(255) PRIMARY KEY,
  resource_type VARCHAR(20) NOT NULL,
  protection_profile VARCHAR(20) NOT NULL,
  set_by_did VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
