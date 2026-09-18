import { useEffect, useMemo, useRef } from 'react';
import { Box, GlobalStyles, Typography } from '@mui/material';

// GenesisCore — "Identity Genesis" visualization for the register page.
// A fingerprint arc pattern whose particles start scattered and assemble
// toward their arcs as `progress` (0..1) rises with form completion.
// Canvas 2D only, no dependencies. Honors prefers-reduced-motion: the
// assembly still eases in (it is input-driven, not decorative) but ambient
// drift and pulse animations are disabled.

const KEYFRAMES = `
@keyframes genesisPulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .genesis-dot { animation: none !important; }
}
`;

const REDUCED = typeof window !== 'undefined'
  && window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Fingerprint: concentric broken arcs with per-ring rotation offsets so the
// pattern reads as a print rather than plain circles.
function arcSeeds() {
  const seeds = [];
  const rings = 6;
  for (let r = 0; r < rings; r++) {
    const radius = 34 + r * 26;
    const gap = 0.5 + ((r * 0.9) % 1.4); // arc sweep varies per ring
    const rot = (r * 137.5 * Math.PI) / 180;
    const count = 14 + r * 6;
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const ang = rot + t * Math.PI * 2 * (1 - gap / rings);
      seeds.push({
        tx: Math.cos(ang) * radius,
        ty: Math.sin(ang) * radius * 1.15, // slight oval = fingerprint feel
        ring: r
      });
    }
  }
  return seeds;
}

export default function GenesisCore({ size = 420, progress = 0, complete = false }) {
  const canvasRef = useRef(null);
  const progressRef = useRef(progress);
  const completeRef = useRef(complete);
  const seeds = useMemo(arcSeeds, []);

  progressRef.current = progress;
  completeRef.current = complete;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const frac = (n) => ((Math.sin(n) * 43758.5453) % 1 + 1) % 1 - 0.5; // -0.5..0.5
    const cx0 = size / 2;
    const cy0 = size / 2;

    const particles = seeds.map((s, i) => ({
      ...s,
      x: cx0 + frac(i * 12.9898) * size * 1.1,
      y: cy0 + frac(i * 78.233) * size * 1.1,
      vx: 0, vy: 0,
      hue: 190 + ((s.ring * 13 + i) % 40) // cyan → blue → violet spread
    }));

    let raf = 0;
    let t = 0;

    const draw = () => {
      t += 1;
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;
      const p = progressRef.current;
      const done = completeRef.current;

      for (const pt of particles) {
        const tx = cx + pt.tx;
        const ty = cy + pt.ty;
        const pull = 0.008 + p * 0.14;
        pt.vx = (pt.vx + (tx - pt.x) * pull) * 0.86;
        pt.vy = (pt.vy + (ty - pt.y) * pull) * 0.86;
        if (!REDUCED) {
          pt.x += pt.vx + Math.sin((t + pt.tx) * 0.01) * 0.12 * (1 - p);
          pt.y += pt.vy + Math.cos((t + pt.ty) * 0.011) * 0.12 * (1 - p);
        } else {
          pt.x += (tx - pt.x) * Math.min(1, p * 0.2);
          pt.y += (ty - pt.y) * Math.min(1, p * 0.2);
        }

        const dist = Math.hypot(tx - pt.x, ty - pt.y);
        const settled = Math.max(0, 1 - dist / 160);
        const alpha = 0.16 + settled * 0.6;
        const r = 1 + settled * 1.1;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${pt.hue}, 90%, ${done ? 72 : 64}%, ${alpha})`;
        ctx.fill();
      }

      // thin connection lines between near-settled particles
      if (p > 0.15) {
        ctx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i += 3) {
          const a = particles[i];
          for (let j = i + 1; j < Math.min(i + 9, particles.length); j += 3) {
            const b = particles[j];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < 30) {
              ctx.strokeStyle = `rgba(90,160,255,${(1 - d / 30) * 0.12 * p})`;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
      }

      // soft core glow once mostly formed
      if (p > 0.5) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
        g.addColorStop(0, `rgba(80,170,255,${0.16 * (p - 0.5) * 2})`);
        g.addColorStop(1, 'rgba(80,170,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx - 60, cy - 60, 120, 120);
      }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [size, seeds]);

  const status = complete || progress >= 0.99 ? 'READY TO GENERATE' : progress > 0 ? 'FORMING' : 'READY';
  const statusColor = complete || progress >= 0.99 ? '#34d399' : progress > 0 ? '#5ecbff' : '#6f83a8';

  return (
    <Box sx={{ position: 'relative', width: size, maxWidth: '100%' }}>
      <GlobalStyles styles={KEYFRAMES} />
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Identity genesis visualization — ${status.toLowerCase()}`}
        style={{ width: size, height: size, display: 'block', maxWidth: '100%' }}
      />
      {/* technical node labels around the core */}
      {[
        { label: 'IDENTITY CORE', x: '4%', y: '10%' },
        { label: 'KEY GENERATION', x: '66%', y: '3%' },
        { label: 'DID PROTOCOL', x: '0%', y: '70%' },
        { label: 'LEDGER RECORD', x: '64%', y: '86%' }
      ].map((n) => (
        <Box key={n.label} sx={{ position: 'absolute', left: n.x, top: n.y, display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#38bdf8', boxShadow: '0 0 6px rgba(56,189,248,0.7)' }} aria-hidden="true" />
          <Typography sx={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 9.5, letterSpacing: '0.16em', color: '#6f83a8', userSelect: 'none'
          }}>
            {n.label}
          </Typography>
        </Box>
      ))}
      {/* status line */}
      <Box sx={{ position: 'absolute', left: '50%', bottom: 0, transform: 'translateX(-50%)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          className="genesis-dot"
          sx={{
            width: 6, height: 6, borderRadius: '50%',
            bgcolor: statusColor,
            boxShadow: `0 0 8px ${statusColor}aa`,
            animation: 'genesisPulse 2.2s ease-in-out infinite'
          }}
          aria-hidden="true"
        />
        <Typography sx={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 10, letterSpacing: '0.18em', color: '#6f83a8'
        }}>
          IDENTITY CREATION&nbsp;·&nbsp;<span style={{ color: statusColor }}>{status}</span>
        </Typography>
      </Box>
    </Box>
  );
}
