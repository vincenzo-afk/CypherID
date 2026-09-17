import { Box, Typography } from '@mui/material';

// TelemetryBar — technical system telemetry, not decorative text:
// mono uppercase chips with restrained pulsing status dots.

const KEYFRAMES = `
@keyframes vaultTelemetryPulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .vault-tel-dot { animation: none !important; }
}
`;

const ITEMS = [
  { label: 'SECURE SESSION', dot: '#34d399' },
  { label: '256-BIT ENCRYPTION', dot: '#38bdf8' },
  { label: 'IDENTITY VERIFIED', dot: '#34d399' }
];

export default function TelemetryBar() {
  return (
    <Box sx={{ mt: 'auto', pt: 3 }}>
      <Box sx={{
        display: 'flex', flexWrap: 'wrap', gap: { xs: 1.2, sm: 2 },
        borderTop: '1px solid rgba(90,120,180,0.14)', pt: 2
      }}>
        {ITEMS.map((it, i) => (
          <Box key={it.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.9 }}>
            <Box
              className="vault-tel-dot"
              sx={{
                width: 5, height: 5, borderRadius: '50%', bgcolor: it.dot,
                boxShadow: `0 0 6px ${it.dot}55`,
                animation: `vaultTelemetryPulse 2.4s ease-in-out ${i * 0.5}s infinite`
              }}
              aria-hidden="true"
            />
            <Typography
              component="span"
              sx={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 10, letterSpacing: '0.14em', color: '#6f83a8', userSelect: 'none'
              }}
            >
              {it.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
