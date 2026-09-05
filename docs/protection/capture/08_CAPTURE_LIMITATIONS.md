# Capture Limitations

## Definitive Statement of Limitations

### Cannot Be Prevented by This System

1. **Physical camera pointed at display** — Any camera can photograph the physical display. Software cannot prevent this.
2. **OS-level screen recording** — Windows Snip, macOS screenshot, OBS, ShareX, and similar tools operate below the browser level.
3. **VM-level screen capture** — Hypervisor-level capture is invisible to the browser.
4. **Compromised browser** — A modified or extension-compromised browser can intercept canvas content before protection is applied.
5. **Accessible browser APIs** — Screen sharing via `getDisplayMedia()` API provides full, unprotected access.

### May Be Partially Mitigated

1. **Phone camera** — Camera-resistance rendering may reduce readability of captured content. Effectiveness varies by profile, device, display, distance, and angle.
2. **Screen recording at browser level** — Temporal and spatial techniques may reduce readability of captured frames. Browser-level recording tools may capture cleaner frames.

### Can Be Detected (Browser Level)

1. Tab visibility changes
2. Window focus changes
3. Print dialog (beforeprint event)
4. Fullscreen changes
5. Some keyboard shortcut presses

Detection triggers security event logging, not content prevention.

## Correct Claims

✓ "This system applies camera-resistant rendering that may reduce the readability of unauthorized captures."
✓ "Watermarking enables forensic identification of the session from which content was captured."
✓ "Browser-observable events are monitored and logged."

✗ "This system prevents screen recording."
✗ "Screenshots are not possible."
✗ "Camera capture is prevented."
