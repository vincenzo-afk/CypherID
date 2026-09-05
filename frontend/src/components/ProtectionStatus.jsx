import { Alert, Chip, Stack } from '@mui/material';

// Protection status indicator. Never claims capture is impossible.
export default function ProtectionStatus({ state = 'AUTHORIZED', profile = 'MEDIUM' }) {
  const color = state === 'CONTENT_OBSCURED' ? 'error' : state === 'AUTHORIZED' ? 'success' : 'warning';
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Chip label={`State: ${state}`} color={color} size="small" />
      <Chip label={`Profile: ${profile}`} variant="outlined" size="small" />
      <Alert severity="info" sx={{ py: 0 }}>
        Camera-resistant rendering reduces readability of captured copies; it does not prevent photography or screenshots.
      </Alert>
    </Stack>
  );
}
