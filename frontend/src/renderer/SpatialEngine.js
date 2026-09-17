// SpatialEngine — pixel/character-level dithering overlay (docs/protection/rendering/05).
// Deterministic per-tick noise + scanlines: cheap interference that degrades
// camera/OCR capture while staying readable for humans.
export class SpatialEngine {
  constructor(profile) {
    this.profile = profile;
  }

  drawOverlay(ctx, w, h, seedTick) {
    const intensity = this.profile.spatialDitherIntensity || 0;
    if (intensity <= 0) return;
    ctx.save();
    // 1. Deterministic pseudo-random dots derived from tick — cheap interference
    // pattern that degrades camera/OCR capture while staying readable for humans.
    // Scaled up ~3x from the original so HIGH/EXTREME photos actually break.
    const count = Math.floor(w * h * intensity * 0.0012);
    ctx.globalAlpha = Math.min(0.55, 0.25 + intensity);
    ctx.fillStyle = '#000';
    let s = (seedTick + 1) * 2654435761;
    const rand = () => {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return ((s >>> 0) % 1000) / 1000;
    };
    for (let i = 0; i < count; i++) {
      const x = rand() * w;
      const y = rand() * h;
      // 2x2 blocks read as sensor noise on cameras, invisible-ish to humans.
      ctx.fillRect(x, y, 2, 2);
    }
    // 2. Horizontal scanlines every 4px — moiré with camera Bayer sensors.
    ctx.globalAlpha = Math.min(0.22, 0.08 + intensity * 0.4);
    ctx.fillStyle = '#000';
    for (let y = (seedTick % 4); y < h; y += 4) {
      ctx.fillRect(0, y, w, 1);
    }
    ctx.restore();
  }
}
