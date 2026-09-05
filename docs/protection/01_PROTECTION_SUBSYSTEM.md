# Protection Subsystem

## Purpose
The Camera-Resistant Protected Content subsystem provides a layered software-based defense against unauthorized capture and reproduction of sensitive content displayed through CypherID's web interface.

## What It Is
A multi-layer software rendering system that:
1. Authenticates and authorizes content access (backend)
2. Issues short-lived, session-bound content delivery tokens (backend)
3. Delivers content in chunks to an authorized browser session (backend)
4. Renders content with camera-resistance techniques (browser-side)
5. Overlays dynamic session-specific watermarks (browser-side)
6. Monitors browser-observable capture events (browser-side)
7. Logs all security events (backend + blockchain)

## What It Is NOT
- A mathematical guarantee against camera capture
- A solution that prevents OS-level screen recording
- A solution requiring special hardware or glasses
- A DRM system equivalent to Widevine/PlayReady

## Correct Description
> "Camera-resistant protected rendering designed to reduce the readability and usefulness of captured content while maintaining human readability."

## Integration Points
- Uses `ProtectedSessionService` for session lifecycle
- Uses `WatermarkService` for watermark generation
- Uses `ProtectedContentService` for authorized content delivery
- Uses `SecurityEventService` for event logging
- Integrated with Audit Service for blockchain event recording
