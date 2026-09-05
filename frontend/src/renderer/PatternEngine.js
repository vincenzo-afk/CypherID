// PatternEngine — dynamic background/foreground patterns incl. rolling-shutter
// interference bars (docs/protection/rendering/10). Subtle by design.
export class PatternEngine {
  constructor(profile) {
    this.profile = profile;
  }

  drawBackground(ctx, w, h, timestampMs) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    if (this.profile.rollingShutterEnabled) {
      const t = timestampMs / 1000;
      const y = (t * 60) % (h + 40);
      ctx.globalAlpha = 0.04;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, y - 20, w, 8);
    }
    // Faint diagonal lines — spatial interference, human-readable.
    ctx.globalAlpha = 0.03;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let x = -h; x < w; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + h, h);
      ctx.stroke();
    }
    ctx.restore();
  }
}
