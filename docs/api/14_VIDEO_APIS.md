# Video APIs

## POST /api/v1/videos/{videoId}/session
Start protected video playback session (access-checked, minimum MEDIUM profile).

**Response 201:** `{ "sessionId": "...", "sessionToken": "...", "expiresAt": "...", ... }`

## GET /api/v1/videos/chunk
Hint endpoint — actual bytes flow through the protected session pipeline.

**Query:** `?sessionId={id}&chunk={n}`

**Response 200:**
```json
{ "sessionId": "...", "chunk": 0, "fetchVia": "/api/v1/protected-content/chunk?chunk=0", "note": "Pass session JWT as Bearer token" }
```

Clients must fetch content bytes from `/api/v1/protected-content/chunk`
with `Authorization: Bearer {sessionToken}`.
