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
        This view is camera-resistant: photos and screen copies come out blurred and
        banded, so they stay hard to read. On your screen it stays sharp. No website
        can stop somebody photographing a screen completely — this makes the copy much
        harder to use.
      </Alert>
    </Stack>
  );
}
