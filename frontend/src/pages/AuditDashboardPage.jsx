import { useQuery } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';
import { api } from '../services/api.js';

export default function AuditDashboardPage() {
  const { data } = useQuery({ queryKey: ['audit'], queryFn: () => api.auditTrail({ limit: 50 }).catch(() => ({ events: [] })) });
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Audit Dashboard</Typography>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </Box>
  );
}
