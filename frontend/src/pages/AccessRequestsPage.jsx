import { useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';

export default function AccessRequestsPage() {
  const navigate = useNavigate();
  const [resourceId, setResourceId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [delegate, setDelegate] = useState({ toDID: '', resourceId: '', action: 'READ', expiresAt: '' });
  const [delegateMsg, setDelegateMsg] = useState('');
  const [multisig, setMultisig] = useState({ resourceId: '', approvers: '', requestId: '', signature: '' });
  const [multisigMsg, setMultisigMsg] = useState('');

  const evaluate = async () => {
    setError('');
    setResult(null);
    if (!resourceId.trim()) { setError('Resource ID is required.'); return; }
    try {
      const res = await api.requestAccess({ resourceId: resourceId.trim(), action: 'READ', contextAttributes: {} });
      setResult(res);
    } catch (e) {
      const data = e?.response?.data;
      setResult(data || { error: 'Denied' });
      if (!data) setError('Request failed — check backend.');
    }
  };

  const openGranted = async () => {
    try {
      const session = await api.issueProtectedSession(resourceId.trim());
      if (session.sessionId) {
        navigate(`/protected/document/${session.sessionId}`, { state: { sessionToken: session.sessionToken } });
      } else setError('Access granted but session issuance returned no session.');
    } catch { setError('Protected session failed after grant — check backend.'); }
  };

  const decision = result?.decision || (result?.error ? 'DENIED' : null);

  const runDelegate = async () => {
    setDelegateMsg('');
    try {
      const res = await api.delegateAccess({
        toDID: delegate.toDID.trim(),
        resourceId: delegate.resourceId.trim(),
        action: delegate.action || 'READ',
        expiresAt: delegate.expiresAt
      });
      setDelegateMsg(`Delegated. Tx: ${res.txHash || res.txId || 'recorded'}.`);
    } catch (e) { setDelegateMsg(e?.response?.data?.message || 'Delegation failed.'); }
  };

  const runMultisigCreate = async () => {
    setMultisigMsg('');
    try {
      const approvers = multisig.approvers.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await api.createMultiSig({ resourceId: multisig.resourceId.trim(), requiredApprovers: approvers });
      setMultisigMsg(`Multi-sig request ${res.requestId || res.id || 'created'}. Tx: ${res.txHash || res.txId || 'recorded'}.`);
    } catch (e) { setMultisigMsg(e?.response?.data?.message || 'Multi-sig creation failed.'); }
  };

  const runMultisigApprove = async () => {
    setMultisigMsg('');
    try {
      const res = await api.approveMultiSig(multisig.requestId.trim(), { signature: multisig.signature.trim() });
      setMultisigMsg(`Approval recorded. Status: ${res.status || 'recorded'}. Tx: ${res.txHash || res.txId || 'recorded'}.`);
    } catch (e) { setMultisigMsg(e?.response?.data?.message || 'Approval failed.'); }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Access Requests</Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField label="Resource / Asset ID" value={resourceId} onChange={(e) => setResourceId(e.target.value)} fullWidth />
        <Button variant="outlined" onClick={evaluate}>Evaluate</Button>
      </Box>
      {error && <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>}
      {decision && (
        <Box sx={{ mt: 2, p: 2, border: 1, borderColor: decision === 'GRANTED' ? 'success.main' : 'error.main', borderRadius: 1 }}>
          <Typography variant="h6" color={decision === 'GRANTED' ? 'success.main' : 'error.main'}>
            {decision}
          </Typography>
          {(result.reason || result.error) && <Typography>Reason: {result.reason || result.error}</Typography>}
          {(result.txHash || result.txId) && <Typography variant="body2">On-chain tx: {result.txHash || result.txId}</Typography>}
          {decision === 'GRANTED' && (
            <Button variant="contained" sx={{ mt: 1 }} onClick={openGranted}>Open Protected View</Button>
          )}
        </Box>
      )}

      <Typography variant="h6" sx={{ mt: 3 }}>Delegate Access (time-bound)</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <TextField size="small" label="To DID" value={delegate.toDID} onChange={(e) => setDelegate({ ...delegate, toDID: e.target.value })} />
        <TextField size="small" label="Resource ID" value={delegate.resourceId} onChange={(e) => setDelegate({ ...delegate, resourceId: e.target.value })} />
        <TextField size="small" label="Action" value={delegate.action} onChange={(e) => setDelegate({ ...delegate, action: e.target.value })} />
        <TextField size="small" label="Expires at (ISO-8601)" value={delegate.expiresAt} onChange={(e) => setDelegate({ ...delegate, expiresAt: e.target.value })} />
        <Button variant="outlined" onClick={runDelegate}>Delegate</Button>
      </Box>
      {delegateMsg && <Typography sx={{ mt: 1 }}>{delegateMsg}</Typography>}

      <Typography variant="h6" sx={{ mt: 3 }}>Multi-Signature Approval (classified resources)</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <TextField size="small" label="Resource ID" value={multisig.resourceId} onChange={(e) => setMultisig({ ...multisig, resourceId: e.target.value })} />
        <TextField size="small" label="Approver DIDs (comma-separated)" value={multisig.approvers} onChange={(e) => setMultisig({ ...multisig, approvers: e.target.value })} />
        <Button variant="outlined" onClick={runMultisigCreate}>Create Request</Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
        <TextField size="small" label="Request ID" value={multisig.requestId} onChange={(e) => setMultisig({ ...multisig, requestId: e.target.value })} />
        <TextField size="small" label="Approval signature" value={multisig.signature} onChange={(e) => setMultisig({ ...multisig, signature: e.target.value })} />
        <Button variant="outlined" onClick={runMultisigApprove}>Approve</Button>
      </Box>
      {multisigMsg && <Typography sx={{ mt: 1 }}>{multisigMsg}</Typography>}
    </Box>
  );
}
