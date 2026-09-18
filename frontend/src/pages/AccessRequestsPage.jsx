import { useState } from 'react';
import { Alert, Box, Button, Chip, Divider, Paper, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const defaultExpiry = () => new Date(Date.now() + 24 * 3600 * 1000).toISOString();

const rowsOf = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.events)) return data.events;
  return [];
};

// Sharing: ask for a file, pass permission on for a limited time, and require
// several people to agree before a highly sensitive file is released.
export default function AccessRequestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [resourceId, setResourceId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [delegate, setDelegate] = useState({ toDID: '', resourceId: '', action: 'READ', expiresAt: defaultExpiry() });
  const [delegateMsg, setDelegateMsg] = useState('');
  const [multisig, setMultisig] = useState({ resourceId: '', approvers: '', requestId: '', signature: '' });
  const [multisigMsg, setMultisigMsg] = useState('');

  // Request history = own audit trail (real backend records, no local mocks).
  const historyQuery = useQuery({
    queryKey: ['access-history', user?.did],
    queryFn: () => api.auditLogs({ did: user?.did, size: 20 }).catch(() => ({ events: [] })),
    enabled: Boolean(user?.did)
  });
  const history = rowsOf(historyQuery.data);

  const evaluate = async () => {
    setError('');
    setResult(null);
    if (!resourceId.trim()) { setError('Please enter the file ID you want to open.'); return; }
    try {
      const res = await api.requestAccess({ resourceId: resourceId.trim(), action: 'READ', contextAttributes: {} });
      setResult(res);
    } catch (e) {
      const data = e?.response?.data;
      setResult(data || { error: 'Denied' });
      if (!data) setError('We could not ask for access — please try again.');
    }
  };

  const openGranted = async () => {
    try {
      const session = await api.issueProtectedSession(resourceId.trim());
      if (session.sessionId) {
        navigate(`/protected/document/${session.sessionId}`, { state: { sessionToken: session.sessionToken } });
      } else setError('Access was allowed but the protected screen could not be opened.');
    } catch { setError('Access was allowed but the protected screen could not be opened — please try again.'); }
  };

  const decision = result?.decision || (result?.error ? 'DENIED' : null);

  const runDelegate = async () => {
    setDelegateMsg('');
    if (!delegate.toDID.trim() || !delegate.resourceId.trim()) {
      setDelegateMsg('Target DID and resource ID are required.');
      return;
    }
    if (!delegate.expiresAt || Number.isNaN(new Date(delegate.expiresAt).getTime())) {
      setDelegateMsg('Expiry must be a valid ISO-8601 timestamp (prefilled +24h).');
      return;
    }
    try {
      const res = await api.delegateAccess({
        toDID: delegate.toDID.trim(),
        resourceId: delegate.resourceId.trim(),
        action: delegate.action || 'READ',
        expiresAt: delegate.expiresAt
      });
      setDelegateMsg(`Done. Permission passed on. Recorded as ${res.txHash || res.txId || 'saved'}.`);
    } catch (e) { setDelegateMsg(e?.response?.data?.message || 'We could not pass this permission on.'); }
  };

  const runMultisigCreate = async () => {
    setMultisigMsg('');
    try {
      const approvers = multisig.approvers.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await api.createMultiSig({ resourceId: multisig.resourceId.trim(), requiredApprovers: approvers });
      setMultisigMsg(`Request ${res.requestId || res.id || 'created'} — waiting for everyone to approve. Recorded as ${res.txHash || res.txId || 'saved'}.`);
    } catch (e) { setMultisigMsg(e?.response?.data?.message || 'We could not create this approval request.'); }
  };

  const runMultisigApprove = async () => {
    setMultisigMsg('');
    try {
      const res = await api.approveMultiSig(multisig.requestId.trim(), { signature: multisig.signature.trim() });
      setMultisigMsg(`Your approval is in. Status: ${res.status || 'recorded'}. Recorded as ${res.txHash || res.txId || 'saved'}.`);
    } catch (e) { setMultisigMsg(e?.response?.data?.message || 'We could not record your approval.'); }
  };

  const runRevokeDelegate = async () => {
    setDelegateMsg('');
    if (!delegate.toDID.trim() || !delegate.resourceId.trim()) {
      setDelegateMsg('Target DID and resource ID are required to revoke.');
      return;
    }
    try {
      await api.revokeDelegate({ toDID: delegate.toDID.trim(), resourceId: delegate.resourceId.trim() });
      setDelegateMsg('Delegation revoked.');
    } catch (e) { setDelegateMsg(e?.response?.data?.message || 'Revocation failed.'); }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Sharing</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Ask to open a file that belongs to someone else, hand your permission to
        somebody for a limited time, or ask several people to approve a highly
        sensitive file before it is released.
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Ask to open a file</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Enter the file ID. The system checks the rules for that file — its
          sensitivity and your clearance — and answers straight away.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <TextField
            label="File ID"
            placeholder="ASSET-…"
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            sx={{ flex: 1, minWidth: 240 }}
          />
          <Button variant="contained" onClick={evaluate}>Ask</Button>
        </Box>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {decision && (
          <Alert
            severity={decision === 'GRANTED' ? 'success' : 'error'}
            sx={{ mt: 2 }}
            action={decision === 'GRANTED' ? <Button color="inherit" size="small" onClick={openGranted}>Open</Button> : null}
          >
            <Typography variant="subtitle2">
              {decision === 'GRANTED' ? 'Allowed' : 'Refused'}
            </Typography>
            {(result.reason || result.error) && <Typography variant="body2">{result.reason || result.error}</Typography>}
            {(result.txHash || result.txId) && (
              <Typography variant="caption" sx={{ display: 'block' }}>Recorded as {result.txHash || result.txId}</Typography>
            )}
          </Alert>
        )}
      </Paper>

      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>Let someone else open it for a while</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          This gives another person permission until the date you choose, then it
          stops working by itself.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <TextField size="small" label="Give to (digital ID)" value={delegate.toDID} onChange={(e) => setDelegate({ ...delegate, toDID: e.target.value })} />
          <TextField size="small" label="File ID" value={delegate.resourceId} onChange={(e) => setDelegate({ ...delegate, resourceId: e.target.value })} />
          <TextField size="small" label="They may" value={delegate.action} onChange={(e) => setDelegate({ ...delegate, action: e.target.value })} />
          <TextField
            size="small"
            label="Until (date and time)"
            placeholder="2026-12-31T18:00:00Z"
            value={delegate.expiresAt}
            onChange={(e) => setDelegate({ ...delegate, expiresAt: e.target.value })}
          />
          <Button variant="outlined" onClick={runDelegate}>Allow</Button>
        </Box>
        {delegateMsg && <Alert severity="info" sx={{ mt: 2 }}>{delegateMsg}</Alert>}
      </Paper>

      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>Several people must agree</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Used for the most sensitive files: instead of one person deciding, everyone
          you name has to approve before the file is released.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <TextField size="small" label="File ID" value={multisig.resourceId} onChange={(e) => setMultisig({ ...multisig, resourceId: e.target.value })} />
          <TextField
            size="small"
            label="Who must approve (digital IDs, comma separated)"
            value={multisig.approvers}
            onChange={(e) => setMultisig({ ...multisig, approvers: e.target.value })}
            sx={{ minWidth: 280 }}
          />
          <Button variant="outlined" onClick={runMultisigCreate}>Ask them to approve</Button>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          If you are one of the approvers, add your signature here.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <TextField size="small" label="Request ID" value={multisig.requestId} onChange={(e) => setMultisig({ ...multisig, requestId: e.target.value })} />
          <TextField
            size="small"
            label="Your signature"
            helperText="Type anything to confirm it is you"
            value={multisig.signature}
            onChange={(e) => setMultisig({ ...multisig, signature: e.target.value })}
          />
          <Button variant="outlined" onClick={runMultisigApprove}>I approve</Button>
        </Box>
        {multisigMsg && (
          <Alert severity="info" sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip size="small" label="Approval" />
            {multisigMsg}
          </Alert>
        )}
      </Paper>
    </Box>
  );
}
