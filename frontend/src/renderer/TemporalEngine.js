// TemporalEngine — frame-rate based modulation (docs/protection/rendering/04).
// Operates at display refresh rate; brightness variation capped at +/-30%.
import { clampBrightnessDelta } from './safety.js';

export class TemporalEngine {
  constructor(profile) {
    this.profile = profile;
    this.enabled = (profile.temporalFrequencyHz || 0) > 0;
  }

  // Returns a small brightness multiplier for the given timestamp.
  // Human readability is primary: modulation is subtle, never obscuring.
  modulationAt(timestampMs, seed = 0) {
    if (!this.enabled) return 1.0;
    const hz = this.profile.temporalFrequencyHz;
    const t = timestampMs / 1000;
    const phase = (t * hz + seed) * Math.PI * 2;
    // Base amplitude 4% scaled by profile, hard-capped at 30%.
    const raw = 0.04 + this.profile.spatialDitherIntensity * 0.2;
    const amp = clampBrightnessDelta(raw);
    return 1.0 + amp * Math.sin(phase) * 0.5;
  }
}
