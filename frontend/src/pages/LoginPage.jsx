import { useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const [did, setDid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try { await login(did, password); navigate('/wallet'); }
    catch { setError('Login failed. Check DID and password.'); }
  };

  return (
    <Box component="form" onSubmit={submit} sx={{ maxWidth: 420 }}>
      <Typography variant="h5" gutterBottom>CypherID Login</Typography>
      <TextField fullWidth margin="normal" label="DID (did:cypherid:...)" value={did} onChange={(e) => setDid(e.target.value)} required />
      <TextField fullWidth margin="normal" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <Typography color="error">{error}</Typography>}
      <Button type="submit" variant="contained" sx={{ mt: 2 }}>Login</Button>
    </Box>
  );
}
