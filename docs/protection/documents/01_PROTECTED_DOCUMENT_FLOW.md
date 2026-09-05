# Protected Document Flow

```
User clicks "View Document" (Asset Hub)
    ↓
GET /api/assets/{assetId}/protected-session
    ↓
Access Service: evaluateAccess(did, assetId, READ)
    ↓
[DENIED] → 403 + reason code displayed to user
[GRANTED] →
    ↓
ProtectedSessionService.issueSession(userDID, assetId, DOCUMENT, profile)
    ↓
Return: sessionToken (JWT, 15-30 min TTL)
    ↓
Frontend: initialize ProtectedRenderer with sessionToken
    ↓
GET /api/protected-content/chunk?session={token}&chunk={n}
    ↓
ProtectedContentService:
  - validate session token
  - check session state (not OBSCURED)
  - retrieve from IPFS
  - decrypt AES-256-GCM
  - return chunk bytes
    ↓
ProtectedRenderer: render chunk with protection profile
WatermarkLayer: overlay session watermark
    ↓
User reads document in protected renderer
```

## Document Authorization
Documents MUST have an on-chain asset record AND an access policy before protected access is granted.
See `docs/access-control/` for policy model.
