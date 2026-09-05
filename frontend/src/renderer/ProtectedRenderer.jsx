// ProtectedRenderer — Canvas-based camera-resistance engine.
// Per docs/protection/rendering/01_CAMERA_RESISTANCE_RENDERER.md:
//   ProtectedRenderer -> TemporalEngine + SpatialEngine + PatternEngine +
//   WatermarkLayer + ContentLayer. Human readability is the primary constraint.
// Safety: temporal effects disabled when unsafe (see safety.js). No claims that
// screenshots or camera capture are prevented (see docs/06_NON_GOALS.md).
import { useEffect, useRef } from 'react';
import { TemporalEngine } from './TemporalEngine.js';
import { SpatialEngine } from './SpatialEngine.js';
import { PatternEngine } from './PatternEngine.js';
import { WatermarkLayer } from './WatermarkLayer.js';
import { ContentLayer } from './ContentLayer.js';
import { getProfile } from './profiles.js';
import { isTemporalAllowed } from './safety.js';
import { canvasAvailable } from './fallbacks.js';

export default function ProtectedRenderer({
  lines = [],
  profile = 'MEDIUM',
  watermark = null,
  sessionSeed = 0,
  obscured = false,
  onFallback = null
}) {
  const canvasRef = useRef(null);
  const prof = getProfile(profile);

  useEffect(() => {
    if (!canvasAvailable()) {
      onFallback && onFallback('CANVAS_UNAVAILABLE');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const temporal = new TemporalEngine(prof);
    const spatial = new SpatialEngine(prof);
    const pattern = new PatternEngine(prof);
    const wm = new WatermarkLayer(prof);
    const content = new ContentLayer();

    const temporalCheck = isTemporalAllowed(prof);
    if (!temporalCheck.allowed) {
      temporal.enabled = false;
      onFallback && onFallback(`TEMPORAL_DISABLED_${temporalCheck.reason}`);
    }

    let raf = 0;
    let tick = 0;
    let lastRotation = performance.now();
    const rotationMs = prof.parameterRotationIntervalMs;

    const renderFrame = (ts) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (obscured) {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fff';
        ctx.font = '18px sans-serif';
        ctx.fillText('Content obscured — re-authorization required.', 24, 48);
      } else {
        if (ts - lastRotation > rotationMs) {
          tick += 1;
          lastRotation = ts;
        }
        const brightness = temporal.modulationAt(ts, sessionSeed);
        pattern.drawBackground(ctx, w, h, ts);
        content.draw(ctx, w, h, lines, brightness);
        spatial.drawOverlay(ctx, w, h, tick + sessionSeed);
        wm.draw(ctx, w, h, watermark, tick);
      }
      raf = requestAnimationFrame(renderFrame);
    };
    raf = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, obscured, sessionSeed, JSON.stringify(lines), JSON.stringify(watermark)]);

  return (
    <canvas
      ref={canvasRef}
      width={900}
      height={600}
      style={{ width: '100%', border: '1px solid #ccc', background: '#fff' }}
      aria-label="Protected content renderer. Camera-resistant rendering reduces readability of captured copies; it does not prevent photography or screenshots."
    />
  );
}
