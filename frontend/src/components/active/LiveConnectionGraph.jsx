import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { VAULT_COLORS as C } from '../files/FileVisuals.jsx';
import { StatusChip, shortDid } from './ActiveVisuals.jsx';

// LiveConnectionGraph — the ACTIVE identity core. Your identity at the center;
// one node per real, currently-active relationship:
//   • DELEGATION  — an active outgoing access grant (peer DID)
//   • LEDGER      — a recent file action of yours on the ledger
// Nothing else renders: no fake devices, no invented sessions. Empty state is
// explicit. Hover highlights; click opens the node's real detail panel.

const short = (s = '') => (s.length > 18 ? `${s.slice(0, 10)}…${s.slice(-6)}` : s);

const ACTION_LABEL = { READ: 'READ', WRITE: 'READ + WRITE' };

export default function LiveConnectionGraph({ did, grants = [], events = [], onSelect, reduced = false }) {
  const nodes = useMemo(() => {
    const list = [];
    grants.forEach((g, i) => {
      list.push({
        key: `g-${i}`,
        kind: 'DELEGATION',
        title: shortDid(g.toDID),
        status: 'ACTIVE',
        meta: `${ACTION_LABEL[g.action] || g.action} · ${short(g.resourceId)}`,
        angle: (2 * Math.PI * i) / Math.max(grants.length + 1, 3) + (-Math.PI / 2)
      });
    });
    if (events.length) {
      const latest = events[0];
      list.push({
        key: 'vault',
        kind: 'LEDGER',
        title: 'FILE VAULT',
        status: 'ACTIVE',
        meta: `LAST · ${latest.action}`,
        angle: Math.PI / 2
      });
    }
    return list;
  }, [grants, events]);

  const CX = 300, CY = 240, RX = 214, RY = 158;
  const R = 92; // hub radius

  return (
    <Box sx={{ border: `1px solid ${C.line}`, borderRadius: '4px', bgcolor: C.panel, position: 'relative', overflow: 'hidden' }}>
      {/* header strip */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.2, py: 1.4, borderBottom: `1px solid ${C.line}` }}>
        <Typography sx={{ fontFamily: C.mono, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.2em', color: C.cyan }}>
          ACTIVE IDENTITY CORE
        </Typography>
        <StatusChip status="ACTIVE" pulse={!reduced} reduced={reduced} />
      </Box>

      <svg
        viewBox="0 0 600 480"
        role="img"
        aria-label={`Identity core with ${nodes.length} active connection${nodes.length === 1 ? '' : 's'}`}
        style={{ display: 'block', width: '100%', height: 'auto' }}
      >
        {/* fine grid */}
        <defs>
          <pattern id="active-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(70,110,180,0.09)" strokeWidth="1" />
          </pattern>
          <radialGradient id="hub-glow">
            <stop offset="0%" stopColor="rgba(56,166,255,0.16)" />
            <stop offset="100%" stopColor="rgba(56,166,255,0)" />
          </radialGradient>
        </defs>
        <rect width="600" height="480" fill="url(#active-grid)" />
        <circle cx={CX} cy={CY} r={190} fill="url(#hub-glow)" />
        <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke="rgba(90,140,220,0.14)" strokeWidth="1" strokeDasharray="3 7" />

        {/* connection lines with subtle data pulse */}
        {nodes.map((n) => {
          const x = CX + RX * Math.cos(n.angle);
          const y = CY + RY * Math.sin(n.angle);
          return (
            <g key={`line-${n.key}`}>
              <line x1={CX} y1={CY} x2={x} y2={y} stroke="rgba(80,160,255,0.3)" strokeWidth="1" />
              <circle r="2.4" fill="#5ecbff" opacity="0.85">
                {!reduced && (
                  <animateMotion dur={`${2.8 + (n.key.length % 4) * 0.7}s`} repeatCount="indefinite" path={`M${CX},${CY} L${x},${y}`} />
                )}
              </circle>
            </g>
          );
        })}

        {/* hub */}
        <g>
          <circle cx={CX} cy={CY} r={R} fill="rgba(10,18,34,0.85)" stroke="rgba(56,166,255,0.5)" strokeWidth="1.2" />
          <circle cx={CX} cy={CY} r={R + 9} fill="none" stroke="rgba(56,166,255,0.16)" strokeWidth="1" strokeDasharray="2 6">
            {!reduced && <animateTransform attributeName="transform" type="rotate" from={`0 ${CX} ${CY}`} to={`360 ${CX} ${CY}`} dur="48s" repeatCount="indefinite" />}
          </circle>
          <text x={CX} y={CY - 16} textAnchor="middle" fill="#8fa3c8" fontFamily="ui-monospace, Menlo, monospace" fontSize="9" letterSpacing="2.5">YOUR IDENTITY</text>
          <circle cx={CX} cy={CY + 2} r="3" fill="#34d399" />
          <text x={CX} y={CY + 22} textAnchor="middle" fill="#34d399" fontFamily="ui-monospace, Menlo, monospace" fontSize="10" letterSpacing="2">ACTIVE</text>
          <text x={CX} y={CY + 44} textAnchor="middle" fill="#6f83a8" fontFamily="ui-monospace, Menlo, monospace" fontSize="8.5">{did ? shortDid(did) : ''}</text>
        </g>

        {/* nodes */}
        {nodes.map((n, i) => {
          const x = CX + RX * Math.cos(n.angle);
          const y = CY + RY * Math.sin(n.angle);
          const color = n.kind === 'DELEGATION' ? '#5ecbff' : '#9d8cff';
          return (
            <g
              key={n.key}
              transform={`translate(${x},${y})`}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelect?.(n)}
              tabIndex={0}
              role="button"
              aria-label={`${n.kind}: ${n.title}, ${n.status}`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect?.(n); }}
            >
              <rect x="-86" y="-30" width="172" height="60" rx="2" fill="rgba(8,13,24,0.94)" stroke={`${color}66`} strokeWidth="1" />
              <text x="0" y="-10" textAnchor="middle" fill="#e8eefb" fontFamily="ui-monospace, Menlo, monospace" fontSize="9.5" letterSpacing="1.5">
                {n.title.length > 24 ? `${n.title.slice(0, 23)}…` : n.title}
              </text>
              <circle cx="-66" cy="8" r="2.6" fill={color} />
              <text x="-58" y="11.5" fill={color} fontFamily="ui-monospace, Menlo, monospace" fontSize="7.5" letterSpacing="1.5">ACTIVE</text>
              <text x="0" y="22" textAnchor="middle" fill="#6f83a8" fontFamily="ui-monospace, Menlo, monospace" fontSize="7">
                {n.meta.length > 30 ? `${n.meta.slice(0, 29)}…` : n.meta}
              </text>
              {/* invisible larger hit area */}
              <rect x="-90" y="-34" width="180" height="68" fill="transparent" />
            </g>
          );
        })}
      </svg>

      {nodes.length === 0 && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <Typography sx={{ fontFamily: C.mono, fontSize: '0.68rem', letterSpacing: '0.14em', color: C.dim, bgcolor: 'rgba(5,7,13,0.85)', px: 2, py: 1, border: `1px solid ${C.line}` }}>
            IDENTITY ACTIVE · NO OUTBOUND CONNECTIONS YET
          </Typography>
        </Box>
      )}
    </Box>
  );
}
