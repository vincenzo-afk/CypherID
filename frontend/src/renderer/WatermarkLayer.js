// WatermarkLayer — session watermark overlay (docs/protection/watermark/*).
// Session-specific: displayId + userDisplay + timestamp. Position rotates per tick.
export class WatermarkLayer {
  constructor(profile) {
    this.profile = profile;
  }

  draw(ctx, w, h, watermark, tick) {
    if (!watermark) return;
    const text = `${watermark.displayId || ''} ${watermark.userDisplay || ''} ${watermark.contentId || ''} ${watermark.timestamp || ''}`.trim();
    if (!text) return;
    ctx.save();
    ctx.globalAlpha = this.profile.watermarkOpacity ?? 0.12;
    ctx.fillStyle = '#111';
    ctx.font = '14px sans-serif';
    // Tile the session marker across the full protected area. A small rotation
    // offset changes at each configured session rotation without obscuring text.
    ctx.rotate(-0.3 + ((tick % 4) - 1.5) * 0.02);
    const spacingX = Math.max(250, ctx.measureText(text).width + 72);
    const spacingY = 115;
    const shift = (tick % 4) * 21;
    for (let y = -h; y < h * 1.6; y += spacingY) {
      for (let x = -w; x < w * 1.6; x += spacingX) {
        ctx.fillText(text, x + shift, y + shift);
      }
    }
    ctx.restore();
  }
}
