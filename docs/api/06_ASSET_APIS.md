# Asset APIs

## POST /api/v1/assets
Upload and mint a new asset.

**Request:** `multipart/form-data`
- `file`: binary file
- `classification`: UNCLASSIFIED | CONFIDENTIAL | SECRET | TOP_SECRET
- `policyId`: access policy to bind

**Response 201:**
```json
{
  "assetId": "...",
  "ipfsHash": "Qm...",
  "txHash": "...",
  "ownerDID": "did:cypherid:0x..."
}
```

---

## GET /api/v1/assets/{assetId}
Get asset metadata (not content).

**Response 200:**
```json
{
  "assetId": "...",
  "ownerDID": "...",
  "classification": "SECRET",
  "status": "ACTIVE",
  "createdAt": "ISO-8601"
}
```

---

## POST /api/v1/assets/{assetId}/transfer
Transfer asset ownership.

**Request:**
```json
{
  "toDID": "did:cypherid:0x...",
  "ownerSignature": "..."
}
```

**Response 200:** `{ "txHash": "...", "newOwner": "did:cypherid:0x..." }`

---

## DELETE /api/v1/assets/{assetId}
Burn (destroy) an asset.

**Request:**
```json
{ "ownerSignature": "..." }
```

**Response 200:** `{ "txHash": "...", "status": "BURNED" }`

---

## GET /api/v1/assets/{assetId}/history
Get full provenance chain for an asset.

**Response 200:**
```json
{
  "history": [
    { "event": "MINTED", "actor": "did:...", "timestamp": "...", "txHash": "..." },
    { "event": "TRANSFERRED", "actor": "did:...", "timestamp": "...", "txHash": "..." }
  ]
}
```
