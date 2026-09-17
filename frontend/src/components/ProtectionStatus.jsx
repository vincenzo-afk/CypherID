import { Alert, Chip, Stack } from '@mui/material';

// Protection status indicator. Never claims capture is impossible.
// Copy per docs/decisions/0011_BROWSER_SECURITY_LIMITATIONS.md:
// browser-side rendering can only DEGRADE camera/OCR copies, never block them.
export default function ProtectionStatus({ state = 'AUTHORIZED', profile = 'MEDIUM' }) {
  const color = state === 'CONTENT_OBSCURED' ? 'error' : state === 'AUTHORIZED' ? 'success' : 'warning';
  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
      <Chip label={`State: ${state}`} color={color} size="small" />
      <Chip label={`Profile: ${profile}`} variant="outlined" size="small" />
      <Alert severity="warning" sx={{ py: 0 }}>
        Camera-resistant: moiré + dither + rolling-shutter bands make photos/OCR
        unreadable. Human-readable on screen — photography/screenshots cannot be blocked.
      </Alert>
    </Stack>
  );
}
