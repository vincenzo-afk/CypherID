# Watermark Architecture

## Purpose
Watermarks provide forensic traceability. Even when camera capture succeeds, the watermark identifies the originating session, enabling investigation of leaks.

## Watermark Contains
| Field | Description |
|:---|:---|
| `sessionId` | Unique session identifier (truncated for display) |
| `userId` | User display name or DID prefix |
| `contentId` | Document/exam/video identifier |
| `timestamp` | Session start timestamp |
| `randomToken` | Session-specific random token |

## Watermark Types
1. **Visible watermark** — semi-transparent text overlay, always visible
2. **Steganographic watermark** — hidden in rendered pixels (advanced, lab research)

## Rendering
Watermarks are rendered by the browser-side WatermarkLayer in the ProtectedRenderer.
Watermark data is provided by backend (never generated client-side from sensitive data).

## Privacy
Watermark MUST NOT expose:
- Full user DID or personal identifying information
- Internal system identifiers
- Clearance levels or sensitive metadata

Watermark exposes: truncated session ID, truncated user identifier, timestamp, document ID.
