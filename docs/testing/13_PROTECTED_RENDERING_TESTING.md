# Protected Rendering Testing

## Unit Tests (Jest)

### RT-01: ProtectedRenderer renders without error
- Initialize renderer with mock session data
- Expected: canvas element rendered, no exceptions

### RT-02: Watermark layer applies watermark text
- Mock watermark data
- Expected: watermark text drawn to canvas

### RT-03: Temporal effects respect safety limits
- Configure temporal frequency > 60 Hz
- Expected: clamped to 60 Hz

### RT-04: Fallback on Canvas unavailable
- Mock canvas API as unavailable
- Expected: CSS fallback applied, fallback logged

### RT-05: Security event dispatched on tab hidden
- Trigger visibilitychange event
- Expected: onSecurityEvent called with TAB_HIDDEN

### RT-06: Content obscured in CONTENT_OBSCURED state
- Set session state to CONTENT_OBSCURED
- Expected: canvas shows obscuration overlay, no content visible

## Browser Tests (Playwright)

### BT-01: Protected document viewer loads
- Navigate to protected document
- Expected: canvas renders, watermark visible

### BT-02: Session expiry triggers re-auth
- Wait for session to expire
- Expected: content obscured, re-authorization prompt shown

### BT-03: Tab hidden triggers event log
- Load protected document, switch tab
- Expected: security event logged (verify via API)

## Camera Resistance Tests
See `docs/camera-resistance-lab/` for physical and measurement-based tests.
