# ADR-0008: Protected Rendering Approach

**Status:** Accepted

## Context
Need to protect displayed classified content from camera capture and screen recording.

## Decision
Implement a browser-side Canvas/WebGL rendering engine with:
1. Temporal modulation at display refresh rate
2. Spatial dithering and pattern overlay
3. Session-specific rendering parameters
4. Dynamic watermarking

## Rationale
- No hardware required (per requirements)
- Canvas API available in all modern browsers
- Temporal techniques exploit camera rolling shutter timing
- Spatial techniques disrupt OCR character recognition
- Combination of techniques more effective than any single technique

## Alternatives Considered
- CSS-only protection: rejected — insufficient against camera
- Server-side rendered video stream: rejected — performance overhead, latency
- Hardware DRM (Widevine): rejected — requires browser plugin, complex integration

## Consequences
- Cannot prevent OS-level screen recording (documented limitation)
- Cannot prevent physical camera with global shutter at matching frame rate
- Performance overhead measurable (target < 10% CPU overhead)
- Flicker safety requires careful parameter limits

## Research Dependency
Effectiveness of techniques is empirically evaluated in Camera Resistance Lab.
Claims about protection capability are based on measured results, not assumptions.
