import { useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { api } from '../services/api.js';

export default function AccessRequestsPage() {
  const [resourceId, setResourceId] = useState('');
  const [result, setResult] = useState(null);
  const evaluate = async () => {
    if (!resourceId.trim()) { setResult({ error: 'Resource ID is required' }); return; }
    try { setResult(await api.requestAccess({ resourceId: resourceId.trim(), action: 'READ' })); }
    catch (e) { setResult({ error: e?.response?.data?.message || 'Denied' }); }
  };
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Access Requests</Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField label="Resource / Asset ID" value={resourceId} onChange={(e) => setResourceId(e.target.value)} fullWidth />
        <Button variant="outlined" onClick={evaluate}>Evaluate</Button>
      </Box>
      {result && <pre style={{ marginTop: 16 }}>{JSON.stringify(result, null, 2)}</pre>}
    </Box>
  );
}
