# Credential APIs

## POST /api/v1/identity/credentials
Issue a Verifiable Credential (org admin only).

**Request:**
```json
{
  "subjectDID": "did:cypherid:0x...",
  "credentialType": "SecurityClearance",
  "attributes": {
    "clearanceLevel": 3,
    "department": "DRDO",
    "location": "HYD"
  },
  "expirationDate": "2025-01-01T00:00:00Z"
}
```

**Response 201:**
```json
{
  "vcId": "vc:cypherid:...",
  "vc": { ... },
  "txHash": "..."
}
```

---

## GET /api/v1/identity/credentials/{did}
List all VCs for a DID (authenticated user can see own VCs; admin can see any).

**Response 200:**
```json
{
  "credentials": [ { "vcId": "...", "type": "...", "status": "ACTIVE", "expiresAt": "..." } ]
}
```

---

## DELETE /api/v1/identity/credentials/{vcId}
Revoke a VC (issuer org admin only).

**Response 200:** `{ "txHash": "...", "status": "REVOKED" }`

---

## POST /api/v1/identity/credentials/verify
Verify a presented VC.

**Request:**
```json
{ "vc": { ... } }
```

**Response 200:**
```json
{ "valid": true, "reason": null }
```
