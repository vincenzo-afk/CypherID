import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, Chip, FormControl, InputLabel, MenuItem, Select,
  TextField, Typography, Table, TableBody, TableCell, TableHead, TableRow
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

export default function AssetHubPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [classification, setClassification] = useState('CONFIDENTIAL');
  const [msg, setMsg] = useState('');
  const [selected, setSelected] = useState(null);
  const [toDID, setToDID] = useState('');
  const [signature, setSignature] = useState('');

  const ownerDID = user?.did || '';
  const assetsQuery = useQuery({
    queryKey: ['assets', ownerDID],
    queryFn: () => api.listAssets(ownerDID).catch(() => []),
    enabled: Boolean(ownerDID)
  });
  const assets = listOf(assetsQuery.data);

  const historyQuery = useQuery({
    queryKey: ['asset-history', selected?.assetId || selected?.id],
    queryFn: () => api.assetHistory(selected.assetId || selected.id).catch(() => ({ history: [] })),
    enabled: Boolean(selected)
  });
  const history = listOf(historyQuery.data?.history || historyQuery.data?.events || historyQuery.data);

  const upload = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('classification', classification);
    try {
      const res = await api.uploadAsset(fd);
      const assetId = res.assetId || res.id;
      setMsg(`Minted ${assetId}. Tx: ${res.txHash || res.txId || 'recorded'}.`);
      assetsQuery.refetch();
      const session = await api.issueProtectedSession(assetId);
      if (session.sessionId) {
        navigate(`/protected/document/${session.sessionId}`, { state: { sessionToken: session.sessionToken } });
      }
    } catch { setMsg('Upload failed — check file, classification, and backend.'); }
  };

  const protect = async (asset) => {
    const assetId = asset.assetId || asset.id;
    try {
      const session = await api.issueProtectedSession(assetId);
      if (session.sessionId) {
        navigate(`/protected/document/${session.sessionId}`, { state: { sessionToken: session.sessionToken } });
      } else setMsg('Session issuance returned no session — check backend.');
    } catch { setMsg('Protected session failed — access may be denied for this asset.'); }
  };

  const transfer = async () => {
    if (!selected || !toDID.trim() || !signature.trim()) { setMsg('Transfer needs target DID + owner signature.'); return; }
    const assetId = selected.assetId || selected.id;
    try {
      const res = await api.transferAsset(assetId, { toDID: toDID.trim(), ownerSignature: signature.trim() });
      setMsg(`Transferred ${assetId}. Tx: ${res.txHash || res.txId || 'recorded'}.`);
      assetsQuery.refetch();
    } catch (e) { setMsg(e?.response?.data?.message || 'Transfer failed.'); }
  };

  const burn = async () => {
    if (!selected || !signature.trim()) { setMsg('Burn needs the owner signature.'); return; }
    if (!window.confirm(`Burn asset ${selected.assetId || selected.id}? This is irreversible.`)) return;
    const assetId = selected.assetId || selected.id;
    try {
      const res = await api.burnAsset(assetId, { ownerSignature: signature.trim() });
      setMsg(`Burned ${assetId}. Tx: ${res.txHash || res.txId || 'recorded'}.`);
      setSelected(null);
      assetsQuery.refetch();
    } catch (e) { setMsg(e?.response?.data?.message || 'Burn failed.'); }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Asset Hub</Typography>

      <Typography variant="h6">Upload + Mint</Typography>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <FormControl sx={{ ml: 2, minWidth: 180 }} size="small">
        <InputLabel id="classification-label">Classification</InputLabel>
        <Select labelId="classification-label" value={classification} label="Classification" onChange={(e) => setClassification(e.target.value)}>
          {CLASSIFICATIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </Select>
      </FormControl>
      <Button variant="contained" sx={{ ml: 2 }} onClick={upload}>Encrypt + Upload + Protect</Button>
      {msg && <Typography sx={{ mt: 2 }}>{msg}</Typography>}

      <Typography variant="h6" sx={{ mt: 3 }}>My Assets ({assets.length})</Typography>
      {assets.length === 0
        ? <Typography variant="body2">No assets for {ownerDID || 'this identity'}.</Typography>
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
                    <Button size="small" onClick={() => protect(a)}>View</Button>
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
            <TextField size="small" label="Owner signature" value={signature} onChange={(e) => setSignature(e.target.value)} />
            <Button variant="outlined" onClick={transfer}>Transfer</Button>
            <Button variant="outlined" color="error" onClick={burn}>Burn</Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
