import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, CircularProgress,
  FormControl, InputLabel, MenuItem, Paper, Select, TextField, Typography,
  Table, TableBody, TableCell, TableHead, TableRow
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const CLASSIFICATIONS = ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'];

// Sensitivity is an internal scale; show what it means in plain words.
const CLASSIFICATION_LABELS = {
  UNCLASSIFIED: 'Unclassified — anyone in the organization',
  CONFIDENTIAL: 'Confidential — approved people only',
  SECRET: 'Secret — need-to-know only',
  TOP_SECRET: 'Top secret — highest protection'
};
const sensitivityLabel = (c) => CLASSIFICATION_LABELS[c] || c;

const STATUS_LABELS = { ACTIVE: 'Active', TRANSFERRED: 'Given away', BURNED: 'Destroyed', SUSPENDED: 'Suspended' };
const statusLabel = (s) => STATUS_LABELS[s] || s;

const listOf = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.assets)) return data.assets;
  if (Array.isArray(data?.content)) return data.content;
  return [];
};

const isFabricDown = (e) =>
  e?.response?.status === 503 || e?.response?.data?.code === 'FABRIC_UNAVAILABLE';

const FABRIC_MSG = 'The secure record that proves who owns what is not reachable right now, so files cannot be added, listed, passed on or destroyed. Ask your administrator to bring the network back up.';

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
    if (!selected || !toDID.trim() || !signature.trim()) { say('warning', 'To give a file away we need who it goes to and your signature.'); return; }
    const assetId = selected.assetId || selected.id;
    try {
      const res = await api.transferAsset(assetId, { toDID: toDID.trim(), ownerSignature: signature.trim() });
      say('success', `Transferred ${assetId}. Tx: ${res.txHash || res.txId || 'recorded'}.`);
      assetsQuery.refetch();
    } catch (e) { say('error', explain(e, 'Transfer failed.')); }
  };

  const burn = async () => {
    if (!selected || !signature.trim()) { say('warning', 'Destroying a file needs your signature first.'); return; }
    if (!window.confirm(`Destroy ${selected.fileName || selected.assetId || selected.id}? This cannot be undone.`)) return;
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
      <Typography variant="h5" gutterBottom>My files</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Add any kind of file — a document, a picture, a video, a zip. It is locked
        with encryption, stored safely, and recorded as yours. Only you decide who
        else may open it.
      </Typography>
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

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Add a file</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Pick a file, choose how sensitive it is, then press the button. When it is
          done you go straight to the protected viewer so you can check it looks right.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="outlined" component="label" disabled={fabricDown}>
            {file ? file.name : 'Choose file'}
            <input type="file" hidden onChange={(e) => { setFile(e.target.files[0] || null); setNotice(null); }} />
          </Button>
          <FormControl sx={{ minWidth: 260 }} size="small" disabled={fabricDown}>
            <InputLabel id="classification-label">How sensitive is it?</InputLabel>
            <Select labelId="classification-label" value={classification} label="How sensitive is it?" onChange={(e) => setClassification(e.target.value)}>
              {CLASSIFICATIONS.map((c) => <MenuItem key={c} value={c}>{sensitivityLabel(c)}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={upload} disabled={fabricDown || uploading || !file}>
            {uploading ? 'Uploading…' : 'Encrypt + Upload + Protect'}
          </Button>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Any file type is fine, up to 50 MB.
        </Typography>
      </Paper>

      <Typography variant="h6" sx={{ mt: 1 }}>My files ({assetsQuery.isLoading ? '…' : assets.length})</Typography>
      {assetsQuery.isLoading
        ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}><CircularProgress size={20} /><Typography variant="body2">Loading your files…</Typography></Box>
        : assetsQuery.isError && !fabricDown
          ? <Alert severity="error" sx={{ mt: 1 }}>We could not load your files ({assetsQuery.error?.response?.data?.message || 'service problem'}). <Button size="small" onClick={() => assetsQuery.refetch()}>Try again</Button></Alert>
          : assets.length === 0
            ? <Paper sx={{ p: 3, textAlign: 'center' }}><Typography variant="body2" color="text.secondary">{fabricDown ? 'Your file list cannot be shown while the secure record is unreachable.' : 'No files yet. Add your first file above — it only takes a moment.'}</Typography></Paper>
            : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>File ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Sensitivity</TableCell>
                <TableCell>State</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assets.map((a, i) => (
                <TableRow key={a.assetId || a.id || i} selected={selected === a}>
                  <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.assetId || a.id}</TableCell>
                  <TableCell sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.fileName || a.name || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={a.classification ? a.classification.replace(/_/g, ' ').toLowerCase() : '—'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{statusLabel(a.status) || ''}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => setSelected(a)}>Details</Button>
                    <Button size="small" onClick={() => protect(a)} disabled={fabricDown}>View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

      {selected && (
        <Paper sx={{ mt: 3, p: 3 }}>
          <Typography variant="h6" gutterBottom>File details</Typography>
          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
            <strong>{selected.fileName || selected.name || 'File'}</strong>
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
            <Chip size="small" label={`ID: ${selected.assetId || selected.id}`} />
            {selected.classification && <Chip size="small" label={sensitivityLabel(selected.classification)} />}
            {selected.status && <Chip size="small" color="primary" label={statusLabel(selected.status)} />}
          </Box>

          <Accordion elevation={0} sx={{ mt: 2, border: '1px solid #e5e7eb', boxShadow: 'none' }}>
            <AccordionSummary>
              <Typography variant="body2">Technical details and history ({history.length} events)</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <pre style={{ margin: 0, maxHeight: 200, overflow: 'auto' }}>{JSON.stringify(selected, null, 2)}</pre>
              <pre style={{ margin: 0, maxHeight: 200, overflow: 'auto' }}>{JSON.stringify(history, null, 2)}</pre>
            </AccordionDetails>
          </Accordion>

          <Typography variant="subtitle2" sx={{ mt: 2 }}>Pass this file on</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            The other person then owns it — you can no longer open it.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <TextField size="small" label="Give to (digital ID)" value={toDID} onChange={(e) => setToDID(e.target.value)} />
            <TextField
              size="small"
              label="Signature"
              helperText="Type anything to confirm it is you"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
            />
            <Button variant="outlined" onClick={transfer} disabled={fabricDown}>Transfer</Button>
          </Box>

          <Typography variant="subtitle2" sx={{ mt: 2 }}>Destroy this file</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Destroying is permanent: the file disappears from your list, and only the
            record that it once existed stays behind.
          </Typography>
          <Button variant="outlined" color="error" onClick={burn} disabled={fabricDown}>Burn</Button>
        </Paper>
      )}
    </Box>
  );
}
