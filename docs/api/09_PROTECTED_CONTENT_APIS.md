# Protected Content APIs

## GET /api/v1/protected-content/chunk
Retrieve a content chunk for an authorized protected session.

**Headers:** `Authorization: Bearer {sessionToken}` (session JWT, not access JWT)

**Query:** `?chunk={index}`

**Response 200:** `Content-Type: application/octet-stream` — binary chunk data

**Errors:**
- 401: Invalid or expired session token
- 403: Session in CONTENT_OBSCURED state
- 404: Chunk index out of range
- 429: Chunk request rate exceeded

---

## GET /api/v1/protected-content/session-info
Get session metadata (not content).

**Headers:** `Authorization: Bearer {sessionToken}`

**Response 200:**
```json
{
  "sessionId": "uuid",
  "contentId": "DRDO-DOC-007",
  "contentType": "DOCUMENT",
  "profile": "HIGH",
  "totalChunks": 12,
  "expiresAt": "ISO-8601",
  "state": "PROTECTED_VIEW",
  "watermark": {
    "displayId": "A3F7B21C",
    "userDisplay": "U:4a3b",
    "timestamp": "20240101-1430"
  }
}
```

---

## POST /api/v1/protected-content/session/{sessionId}/event
Report a browser security event.

**Request:**
```json
{
  "eventType": "TAB_HIDDEN",
  "timestamp": "ISO-8601",
  "metadata": {}
}
```

**Response 200:**
```json
{
  "newState": "SUSPICIOUS_ACTIVITY",
  "action": "CONTINUE"
}
```
