# Protected Session Architecture

## Session Model
A protected session is a time-limited, cryptographically bound authorization to view specific protected content.

## Session Components
| Component | Type | Description |
|:---|:---|:---|
| `sessionId` | UUID | Unique session identifier |
| `userDID` | String | Authorized user's DID |
| `contentId` | String | Asset or exam or video ID |
| `contentType` | Enum | DOCUMENT / EXAM / VIDEO |
| `sessionSeed` | 256-bit random | Seed for rendering parameters |
| `watermarkId` | UUID | Watermark identifier |
| `protectionProfile` | Enum | LOW / MEDIUM / HIGH / EXTREME |
| `issuedAt` | Timestamp | Session creation time |
| `expiresAt` | Timestamp | Session expiration time |
| `state` | Enum | AUTHORIZED / PROTECTED_VIEW / SUSPICIOUS_ACTIVITY / CONTENT_OBSCURED |

## Session Token
Short-lived JWT (15 minutes default for MEDIUM profile) signed by ProtectedSessionService.
Does NOT contain content or decryption keys.

## Content Delivery
Content served in chunks via session token. Each chunk request validates:
1. Session token valid and not expired
2. Session not in CONTENT_OBSCURED state
3. Chunk index within allowed range
4. Request rate within limits

## Session Storage
Sessions stored in Redis (fast expiry) + PostgreSQL (audit record).

## Session Parameters Change
Rendering seed and watermark position parameters are rotated every 5 minutes within a session.
