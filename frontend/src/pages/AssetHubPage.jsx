import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, FormControl, InputLabel, MenuItem,
  Paper, Select, TextField, Typography, Table, TableBody, TableCell, TableHead, TableRow
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const CLASSIFICATIONS = ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'];

const listOf = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.assets)) return data.assets;
  if (Array.isArray(data?.content)) return data.content;
  return [];
};

const isFabricDown = (e) =>
  e?.response?.status === 503 || e?.response?.data?.code === 'FABRIC_UNAVAILABLE';

const FABRIC_MSG = 'Blockchain network unavailable — asset minting, listing, transfer and burn need the Fabric network. Start it (Phase 2) or run demo mode to use these features.';

export default function AssetHubPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [classification, setClassification] = useState('CONFIDENTIAL');
  const [notice, setNotice] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [toDID, setToDID] = useState('');
  const [signature, setSignature] = useState('');

  const say = (severity, text) => setNotice({ severity, text });
  const explain = (e, fallback) => (isFabricDown(e) ? FABRIC_MSG : (e?.response?.data?.message || fallback));

  const ownerDID = user?.did || '';
  const assetsQuery = useQuery({
    queryKey: ['assets', ownerDID],
    queryFn: () => api.listAssets(ownerDID),
    enabled: Boolean(ownerDID),
    retry: false
  });
  const assets = listOf(assetsQuery.data);
  const fabricDown = isFabricDown(assetsQuery.error) || notice?.fabricDown === true;

  const historyQuery = useQuery({
    queryKey: ['asset-history', selected?.assetId || selected?.id],
    queryFn: () => api.assetHistory(selected.assetId || selected.id).catch(() => ({ history: [] })),
    enabled: Boolean(selected)
  });
  const history = listOf(historyQuery.data?.history || historyQuery.data?.events || historyQuery.data);

  const upload = async () => {
    if (!file || uploading) return;
    if (file.size === 0) { say('warning', 'Choose a file with content to upload.'); return; }
    if (file.size > 50 * 1024 * 1024) { say('warning', 'Files must be 50 MB or smaller.'); return; }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('classification', classification);
    setUploading(true);
    try {
      const res = await api.uploadAsset(fd);
      const assetId = res.assetId || res.id;
      say('success', `Minted ${assetId}. Tx: ${res.txHash || res.txId || 'recorded'}.`);
      setFile(null);
      assetsQuery.refetch();
      const session = await api.issueProtectedSession(assetId);
      if (session.sessionId) {
        navigate(`/protected/document/${session.sessionId}`, { state: { sessionToken: session.sessionToken } });
      }
    } catch (e) {
      const down = isFabricDown(e);
      setNotice({
        severity: 'error',
        text: down ? FABRIC_MSG : (e?.response?.data?.message || 'Upload failed — check file, classification, and backend.'),
        ...(down ? { fabricDown: true } : {})
      });
    } finally {
      setUploading(false);
    }
  };

  const protect = async (asset) => {
    const assetId = asset.assetId || asset.id;
    try {
      const session = await api.issueProtectedSession(assetId);
      if (session.sessionId) {
        navigate(`/protected/document/${session.sessionId}`, { state: { sessionToken: session.sessionToken } });
      } else say('warning', 'Session issuance returned no session — check backend.');
    } catch (e) { say('error', explain(e, 'Protected session failed — access may be denied for this asset.')); }
  };

  const transfer = async () => {
    if (!selected || !toDID.trim() || !signature.trim()) { say('warning', 'Transfer needs target DID + owner signature.'); return; }
    const assetId = selected.assetId || selected.id;
    try {
      const res = await api.transferAsset(assetId, { toDID: toDID.trim(), ownerSignature: signature.trim() });
      say('success', `Transferred ${assetId}. Tx: ${res.txHash || res.txId || 'recorded'}.`);
      assetsQuery.refetch();
    } catch (e) { say('error', explain(e, 'Transfer failed.')); }
  };

  const burn = async () => {
    if (!selected || !signature.trim()) { say('warning', 'Burn needs the owner signature.'); return; }
    if (!window.confirm(`Burn asset ${selected.assetId || selected.id}? This is irreversible.`)) return;
    const assetId = selected.assetId || selected.id;
    try {
      const res = await api.burnAsset(assetId, { ownerSignature: signature.trim() });
      say('success', `Burned ${assetId}. Tx: ${res.txHash || res.txId || 'recorded'}.`);
      setSelected(null);
      assetsQuery.refetch();
    } catch (e) { say('error', explain(e, 'Burn failed.')); }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Asset Hub</Typography>
      {fabricDown && (
        <Alert severity="warning" sx={{ mb: 2 }}>{FABRIC_MSG}</Alert>
      )}
      {notice && !fabricDown && (
        <Alert severity={notice.severity || 'info'} sx={{ mb: 2 }} onClose={() => setNotice(null)}>
          {notice.text}
        </Alert>
      )}
      {fabricDown && notice && (
        <Alert severity={notice.severity || 'info'} sx={{ mb: 2 }} onClose={() => setNotice(null)}>
          {notice.text}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Upload + Mint</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Files are encrypted by the protected backend, pinned to IPFS, then minted on-chain.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="outlined" component="label" disabled={fabricDown}>
            {file ? file.name : 'Choose file'}
            <input type="file" hidden onChange={(e) => { setFile(e.target.files[0] || null); setNotice(null); }} />
          </Button>
          <FormControl sx={{ minWidth: 180 }} size="small" disabled={fabricDown}>
            <InputLabel id="classification-label">Classification</InputLabel>
            <Select labelId="classification-label" value={classification} label="Classification" onChange={(e) => setClassification(e.target.value)}>
              {CLASSIFICATIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={upload} disabled={fabricDown || uploading || !file}>
            {uploading ? 'Uploading…' : 'Encrypt + Upload + Protect'}
          </Button>
        </Box>
      </Paper>

      <Typography variant="h6" sx={{ mt: 1 }}>My Assets ({assetsQuery.isLoading ? '…' : assets.length})</Typography>
      {assetsQuery.isLoading
        ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}><CircularProgress size={20} /><Typography variant="body2">Loading assets…</Typography></Box>
        : assetsQuery.isError && !fabricDown
          ? <Alert severity="error" sx={{ mt: 1 }}>Could not load assets: {assetsQuery.error?.response?.data?.message || 'backend error'}. <Button size="small" onClick={() => assetsQuery.refetch()}>Retry</Button></Alert>
          : assets.length === 0
            ? <Typography variant="body2">{fabricDown ? 'Asset list unavailable while the blockchain is down.' : `No assets for ${ownerDID || 'this identity'} yet — upload your first file above.`}</Typography>
            : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Asset ID</TableCell>
                <TableCell>Classification</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Tx</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assets.map((a, i) => (
                <TableRow key={a.assetId || a.id || i} selected={selected === a}>
                  <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.assetId || a.id}</TableCell>
                  <TableCell><Chip label={a.classification || '—'} size="small" /></TableCell>
                  <TableCell>{a.status || ''}</TableCell>
                  <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.txHash || a.txId || ''}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => setSelected(a)}>Detail</Button>
                    <Button size="small" onClick={() => protect(a)} disabled={fabricDown}>View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

      {selected && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6">Asset Detail + Provenance</Typography>
          <pre style={{ maxHeight: 200, overflow: 'auto' }}>{JSON.stringify(selected, null, 2)}</pre>
          <Typography variant="subtitle2" sx={{ mt: 1 }}>History ({history.length})</Typography>
          <pre style={{ maxHeight: 200, overflow: 'auto' }}>{JSON.stringify(history, null, 2)}</pre>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            <TextField size="small" label="Transfer to DID" value={toDID} onChange={(e) => setToDID(e.target.value)} />
            <TextField size="small" label="Owner signature" helperText="Required for transfer or irreversible burn" value={signature} onChange={(e) => setSignature(e.target.value)} />
            <Button variant="outlined" onClick={transfer} disabled={fabricDown}>Transfer</Button>
            <Button variant="outlined" color="error" onClick={burn} disabled={fabricDown}>Burn</Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
