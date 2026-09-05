# API Conventions

## Base URL
`https://{host}/api/v1`

## Versioning
URL-based versioning: `/api/v1/`, `/api/v2/`
Current version: v1

## Authentication
All endpoints except `/api/v1/auth/**` require:
`Authorization: Bearer {accessToken}`

## Content Type
`Content-Type: application/json` for all request/response bodies.
`Content-Type: application/octet-stream` for binary chunk delivery.

## Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "requestId": "uuid",
  "timestamp": "ISO-8601"
}
```

## Error Response
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "DID_NOT_FOUND",
    "message": "The specified DID does not exist",
    "details": {}
  },
  "requestId": "uuid",
  "timestamp": "ISO-8601"
}
```

## HTTP Status Codes
| Code | Meaning |
|:---|:---|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid JWT) |
| 403 | Forbidden (access denied) |
| 404 | Not Found |
| 409 | Conflict (duplicate resource) |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 503 | Service Unavailable (Fabric down) |

## Pagination
`GET` list endpoints: `?page=0&size=20&sort=createdAt,desc`
Response includes: `totalElements`, `totalPages`, `content[]`

## Idempotency
`POST` requests that create resources accept `Idempotency-Key: {uuid}` header.
Duplicate requests with same key return the original response.
