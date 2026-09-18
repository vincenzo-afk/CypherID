import { useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const [did, setDid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try { await login(did, password); navigate('/wallet'); }
    catch { setError('Login failed. Check DID and password.'); }
  };

  return (
    <Box component="form" onSubmit={submit} sx={{ maxWidth: 420 }}>
      <Typography variant="h5" gutterBottom>CypherID Login</Typography>
      {params.get('expired') && (
        <Typography color="warning.main" sx={{ mb: 1 }}>
          Session expired — please log in again.
        </Typography>
      )}
      <TextField fullWidth margin="normal" label="DID (did:cypherid:...)" value={did} onChange={(e) => setDid(e.target.value)} required />
      <TextField fullWidth margin="normal" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <Typography color="error">{error}</Typography>}
      <Button type="submit" variant="contained" sx={{ mt: 2 }}>Login</Button>
      <Typography variant="body2" sx={{ mt: 2 }}>
        No identity yet? <Link to="/register">Register (KYC enrollment)</Link>
      </Typography>
    </Box>
  );
}
