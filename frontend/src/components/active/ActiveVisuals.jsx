import { Box, Typography } from '@mui/material';
import { VAULT_COLORS as C } from '../files/FileVisuals.jsx';

// Shared primitives for the ACTIVE control center. Status is never conveyed
// by color alone — every dot is paired with a text label.

export const MONO = C.mono;

// status → { color, label }. Only statuses derivable from real data.
export const STATUS = {
  ACTIVE: { color: C.green, label: 'ACTIVE' },
  EXPIRING: { color: C.amber, label: 'EXPIRING' },
  REVOKED: { color: C.dim, label: 'REVOKED' },
  IDLE: { color: '#7da9e8', label: 'IDLE' }
};

export function StatusChip({ status, pulse = false, reduced = false }) {
  const s = STATUS[status] || STATUS.ACTIVE;
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.9 }}>
      <Box
        component="span"
        sx={{
          width: 6, height: 6, borderRadius: '50%', bgcolor: s.color,
          boxShadow: `0 0 7px ${s.color}88`,
          animation: pulse && !reduced ? 'vaultPulseDot 2.2s ease-in-out infinite' : 'none'
        }}
        aria-hidden="true"
      />
      <Typography
        component="span"
        sx={{ fontFamily: C.mono, fontSize: '0.62rem', letterSpacing: '0.16em', color: s.color }}
      >
        {s.label}
      </Typography>
    </Box>
  );
}

export function Panel({ children, label, right, sx = {} }) {
  return (
    <Box sx={{ border: `1px solid ${C.line}`, borderRadius: '4px', bgcolor: C.panel, p: { xs: 2, md: 2.8 }, ...sx }}>
      {(label || right) && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1.8, gap: 1.5, flexWrap: 'wrap' }}>
          <Typography
            component="h2"
            sx={{ fontFamily: C.mono, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.2em', color: C.cyan }}
          >
            {label}
          </Typography>
          {right}
        </Box>
      )}
      {children}
    </Box>
  );
}

export function DetailRow({ k, v, mono = false }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.9, borderBottom: '1px solid rgba(90,120,180,0.1)' }}>
      <Typography sx={{ fontFamily: C.mono, fontSize: '0.62rem', letterSpacing: '0.14em', color: C.dim, flexShrink: 0 }}>
        {k}
      </Typography>
      <Typography
        sx={{
          fontSize: '0.76rem', color: C.text, textAlign: 'right', wordBreak: 'break-all',
          fontFamily: mono ? C.mono : 'inherit'
        }}
      >
        {v}
      </Typography>
    </Box>
  );
}

export function EventLine({ color = C.cyan, title, sub, time }) {
  return (
    <Box sx={{ display: 'flex', gap: 1.4, py: 1, borderBottom: '1px solid rgba(90,120,180,0.08)' }}>
      <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color, flexShrink: 0, mt: '6px' }} aria-hidden="true" />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontFamily: C.mono, fontSize: '0.68rem', letterSpacing: '0.1em', color: C.text }}>
          {title}
        </Typography>
        {sub && (
          <Typography sx={{ fontSize: '0.7rem', color: C.dim, mt: 0.2, wordBreak: 'break-all' }}>
            {sub}
          </Typography>
        )}
      </Box>
      {time && (
        <Typography sx={{ fontFamily: C.mono, fontSize: '0.6rem', color: C.dim, flexShrink: 0, whiteSpace: 'nowrap' }}>
          {time}
        </Typography>
      )}
    </Box>
  );
}

export function timeAgo(iso) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export function fmtDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? (iso || '—')
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export const shortDid = (did = '') => (did.length > 24 ? `${did.slice(0, 12)}…${did.slice(-8)}` : did || '—');
