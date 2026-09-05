// ContentLayer — renders authorized plaintext chunks onto canvas.
// Content arrives only via authorized chunked delivery (session JWT); the
// renderer never requests keys from the ledger (see docs/AGENTS.md constraint).
export class ContentLayer {
  draw(ctx, w, h, lines, brightness = 1.0) {
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.font = '16px sans-serif';
    const lineHeight = 24;
    let y = 40;
    // Apply subtle brightness modulation without harming readability.
    const shade = Math.max(0, Math.min(255, Math.round(17 * brightness)));
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    for (const line of lines || []) {
      ctx.fillText(String(line).slice(0, 120), 24, y);
      y += lineHeight;
      if (y > h - 20) break;
    }
    ctx.restore();
  }
}
