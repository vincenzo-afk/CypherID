import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, Chip, TextField, Typography,
  Table, TableBody, TableCell, TableHead, TableRow
} from '@mui/material';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const listOf = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.credentials)) return data.credentials;
  if (Array.isArray(data?.content)) return data.content;
  return [];
};

const statusColor = (s) => {
  if (s === 'ACTIVE') return 'success';
  if (s === 'SUSPENDED') return 'warning';
  if (s === 'REVOKED') return 'error';
  return 'default';
};

export default function IdentityWalletPage() {
  const { user } = useAuth();
  const [did, setDid] = useState(user?.did || '');
  const [target, setTarget] = useState(user?.did || '');
  const [copied, setCopied] = useState(false);

  const docQuery = useQuery({
    queryKey: ['did-doc', target],
    queryFn: () => api.resolveDID(target).catch((e) => ({
      error: e?.response?.status === 404 ? 'DID not found' : 'Resolve failed'
    })),
    enabled: Boolean(target)
  });

  const vcQuery = useQuery({
    queryKey: ['vcs', target],
    queryFn: () => api.listCredentials(target).catch(() => ({ credentials: [] })),
    enabled: Boolean(target)
  });

  const doc = docQuery.data || {};
  const didDoc = doc.didDocument || doc.did || null;
  const status = doc.status || didDoc?.status || null;
  const vcs = listOf(vcQuery.data);

  const copyDid = async () => {
    try { await navigator.clipboard.writeText(target); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { /* clipboard unavailable */ }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Identity Wallet</Typography>
      <Typography variant="body2">Signed in as: {user?.did} ({(user?.roles || []).join(', ')})</Typography>

      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <TextField label="DID to inspect" value={did} onChange={(e) => setDid(e.target.value)} fullWidth />
        <Button variant="outlined" onClick={() => setTarget(did.trim())} disabled={!did.trim()}>Resolve</Button>
      </Box>

      {target && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ wordBreak: 'break-all' }}>{target}</Typography>
            {status && <Chip label={status} color={statusColor(status)} size="small" />}
            <Button size="small" onClick={copyDid}>{copied ? 'Copied' : 'Copy DID'}</Button>
          </Box>
          {doc.error
            ? <Typography color="error" sx={{ mt: 1 }}>{doc.error}</Typography>
            : <pre style={{ marginTop: 8, maxHeight: 220, overflow: 'auto' }}>{JSON.stringify(didDoc || doc, null, 2)}</pre>}
        </Box>
      )}

      <Typography variant="h6" sx={{ mt: 3 }}>Verifiable Credentials ({vcs.length})</Typography>
      {vcs.length === 0
        ? <Typography variant="body2">No credentials found for this DID.</Typography>
        : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Issuer</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Tx</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vcs.map((vc, i) => (
                <TableRow key={vc.vcId || vc.id || i}>
                  <TableCell>{vc.type || vc.credentialType || ''}</TableCell>
                  <TableCell sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{vc.issuerDid || vc.issuer || ''}</TableCell>
                  <TableCell>
                    <Chip label={vc.status || 'UNKNOWN'} color={statusColor(vc.status)} size="small" />
                  </TableCell>
                  <TableCell>{vc.expiresAt || vc.expirationDate || ''}</TableCell>
                  <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{vc.txHash || vc.txId || ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
    </Box>
  );
}
