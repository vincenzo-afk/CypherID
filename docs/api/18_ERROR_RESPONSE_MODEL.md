# Error Response Model

## Error Codes

### Identity Errors
| Code | HTTP | Description |
|:---|:---|:---|
| DID_NOT_FOUND | 404 | DID does not exist on ledger |
| DID_ALREADY_EXISTS | 409 | DID already registered |
| DID_SUSPENDED | 403 | DID is suspended |
| DID_REVOKED | 403 | DID is revoked |
| VC_NOT_FOUND | 404 | VC not found |
| VC_REVOKED | 403 | VC has been revoked |
| VC_EXPIRED | 403 | VC has expired |

### Access Errors
| Code | HTTP | Description |
|:---|:---|:---|
| ACCESS_DENIED_INSUFFICIENT_ROLE | 403 | Missing required role/VC |
| ACCESS_DENIED_ABAC_MISMATCH | 403 | ABAC attributes do not match |
| ACCESS_DENIED_DID_INACTIVE | 403 | DID not active |
| ACCESS_DENIED_TIME_RESTRICTION | 403 | Outside allowed time window |
| POLICY_NOT_FOUND | 404 | No policy for this resource |

### Asset Errors
| Code | HTTP | Description |
|:---|:---|:---|
| ASSET_NOT_FOUND | 404 | Asset does not exist |
| ASSET_NOT_OWNED | 403 | Requester does not own asset |
| ASSET_BURNED | 410 | Asset has been burned |
| IPFS_UPLOAD_FAILED | 503 | IPFS upload error |

### Protected Content Errors
| Code | HTTP | Description |
|:---|:---|:---|
| SESSION_EXPIRED | 401 | Protected session has expired |
| SESSION_OBSCURED | 403 | Session in CONTENT_OBSCURED state |
| SESSION_NOT_FOUND | 404 | Session does not exist |
| CHUNK_OUT_OF_RANGE | 400 | Requested chunk index invalid |

### System Errors
| Code | HTTP | Description |
|:---|:---|:---|
| FABRIC_UNAVAILABLE | 503 | Blockchain network unavailable |
| INTERNAL_ERROR | 500 | Unexpected server error |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
