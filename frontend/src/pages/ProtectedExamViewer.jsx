import { Box, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import ProtectionStatus from '../components/ProtectionStatus.jsx';

// Exam viewer: question delivery uses the same protected chunk pipeline.
// Answers are submitted via the exam API; suspicious activity obscures content.
export default function ProtectedExamViewer() {
  const { sessionId } = useParams();
  return (
    <Box sx={{ position: 'fixed', inset: 0, bgcolor: '#fff', p: 2 }}>
      <Typography variant="h6">Protected Exam — {sessionId}</Typography>
      <ProtectionStatus state="PROTECTED_VIEW" profile="HIGH" />
      <Typography variant="body2" sx={{ mt: 2 }}>
        Exam questions are delivered as protected chunks. This shell enforces the HIGH profile
        (obscure on focus loss) per docs/protection/exams.
      </Typography>
    </Box>
  );
}
