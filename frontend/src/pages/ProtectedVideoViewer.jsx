import { Box, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import ProtectionStatus from '../components/ProtectionStatus.jsx';

// Video viewer: expiring playback sessions with watermarked chunk delivery.
// Covers recorded playback only (not live conferencing) per docs/06_NON_GOALS.md.
export default function ProtectedVideoViewer() {
  const { sessionId } = useParams();
  return (
    <Box sx={{ position: 'fixed', inset: 0, bgcolor: '#000', color: '#fff', p: 2 }}>
      <Typography variant="h6">Protected Video — {sessionId}</Typography>
      <ProtectionStatus state="PROTECTED_VIEW" profile="HIGH" />
      <Typography variant="body2" sx={{ mt: 2 }}>
        Encrypted video chunks play in expiring sessions. Anti-download controls and
        playback watermarking apply; OS-level recording cannot be prevented by a web app.
      </Typography>
    </Box>
  );
}
