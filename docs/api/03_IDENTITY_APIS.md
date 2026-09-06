# Identity APIs

## POST /api/v1/identity/did
Create a new DID (triggers KYC + Fabric CA enrollment).
Server generates the keypair and derives the DID — clients never supply key material.

**Request:**
```json
{
  "organization": "DRDO",
  "department": "R&D",
  "kycData": { "name": "...", "employeeId": "..." }
}
```

**Response 201:**
```json
{
  "did": "did:cypherid:0x...",
  "didDocument": { ... },
  "txHash": "0x..."
}
```

---

## GET /api/v1/identity/did/{did}
Resolve a DID document.

**Response 200:**
```json
{
  "didDocument": { ... },
  "status": "ACTIVE",
  "resolvedAt": "ISO-8601"
}
```

**Errors:** 404 (DID not found)

---

## PUT /api/v1/identity/did/{did}/suspend
Suspend a DID (admin only).

**Request:**
```json
{ "reason": "..." }
```

**Response 200:** `{ "txHash": "...", "status": "SUSPENDED" }`

---

## PUT /api/v1/identity/did/{did}/revoke
Revoke a DID permanently (admin only).

**Request:**
```json
{ "reason": "..." }
```

**Response 200:** `{ "txHash": "...", "status": "REVOKED" }`
