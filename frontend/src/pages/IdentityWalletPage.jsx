import { useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function IdentityWalletPage() {
  const { user } = useAuth();
  const [did, setDid] = useState('');
  const [doc, setDoc] = useState(null);
  const resolve = async () => {
    try { setDoc(await api.resolveDID(did)); } catch { setDoc({ error: 'Resolve failed' }); }
  };
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Identity Wallet</Typography>
      <Typography variant="body2">Signed in as: {user?.did} ({(user?.roles || []).join(', ')})</Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <TextField label="DID to resolve" value={did} onChange={(e) => setDid(e.target.value)} fullWidth />
        <Button variant="outlined" onClick={resolve}>Resolve</Button>
      </Box>
      {doc && <pre style={{ marginTop: 16 }}>{JSON.stringify(doc, null, 2)}</pre>}
    </Box>
  );
}
