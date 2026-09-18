import { useState } from 'react';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';

// Enrollment follows backend CreateDIDRequest:
// { organization, department, kycData: { name, employeeId } }.
// The server generates keys via Fabric CA enrollment and derives the DID —
// the client never invents key material or DID strings. The server returns a
// one-time initial password + private key: shown once, never stored client-side.
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
      setError('Name, employee ID, and organization are required.');
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
      setError(err?.response?.data?.message || 'Enrollment failed — check backend and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box component="form" onSubmit={submit} sx={{ maxWidth: 520 }}>
      <Typography variant="h5" gutterBottom>Register (KYC Enrollment)</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Your DID is issued by the server after KYC and recorded on-chain.
      </Typography>
      <TextField fullWidth margin="normal" label="Full name" value={form.name} onChange={set('name')} required />
      <TextField fullWidth margin="normal" label="Employee ID" value={form.employeeId} onChange={set('employeeId')} required />
      <TextField fullWidth margin="normal" label="Organization (e.g. DRDO, BEL)" value={form.organization} onChange={set('organization')} required />
      <TextField fullWidth margin="normal" label="Department (optional)" value={form.department} onChange={set('department')} />
      <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={busy}>
        {busy ? 'Enrolling…' : 'Enroll'}
      </Button>
      {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
      {result && (
        <Box sx={{ mt: 2 }}>
          <Typography>Enrolled DID: <strong>{result.did}</strong></Typography>
          {(result.txHash || result.txId) && (
            <Typography variant="body2">On-chain tx: {result.txHash || result.txId}</Typography>
          )}
          {result.initialPassword && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              One-time initial password: <strong>{result.initialPassword}</strong>
              <br />Save it now — it is never shown again. Change it after first login.
            </Alert>
          )}
          {result.privateKey && (
            <Alert severity="info" sx={{ mt: 1 }}>
              One-time private key (Base64): store securely, it is never stored server-side.
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{result.privateKey}</pre>
            </Alert>
          )}
          <Typography variant="body2" sx={{ mt: 1 }}>
            <Link to="/login">Continue to login</Link>
          </Typography>
        </Box>
      )}
    </Box>
  );
}
