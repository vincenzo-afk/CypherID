import { useState } from 'react';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';

// Create a digital ID. Plain-language labels; the request shape is unchanged
// (backend CreateDIDRequest: organization, department, kycData{name, employeeId}).
export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', employeeId: '', organization: '', department: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    if (!form.name.trim() || !form.employeeId.trim() || !form.organization.trim()) {
      setError('Please fill in your name, staff number and organization.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.createDID({
        organization: form.organization.trim(),
        department: form.department.trim() || undefined,
        kycData: { name: form.name.trim(), employeeId: form.employeeId.trim() }
      });
      setResult(res);
    } catch (err) {
      setError(err?.response?.data?.message || 'We could not create your ID. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box component="form" onSubmit={submit} sx={{ maxWidth: 500, mx: 'auto' }}>
      <Paper sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h5" gutterBottom>Create your digital ID</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Tell us who you are. We create your ID, write it into the tamper-proof
          record, and show you a one-time password to keep.
        </Typography>
        <TextField fullWidth margin="normal" label="Full name" value={form.name} onChange={set('name')} required />
        <TextField
          fullWidth
          margin="normal"
          label="Staff number"
          helperText="The ID number your workplace gave you"
          value={form.employeeId}
          onChange={set('employeeId')}
          required
        />
        <TextField
          fullWidth
          margin="normal"
          label="Organization"
          helperText="For example DRDO or BEL"
          value={form.organization}
          onChange={set('organization')}
          required
        />
        <TextField fullWidth margin="normal" label="Department (optional)" value={form.department} onChange={set('department')} />
        <Button type="submit" variant="contained" size="large" fullWidth sx={{ mt: 2 }} disabled={busy}>
          {busy ? 'Creating…' : 'Create my ID'}
        </Button>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </Paper>

      {result && (
        <Paper sx={{ p: 3, mt: 2 }}>
          <Typography variant="h6" gutterBottom>Your ID is ready — save this now</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            This is the only time the password is shown. Write it down or store it safely.
          </Typography>
          <Typography variant="body2" sx={{ wordBreak: 'break-all', mt: 1 }}>
            <strong>Your digital ID:</strong> {result.did}
          </Typography>
          {result.temporaryPassword && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>One-time password:</strong> {result.temporaryPassword}
            </Typography>
          )}
          <Button variant="contained" sx={{ mt: 2 }} component={Link} to="/login">Go to log in</Button>
        </Paper>
      )}
    </Box>
  );
}
