# Protected Content Service

## Responsibility
ProtectedContentService is the ONLY service that handles decrypted content delivery.
It is the trust boundary between encrypted storage and the browser renderer.

## Operations

### issueSession
- Validates access decision from Access Service
- Creates ProtectedSession record
- Returns session token (not content)

### getContentChunk
- Validates session token
- Validates session state
- Retrieves encrypted content from IPFS (via AssetService)
- Decrypts in-process (AES-256-GCM)
- Returns decrypted chunk to browser
- Increments chunk access counter

### invalidateSession
- Marks session as EXPIRED
- Logs session closure

## Security Properties
- No decryption keys are returned to browser
- No full document is returned in one response (chunked delivery)
- Session token does not identify content (prevents content fishing)
- All requests logged
