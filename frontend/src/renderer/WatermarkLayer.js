// WatermarkLayer — session watermark overlay (docs/protection/watermark/*).
// Session-specific: displayId + userDisplay + timestamp. Position rotates per tick.
export class WatermarkLayer {
  constructor(profile) {
    this.profile = profile;
  }

  draw(ctx, w, h, watermark, tick) {
    if (!watermark) return;
    const text = String((watermark.displayId||'')+' '+(watermark.userDisplay||'')+' '+(watermark.contentId||'')+' '+(watermark.timestamp||'')).trim();
    if (!text) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0.16, this.profile.watermarkOpacity ?? 0.12);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 15px sans-serif';
    const passes = [{a:-0.3+((tick%4)-1.5)*0.02,s:0},{a:-0.3+Math.PI/2,s:40}];
    for (const pass of passes) {
      ctx.save();
      ctx.translate(w/2,h/2);
      ctx.rotate(pass.a);
      ctx.translate(-w/2,-h/2);
      const spacingX = Math.max(220, ctx.measureText(text).width+60);
      const spacingY = 95;
      const shift = (((tick%4)*21)+pass.s)%spacingX;
      for (let y=-h;y<h*1.6;y+=spacingY){for(let x=-w;x<w*1.6;x+=spacingX){ctx.fillText(text,x+shift,y+shift);}}
      ctx.restore();
    }
    ctx.restore();
  }
}
