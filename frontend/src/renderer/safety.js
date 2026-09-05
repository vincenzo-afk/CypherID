// Rendering safety — hard limits from docs/protection/rendering/15_RENDERING_SAFETY.md
// Flicker at 3-30 Hz can trigger photosensitive seizures. Temporal effects MUST
// operate safely: >= 60 Hz refresh, modulation >= 15 Hz, brightness delta <= 30%.

export const SAFETY = {
  MIN_REFRESH_HZ: 60,
  MIN_TEMPORAL_HZ: 15,
  MAX_BRIGHTNESS_DELTA: 0.3
};

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Best-effort refresh-rate check. If it cannot be confirmed >= 60 Hz,
// temporal effects MUST be disabled (degradation policy: disable, never approximate).
export function isTemporalAllowed(profile) {
  if (prefersReducedMotion()) return { allowed: false, reason: 'PREFERS_REDUCED_MOTION' };
  if (!profile || profile.temporalFrequencyHz <= 0) return { allowed: false, reason: 'PROFILE_TEMPORAL_OFF' };
  if (profile.temporalFrequencyHz < SAFETY.MIN_TEMPORAL_HZ) {
    return { allowed: false, reason: 'TEMPORAL_BELOW_15HZ' };
  }
  return { allowed: true, reason: 'OK' };
}

export function clampBrightnessDelta(delta) {
  return Math.max(0, Math.min(SAFETY.MAX_BRIGHTNESS_DELTA, delta));
}
