// PatternEngine — dynamic background/foreground patterns incl. rolling-shutter
// interference bars (docs/protection/rendering/10). Camera-hostile by design:
// high-contrast moiré + moving shutter bands alias with camera sensors/OCR,
// while staying human-readable on screen. Human readability stays primary.
export class PatternEngine {
  constructor(profile) {
    this.profile = profile;
  }

  drawBackground(ctx, w, h, timestampMs) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    const t = timestampMs / 1000;
    // 1. Fine moiré grid — the core camera/OCR killer (aliases on resample).
    const step = 7;
    ctx.globalAlpha = 0.10;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = 0; y <= h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
    // 2. Diagonal cross-hatch over the grid (breaks OCR line segmentation).
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = '#333';
    for (let x = -h; x < w; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + h, h);
      ctx.stroke();
    }
    if (this.profile.rollingShutterEnabled) {
      // 3. TWO moving shutter bands (not one): opposite directions + phase from
      // time so every camera frame catches a band mid-text.
      const y1 = (t * 140) % (h + 60);
      const y2 = h - ((t * 110) % (h + 60));
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, y1 - 30, w, 22);
      ctx.fillRect(0, y2 - 30, w, 22);
      ctx.globalAlpha = 0.08;
      ctx.fillRect(0, y1 - 52, w, 10);
      ctx.fillRect(0, y2 + 8, w, 10);
    } else {
      // LOW/MEDIUM: single faint drifting band so photos still catch artifacts.
      const y = (t * 60) % (h + 40);
      ctx.globalAlpha = 0.05;
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
