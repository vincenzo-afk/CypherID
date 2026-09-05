// Fallbacks — docs/protection/rendering/13_RENDERING_FALLBACKS.md
// When a technique cannot be applied safely, it is DISABLED with a logged reason.
export const FALLBACK_REASONS = {
  TEMPORAL_DISABLED_REFRESH_RATE: 'TEMPORAL_DISABLED_REFRESH_RATE',
  TEMPORAL_DISABLED_REDUCED_MOTION: 'TEMPORAL_DISABLED_REDUCED_MOTION',
  WEBGL_UNAVAILABLE: 'WEBGL_UNAVAILABLE',
  CANVAS_UNAVAILABLE: 'CANVAS_UNAVAILABLE'
};

export function canvasAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c && c.getContext && c.getContext('2d'));
  } catch {
    return false;
  }
}
