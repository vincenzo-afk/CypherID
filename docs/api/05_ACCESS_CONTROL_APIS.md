# Access Control APIs

## POST /api/v1/access/request
Request access to a resource.

**Request:**
```json
{
  "resourceId": "DRDO-DOC-007",
  "action": "READ",
  "contextAttributes": {
    "ipAddress": "192.168.1.1",
    "deviceId": "device-uuid"
  }
}
```

**Response 200 (GRANTED):**
```json
{
  "decision": "GRANTED",
  "sessionToken": "eyJ...",
  "txHash": "...",
  "expiresAt": "ISO-8601"
}
```

**Response 403 (DENIED):**
```json
{
  "decision": "DENIED",
  "reason": "INSUFFICIENT_CLEARANCE",
  "txHash": "..."
}
```

---

## POST /api/v1/access/policies
Create an access policy (admin only).

**Request:**
```json
{
  "resourceId": "DRDO-DOC-007",
  "requiredRole": "CLEARANCE_LEVEL_3",
  "abacAttributes": { "department": "DRDO" },
  "action": "READ"
}
```

**Response 201:** `{ "policyId": "...", "txHash": "..." }`

---

## GET /api/v1/access/policies/{resourceId}
Get access policy for a resource (admin only).

---

## POST /api/v1/access/delegate
Delegate access to another user (within own permissions).

**Request:**
```json
{
  "toDID": "did:cypherid:0x...",
  "resourceId": "DRDO-DOC-007",
  "action": "READ",
  "expiresAt": "ISO-8601"
}
```
