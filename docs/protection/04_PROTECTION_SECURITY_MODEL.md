# Protection Security Model

## Layered Defense

```
Layer 1: Authentication — Who is the user?
Layer 2: Authorization — Are they allowed this content?
Layer 3: Encryption — Is content encrypted in transit and at rest?
Layer 4: Expiring Sessions — Is the session still valid?
Layer 5: Dynamic Watermarking — Is the session traceable?
Layer 6: Protected Rendering — Is camera capture made difficult?
Layer 7: Capture Monitoring — Is suspicious activity detected?
Layer 8: Audit Logging — Is every event recorded?
```

## Security Model Boundaries

### Browser Cannot Prevent
- OS-level screen recording (Windows/macOS/Linux snipping tools)
- VM-level screen capture
- Physical camera pointing at display

### Browser Can Do (Where APIs Exist)
- Detect visibility change (tab hidden)
- Detect focus loss
- Detect fullscreen exit
- Apply CSS `user-select: none` (text selection)
- Apply CSS `-webkit-user-drag: none` (drag prevention)
- Apply `pointer-events: none` to content layer
- Disable right-click context menu
- Apply rendering techniques that interfere with camera shutter timing

### Browser Cannot Guarantee
- That CSS/JS protections are not bypassed by browser extensions
- That canvas content is not captured by OS tools
- That WebGL frames are not captured

## Explicit Limitations Document
See `docs/protection/capture/08_CAPTURE_LIMITATIONS.md` for complete limitations.
