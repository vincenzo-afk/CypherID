// SpatialEngine — pixel/character-level dithering overlay (docs/protection/rendering/05).
export class SpatialEngine {
  constructor(profile) {
    this.profile = profile;
  }

  drawOverlay(ctx, w, h, seedTick) {
    const intensity = this.profile.spatialDitherIntensity || 0;
    if (intensity <= 0) return;
    // Deterministic pseudo-random dots derived from tick — cheap interference
    // pattern that degrades camera/OCR capture while staying readable for humans.
    const count = Math.floor(w * h * intensity * 0.0004);
    ctx.save();
    ctx.globalAlpha = Math.min(0.5, intensity);
    ctx.fillStyle = '#000';
    let s = (seedTick + 1) * 2654435761;
    const rand = () => {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return ((s >>> 0) % 1000) / 1000;
    };
    for (let i = 0; i < count; i++) {
      const x = rand() * w;
      const y = rand() * h;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.restore();
  }
}
