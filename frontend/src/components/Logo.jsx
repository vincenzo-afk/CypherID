import { Box, Typography } from '@mui/material';

// CypherID brand mark: a shield (identity + protection) with a keyhole
// cut-out (access control) and a circuit-node accent (the blockchain hint).
// Pure inline SVG — no image assets, no icon packages, crisp at any size.
// Variants:
//   mark          – shield only
//   full (dark)   – shield + "CypherID" wordmark for light backgrounds
//   light         – white shield + wordmark for dark/gradient backgrounds

const DEFAULT_BLUE = '#1a56db';
const DEFAULT_DEEP = '#0e357f';

export function LogoMark({ size = 32, light = false }) {
  const uid = light ? 'lg-l' : 'lg-d';
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      role="img"
      aria-label="CypherID logo"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={light ? '#5b8cf7' : DEFAULT_BLUE} />
          <stop offset="100%" stopColor={light ? '#cfe0ff' : DEFAULT_DEEP} />
        </linearGradient>
      </defs>

      {/* Shield */}
      <path
        d="M24 3 7 9.5v11.2c0 10.9 7.2 20.3 17 23.3 9.8-3 17-12.4 17-23.3V9.5L24 3Z"
        fill={`url(#${uid}-g)`}
        stroke={light ? 'rgba(255,255,255,0.9)' : 'none'}
        strokeWidth={light ? 1.6 : 0}
      />
      {/* Inner keyhole plate — slightly darker face so the cut-out reads */}
      <circle cx="24" cy="20.5" r="8.2" fill="rgba(255,255,255,0.16)" />
      {/* Keyhole: circle + flared stem */}
      <circle cx="24" cy="19" r="4.6" fill="#fff" opacity={light ? 0.95 : 1} />
      <path d="M24 21.5 20.4 30a1.6 1.6 0 0 0 1.5 2.2h4.2a1.6 1.6 0 0 0 1.5-2.2L24 21.5Z" fill="#fff" opacity={light ? 0.95 : 1} />
      {/* Circuit node accent — a small square "block" linked to the shield edge */}
      <rect x="33.4" y="12.2" width="5" height="5" rx="1.2" fill="#fff" opacity="0.85" />
      <path d="M35.9 17.2v4.6" stroke="#fff" strokeWidth="1.4" opacity="0.7" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({
  size = 30,
  variant = 'full', // 'mark' | 'full' | 'light'
  wordSize = 20
}) {
  const light = variant === 'light';
  const mark = <LogoMark size={size} light={light} />;
  if (variant === 'mark') return mark;
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {mark}
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: wordSize,
          letterSpacing: '-0.02em',
          color: light ? '#fff' : '#111928',
          lineHeight: 1,
          userSelect: 'none'
        }}
      >
        Cypher<span style={{ color: light ? '#cfe0ff' : DEFAULT_BLUE }}>ID</span>
      </Typography>
    </Box>
  );
}
