import { useEffect, useRef } from 'react';

// IdentityCore — the "identity sphere": a rotating point-cloud sphere
// (Fibonacci distribution, fingerprint-like), orbiter nodes on elliptical
// paths, near-point connection lines, drifting hex fragments, and cursor
// proximity reaction. Pure Canvas 2D, no dependencies.
// Performance: one rAF loop, DPR-aware, pauses when tab hidden,
// renders a static frame when the user prefers reduced motion.

const TAU = Math.PI * 2;
const HEX = '0123456789abcdef';

const reduceMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Fibonacci sphere → evenly distributed points that read as an abstract print.
function spherePoints(count, radius) {
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts.push({ x: Math.cos(theta) * r * radius, y: y * radius, z: Math.sin(theta) * r * radius });
  }
  return pts;
}

export default function IdentityCore({ size = 380, interactive = true }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const R = size * 0.31;
    const staticMode = reduceMotion();

    const points = spherePoints(220, R);
    const orbiters = Array.from({ length: 5 }, (_, i) => ({
      r1: R * (1.28 + i * 0.13),        // ellipse a
      r2: R * (0.9 + (i % 3) * 0.1),    // ellipse b
      tilt: (i / 5) * Math.PI,          // orbit rotation
      speed: (0.0011 + i * 0.00042) * (i % 2 ? 1 : -1),
      phase: (i / 5) * TAU,
      size: 1.6 + (i % 3) * 0.7
    }));
    const fragments = Array.from({ length: 14 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00022,
      vy: (Math.random() - 0.5) * 0.00016,
      text: Array.from({ length: 4 }, () => HEX[(Math.random() * 16) | 0]).join(''),
      life: Math.random()
    }));

    let raf = 0;
    let running = true;
    let rot = 0;

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };
    const onVis = () => { running = !document.hidden && !staticMode; if (running) raf = requestAnimationFrame(frame); };

    if (interactive) {
      canvas.addEventListener('mousemove', onMove);
      canvas.addEventListener('mouseleave', onLeave);
    }
    document.addEventListener('visibilitychange', onVis);

    const project = (p, yaw, pitch) => {
      // yaw around Y, then slight fixed pitch around X
      const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
      const x1 = p.x * cosY - p.z * sinY;
      const z1 = p.x * sinY + p.z * cosY;
      const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
      const y1 = p.y * cosP - z1 * sinP;
      const z2 = p.y * sinP + z1 * cosP;
      const persp = 1 / (1 + z2 / (R * 4));
      return { x: cx + x1 * persp, y: cy + y1 * persp, depth: persp };
    };

    const draw = (t) => {
      ctx.clearRect(0, 0, size, size);
      rot = staticMode ? 0.6 : t * 0.00022;
      const pitch = 0.42;

      // core halo — very restrained
      const halo = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.9);
      halo.addColorStop(0, 'rgba(56,130,246,0.10)');
      halo.addColorStop(0.55, 'rgba(120,90,255,0.05)');
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, size, size);

      // projected sphere points
      const proj = points.map((p) => project(p, rot, pitch));

      // connection lines between nearby projected points (front hemisphere only)
      ctx.lineWidth = 0.5;
      for (let i = 0; i < proj.length; i += 3) {
        const a = proj[i];
        for (let j = i + 3; j < Math.min(i + 24, proj.length); j += 3) {
          const b = proj[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 1600) {
            const alpha = (1 - d2 / 1600) * 0.22 * Math.min(a.depth, b.depth);
            ctx.strokeStyle = `rgba(96,150,255,${alpha.toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }

      // points — cyan front, dimmer back, cursor reacts
      const m = mouseRef.current;
      for (let i = 0; i < proj.length; i++) {
        const p = proj[i];
        let alpha = 0.14 + p.depth * 0.5;
        let px = p.x, py = p.y;
        if (interactive) {
          const dx = px - m.x, dy = py - m.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 6000) {
            const f = 1 - d2 / 6000;
            alpha = Math.min(1, alpha + f * 0.65);
            px += dx * f * 0.12; py += dy * f * 0.12;
          }
        }
        ctx.fillStyle = `rgba(122,190,255,${alpha.toFixed(3)})`;
        ctx.fillRect(px - 0.7, py - 0.7, 1.4, 1.4);
      }

      // orbiters + their elliptical traces
      for (const o of orbiters) {
        const ang = staticMode ? o.phase : o.phase + t * o.speed;
        const ex = Math.cos(ang) * o.r1, ey = Math.sin(ang) * o.r2;
        const x = cx + ex * Math.cos(o.tilt) - ey * Math.sin(o.tilt);
        const y = cy + ex * Math.sin(o.tilt) * 0.42 + ey * Math.cos(o.tilt);
        ctx.strokeStyle = 'rgba(90,120,200,0.08)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.ellipse(cx, cy, o.r1, o.r2, o.tilt, 0, TAU);
        // squash trace vertically for 2.5D
        ctx.scale(1, 1);
        ctx.stroke();
        const g = ctx.createRadialGradient(x, y, 0, x, y, o.size * 4);
        g.addColorStop(0, 'rgba(150,200,255,0.9)');
        g.addColorStop(1, 'rgba(150,200,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, o.size * 4, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(210,230,255,0.95)';
        ctx.beginPath(); ctx.arc(x, y, o.size, 0, TAU); ctx.fill();
      }

      // drifting hex fragments
      ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
      for (const f of fragments) {
        if (!staticMode) {
          f.x = (f.x + f.vx + 1) % 1;
          f.y = (f.y + f.vy + 1) % 1;
          f.life += 0.004;
        }
        const a = 0.05 + Math.abs(Math.sin(f.life)) * 0.12;
        ctx.fillStyle = `rgba(130,160,220,${a.toFixed(3)})`;
        ctx.fillText(f.text, f.x * size, f.y * size);
      }
    };

    const frame = (t) => {
      if (!running) return;
      draw(t);
      raf = requestAnimationFrame(frame);
    };

    draw(0); // first frame (also the static frame for reduced motion)
    if (!staticMode) { running = !document.hidden; raf = requestAnimationFrame(frame); }

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      if (interactive) {
        canvas.removeEventListener('mousemove', onMove);
        canvas.removeEventListener('mouseleave', onLeave);
      }
    };
  }, [size, interactive]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, display: 'block', maxWidth: '100%' }}
      aria-hidden="true"
    />
  );
}
