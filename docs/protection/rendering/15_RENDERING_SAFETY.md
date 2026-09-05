# Rendering Safety

## Flicker Safety

### Risk
Flicker at 3–30 Hz can trigger photosensitive seizures in susceptible individuals.
ISO 9241-391 and W3C WCAG 2.3.1 define safety thresholds.

### Hard Limits
- Temporal effects MUST operate at ≥ 60 Hz display refresh rate
- Temporal frequency for content modulation MUST be ≥ 15 Hz (above human flicker perception)
- Brightness variation MUST NOT exceed ±30% at EXTREME profile (to avoid extreme contrast flicker)
- The renderer MUST implement a configurable brightness variation ceiling
- If display refresh rate cannot be confirmed ≥ 60 Hz, temporal effects are disabled

### Implementation Requirement
```javascript
// Required check before enabling temporal effects
if (screen.displayRefreshRate < 60 || !isTrustedRefreshRate()) {
  config.temporalEffects = false;
  logFallback("TEMPORAL_DISABLED_REFRESH_RATE");
}
```

## Accessibility
- Default protection profile for general document viewing: MEDIUM (not EXTREME)
- Administrators can configure per-document profile
- Users reporting photosensitivity: LOW profile available (disables temporal effects)
- All protection profiles disable effects when prefers-reduced-motion is set

## Degradation Policy
When a protection technique cannot be applied safely, it is DISABLED, not approximated with an unsafe alternative.
