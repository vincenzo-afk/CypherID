import { useState } from 'react';
import { Box, Button, Paper, TextField, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Login form in plain language: digital ID + password.
// The ID field label stays "Digital ID" for humans; the placeholder shows the
// exact format so users can still recognise what to type.
export default function LoginFormPage() {
  const [did, setDid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try { await login(did.trim(), password); navigate('/wallet'); }
    catch { setError('Login failed. Check your digital ID and password.'); }
  };

  return (
    <Box component="form" onSubmit={submit} sx={{ maxWidth: 460, mx: 'auto' }}>
      <Paper sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h5" gutterBottom>Log in to CypherID</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Use the digital ID you were given when you signed up, plus your password.
        </Typography>
        <TextField
          fullWidth
          margin="normal"
          label="Digital ID"
          placeholder="did:cypherid:0x…"
          helperText="It always starts with did:cypherid: — for example did:cypherid:admin:root"
          value={did}
          onChange={(e) => setDid(e.target.value)}
          autoComplete="username"
          required
        />
        <TextField
          fullWidth
          margin="normal"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        {error && <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>}
        <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 2 }}>Log in</Button>
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          No account yet? <Link to="/register">Create my ID</Link>
        </Typography>
      </Paper>
    </Box>
  );
}
