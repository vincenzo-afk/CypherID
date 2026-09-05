import { useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { api } from '../services/api.js';

export default function RegisterPage() {
  const [did, setDid] = useState('');
  const [msg, setMsg] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createDID({ did, publicKey: 'PENDING-ENROLLMENT' });
      setMsg(`Enrolled. Tx: ${res.txId || res.txHash || 'recorded'}`);
    } catch { setMsg('Enrollment failed.'); }
  };
  return (
    <Box component="form" onSubmit={submit} sx={{ maxWidth: 480 }}>
      <Typography variant="h5" gutterBottom>Register DID</Typography>
      <TextField fullWidth margin="normal" label="Requested DID or label" value={did} onChange={(e) => setDid(e.target.value)} required />
      <Button type="submit" variant="contained" sx={{ mt: 2 }}>Enroll</Button>
      {msg && <Typography sx={{ mt: 2 }}>{msg}</Typography>}
    </Box>
  );
}
