import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Accordion, AccordionDetails, AccordionSummary, Box, Button, Chip, CircularProgress,
  Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography
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

// Roles are internal codes; show them as words a person recognises.
const ROLE_LABELS = {
  SUPER_ADMIN: 'Administrator (full)',
  ORG_ADMIN: 'Organization admin',
  SYSTEM_AUDITOR: 'Auditor',
  ORG_MEMBER: 'Member',
  TOP_SECRET: 'Top-secret clearance',
  CLEARANCE_LEVEL_1: 'Clearance level 1',
  CLEARANCE_LEVEL_2: 'Clearance level 2',
  CLEARANCE_LEVEL_3: 'Clearance level 3',
  CLEARANCE_LEVEL_4: 'Clearance level 4'
};
const roleLabel = (r) => ROLE_LABELS[r] || r;

export default function IdentityWalletPage() {
  const { user } = useAuth();
  const [did, setDid] = useState(user?.did || '');
  const [target, setTarget] = useState(user?.did || '');
  const [copied, setCopied] = useState(false);

  const docQuery = useQuery({
    queryKey: ['did-doc', target],
    queryFn: () => api.resolveDID(target).catch((e) => ({
      error: e?.response?.status === 404 ? 'DID not found'
        : e?.response?.data?.code === 'FABRIC_UNAVAILABLE' ? 'Blockchain unavailable (running without Fabric)'
        : 'Resolve failed'
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
  const holderName = didDoc?.kycData?.name || doc.kycData?.name || null;
  const organization = didDoc?.organization || doc.organization || null;
  const vcs = listOf(vcQuery.data);

  const copyDid = async () => {
    try { await navigator.clipboard.writeText(target); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { /* clipboard unavailable */ }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>My ID</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        This is your digital identity — what everyone else uses to know it is really
        you. You can look up any ID to see who it belongs to and what it may do.
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>You are signed in as</Typography>
        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
          <strong>{user?.did}</strong>
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
          {(user?.roles || []).map((r) => (
            <Chip key={r} size="small" label={roleLabel(r)} />
          ))}
          {user?.organization && <Chip size="small" variant="outlined" label={user.organization} />}
        </Box>
      </Paper>

      <Typography variant="h6" sx={{ mt: 3 }}>Look up an ID</Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
        <TextField
          label="Digital ID"
          placeholder="did:cypherid:…"
          value={did}
          onChange={(e) => setDid(e.target.value)}
          sx={{ flex: 1, minWidth: 240 }}
        />
        <Button variant="outlined" onClick={() => setTarget(did.trim())} disabled={!did.trim()}>Look up</Button>
      </Box>

      {target && (
        <Paper sx={{ p: 3, mt: 2 }}>
          {docQuery.isLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">Loading…</Typography>
            </Box>
          )}

          {!docQuery.isLoading && doc.error && (
            <Typography color="error">{doc.error}</Typography>
          )}

          {!docQuery.isLoading && !doc.error && (
            <>
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}><strong>{target}</strong></Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5, alignItems: 'center' }}>
                {status && (
                  <Chip
                    size="small"
                    color={statusColor(status)}
                    label={status === 'ACTIVE' ? 'Active' : status === 'SUSPENDED' ? 'Suspended' : status === 'REVOKED' ? 'Cancelled' : status}
                  />
                )}
                {holderName && <Chip size="small" variant="outlined" label={holderName} />}
                {organization && <Chip size="small" variant="outlined" label={organization} />}
                <Button size="small" onClick={copyDid}>{copied ? 'Copied' : 'Copy ID'}</Button>
              </Box>
            </>
          )}

          <Accordion elevation={0} sx={{ mt: 2, border: '1px solid #e5e7eb', boxShadow: 'none' }}>
            <AccordionSummary>
              <Typography variant="body2">Technical details</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <pre style={{ margin: 0, maxHeight: 220, overflow: 'auto' }}>{JSON.stringify(didDoc || doc, null, 2)}</pre>
            </AccordionDetails>
          </Accordion>
        </Paper>
      )}

      <Typography variant="h6" sx={{ mt: 3 }}>Certificates and clearances ({vcs.length})</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Proofs issued to this ID by an organization — for example a security clearance.
      </Typography>
      {vcQuery.isLoading
        ? <CircularProgress size={20} />
        : vcs.length === 0
          ? <Paper sx={{ p: 3, textAlign: 'center' }}><Typography variant="body2" color="text.secondary">Nothing issued to this ID yet.</Typography></Paper>
          : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Issued by</TableCell>
                  <TableCell>State</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell>Proof</TableCell>
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
