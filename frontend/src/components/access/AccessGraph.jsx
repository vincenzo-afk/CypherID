import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import { Mono, SectionLabel, VAULT_COLORS as C } from '../files/FileVisuals.jsx';

const dashFlow = keyframes`
  to { stroke-dashoffset: -28; }
`;

const shortDid = (did = '') => (did.length > 24 ? `${did.slice(0, 12)}…${did.slice(-8)}` : did);
const shortRes = (id = '') => (id.length > 18 ? `${id.slice(0, 16)}…` : id);

/**
 * IdentityAccessGraph — the center is YOUR identity; each spoke is one REAL
 * active delegation you granted (from the delegations API). No fabricated
 * relationships: with zero grants the graph honestly shows a lone protected
 * core. Clicking a node selects that grant.
 */
export default function AccessGraph({ did, grants, onSelect, reducedMotion }) {
  const W = 760, H = 340, cx = W / 2, cy = H / 2;
  const active = grants.filter((g) => g.active);

  const nodes = useMemo(() => active.map((g, i) => {
    const angle = (-Math.PI / 2) + (i * 2 * Math.PI) / Math.max(active.length, 3);
    const rx = 270, ry = 118;
    return { ...g, x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
  }), [active, cx, cy]);

  return (
    <Box sx={{
      border: `1px solid ${C.line}`, borderRadius: '4px', bgcolor: C.panel,
      p: { xs: 2, md: 3 }, position: 'relative', overflow: 'hidden',
      backgroundImage: `radial-gradient(rgba(56,166,255,0.05) 1px, transparent 1px)`,
      backgroundSize: '22px 22px'
    }}>
      <SectionLabel sx={{ mb: 2, display: 'block' }}>ACCESS MAP — LIVE GRANTS</SectionLabel>

      <Box sx={{ overflowX: { xs: 'auto', md: 'hidden' } }}>
        <Box component="svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} sx={{ minWidth: { xs: 700, md: '100%' }, display: 'block', mx: 'auto' }}>
          {/* connection lines */}
          {nodes.map((n, i) => (
            <line
              key={`l-${i}`} x1={cx} y1={cy} x2={n.x} y2={n.y}
              stroke={C.cyan} strokeOpacity={0.4} strokeWidth={1}
              strokeDasharray="4 6"
              style={reducedMotion ? undefined : { animation: `${dashFlow} 1.6s linear infinite` }}
            />
          ))}

          {/* center: your identity */}
          <g>
            <circle cx={cx} cy={cy} r={54} fill="rgba(56,166,255,0.06)" stroke={C.cyan} strokeOpacity={0.55} strokeWidth={1.2} />
            <circle cx={cx} cy={cy} r={64} fill="none" stroke={C.cyan} strokeOpacity={0.18} strokeWidth={1} />
            <text x={cx} y={cy - 8} textAnchor="middle" fontSize={9} fontFamily="inherit" fill={C.dim} letterSpacing="2">YOUR IDENTITY</text>
            <text x={cx} y={cy + 8} textAnchor="middle" fontSize={10.5} fontFamily="inherit" fill={C.text}>{shortDid(did)}</text>
            <circle cx={cx - 30} cy={cy + 24} r={2.5} fill={C.green} />
            <text x={cx - 24} y={cy + 27} fontSize={8.5} fill={C.green} letterSpacing="1.5">PROTECTED</text>
          </g>

          {/* grant nodes */}
          {nodes.map((n, i) => (
            <g key={`n-${i}`} onClick={() => onSelect?.(n)} style={{ cursor: 'pointer' }}>
              <rect
                x={n.x - 84} y={n.y - 26} width={168} height={52} rx={3}
                fill="rgba(10,15,26,0.92)" stroke={C.violet} strokeOpacity={0.55} strokeWidth={1}
              />
              <text x={n.x} y={n.y - 8} textAnchor="middle" fontSize={9.5} fill={C.dim} fontFamily="inherit">
                {shortDid(n.toDID)}
              </text>
              <text x={n.x} y={n.y + 6} textAnchor="middle" fontSize={9} fill={n.action === 'WRITE' ? C.violet : C.cyan} fontFamily="inherit" letterSpacing="1.5">
                {n.action === 'WRITE' ? 'READ + WRITE' : 'READ'}
              </text>
              <text x={n.x} y={n.y + 19} textAnchor="middle" fontSize={7.5} fill="rgba(140,160,196,0.75)" fontFamily="inherit">
                {shortRes(n.resourceId)}
              </text>
            </g>
          ))}
        </Box>
      </Box>

      {active.length === 0 && (
        <Typography sx={{ color: C.dim, fontSize: '0.8rem', textAlign: 'center', mt: -1, pb: 1 }}>
          No active access grants — your identity stands alone. Grant access to draw a connection.
        </Typography>
      )}
    </Box>
  );
}
