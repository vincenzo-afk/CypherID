import { useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { api } from '../services/api.js';

export default function AccessRequestsPage() {
  const [resource, setResource] = useState('');
  const [result, setResult] = useState(null);
  const evaluate = async () => {
    try { setResult(await api.evaluateAccess({ resource, action: 'READ' })); }
    catch (e) { setResult({ error: e?.response?.data?.message || 'Denied' }); }
  };
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Access Requests</Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField label="Resource / Asset ID" value={resource} onChange={(e) => setResource(e.target.value)} fullWidth />
        <Button variant="outlined" onClick={evaluate}>Evaluate</Button>
      </Box>
      {result && <pre style={{ marginTop: 16 }}>{JSON.stringify(result, null, 2)}</pre>}
    </Box>
  );
}
