// WatermarkLayer — session watermark overlay (docs/protection/watermark/*).
// Session-specific: displayId + userDisplay + timestamp. Position rotates per tick.
export class WatermarkLayer {
  constructor(profile) {
    this.profile = profile;
  }

  draw(ctx, w, h, watermark, tick) {
    if (!watermark) return;
    const text = `${watermark.displayId || ''} ${watermark.userDisplay || ''} ${watermark.timestamp || ''}`.trim();
    if (!text) return;
    ctx.save();
    ctx.globalAlpha = this.profile.watermarkOpacity ?? 0.12;
    ctx.fillStyle = '#111';
    ctx.font = '14px sans-serif';
    const positions = [
      [w * 0.08, h * 0.2], [w * 0.55, h * 0.35],
      [w * 0.2, h * 0.6], [w * 0.6, h * 0.8]
    ];
    const p = positions[tick % positions.length];
    ctx.translate(p[0], p[1]);
    ctx.rotate(-0.3);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
}
