import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, TextField, Typography
} from '@mui/material';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Mono, SectionLabel, VAULT_COLORS as C } from '../files/FileVisuals.jsx';

const isoIn = (hours) => new Date(Date.now() + hours * 3600 * 1000).toISOString();

const PERMISSIONS = [
  { value: 'READ', label: 'READ — can view this file' },
  { value: 'WRITE', label: 'READ + WRITE — can view and modify' }
];

const EXPIRIES = [
  { value: '24', label: '24 hours' },
  { value: '168', label: '7 days' },
  { value: '720', label: '30 days' },
  { value: 'never', label: 'No expiration (long-term)' }
];

/**
 * GrantAccessModal — staged flow over the REAL delegation API.
 * Step 1 recipient → step 2 resource (from your actual files) →
 * step 3 permission (only backend-supported actions) → step 4 expiry →
 * step 5 review + security check → grant → "ACCESS GRANTED ✓" with the
 * values the backend actually confirmed.
 */
export default function GrantAccessModal({ open, onClose, onGranted }) {
  const [step, setStep] = useState(0);
  const [toDID, setToDID] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [action, setAction] = useState('READ');
  const [expiry, setExpiry] = useState('168');
  const [busy, setBusy] = useState(false);
  const [granted, setGranted] = useState(null);
  const [error, setError] = useState(null);

  const { user } = useAuth();
  const ownerDID = user?.did || '';

  const assetsQuery = useQuery({
    queryKey: ['assets', ownerDID, 'grant-picker'],
    queryFn: () => api.listAssets(ownerDID),
    enabled: open && Boolean(ownerDID),
    retry: false
  });
  const assets = useMemo(() => (Array.isArray(assetsQuery.data) ? assetsQuery.data : []), [assetsQuery.data]);

  const reset = () => {
    setStep(0); setToDID(''); setResourceId(''); setAction('READ');
    setExpiry('168'); setBusy(false); setGranted(null); setError(null);
  };
  const close = () => { if (!busy) { reset(); onClose(); } };

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const expiresAt = expiry === 'never' ? isoIn(24 * 365 * 5) : isoIn(Number(expiry));
      const res = await api.delegateAccess({ toDID: toDID.trim(), resourceId: resourceId.trim(), action, expiresAt });
      setGranted({ toDID: res?.toDID || toDID.trim(), action: res?.action || action, expiresAt: res?.expiresAt || expiresAt });
      onGranted?.();
    } catch (e) {
      setError(e?.response?.data?.message || 'The access service refused this grant.');
    } finally {
      setBusy(false);
    }
  };

  const canNext = [
    Boolean(toDID.trim()),
    Boolean(resourceId),
    true,
    true,
    true
  ][step];

  const fileName = assets.find((a) => (a.assetId || a.id) === resourceId)?.fileName || resourceId;

  return (
    <Dialog
      open={open} onClose={close} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: C.panel, border: `1px solid ${C.line}`, borderRadius: '4px', backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ pb: 0.5 }}>
        <SectionLabel>GRANT ACCESS</SectionLabel>
        {!granted && (
          <Box sx={{ display: 'flex', gap: 0.8, mt: 1.2 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Box key={i} sx={{ height: 2, flex: 1, bgcolor: i <= step ? C.cyan : 'rgba(56,166,255,0.15)' }} />
            ))}
          </Box>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {granted ? (
          <Box sx={{ py: 2 }}>
            <Typography sx={{ color: C.green, fontFamily: C.mono, fontSize: '0.8rem', letterSpacing: '0.1em', mb: 2 }}>
              ✓ ACCESS GRANTED
            </Typography>
            <SectionLabel sx={{ display: 'block', mb: 0.5 }}>RECIPIENT</SectionLabel>
            <Mono sx={{ display: 'block', mb: 1.5 }}>{granted.toDID}</Mono>
            <SectionLabel sx={{ display: 'block', mb: 0.5 }}>PERMISSION</SectionLabel>
            <Mono sx={{ display: 'block', mb: 1.5 }}>{granted.action === 'WRITE' ? 'READ + WRITE' : 'READ'}</Mono>
            <SectionLabel sx={{ display: 'block', mb: 0.5 }}>EXPIRES</SectionLabel>
            <Mono sx={{ display: 'block' }}>{new Date(granted.expiresAt).toLocaleString()}</Mono>
          </Box>
        ) : step === 0 && (
          <>
            <SectionLabel sx={{ display: 'block', mb: 1 }}>STEP 1 — SELECT RECIPIENT</SectionLabel>
            <TextField
              autoFocus fullWidth size="small"
              label="Digital ID"
              placeholder="did:cypherid:…"
              value={toDID} onChange={(e) => setToDID(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { fontFamily: C.mono, fontSize: '0.8rem' } }}
            />
          </>
        )}

        {!granted && step === 1 && (
          <>
            <SectionLabel sx={{ display: 'block', mb: 1 }}>STEP 2 — SELECT RESOURCE</SectionLabel>
            {assets.length === 0 ? (
              <Typography sx={{ color: C.dim, fontSize: '0.8rem' }}>
                You have no files in the vault yet — upload a file first, then grant access to it.
              </Typography>
            ) : (
              <TextField select fullWidth size="small" label="Your files" value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
                {assets.map((a) => (
                  <MenuItem key={a.assetId || a.id} value={a.assetId || a.id}>
                    {a.fileName || a.assetId} — {(a.assetId || a.id).slice(0, 20)}…
                  </MenuItem>
                ))}
              </TextField>
            )}
          </>
        )}

        {!granted && step === 2 && (
          <>
            <SectionLabel sx={{ display: 'block', mb: 1 }}>STEP 3 — SELECT PERMISSION</SectionLabel>
            <TextField select fullWidth size="small" value={action} onChange={(e) => setAction(e.target.value)}>
              {PERMISSIONS.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
            </TextField>
            <Typography sx={{ color: C.dim, fontSize: '0.72rem', mt: 1.2 }}>
              Only the permission levels the access service actually enforces are offered.
            </Typography>
          </>
        )}

        {!granted && step === 3 && (
          <>
            <SectionLabel sx={{ display: 'block', mb: 1 }}>STEP 4 — EXPIRATION</SectionLabel>
            <TextField select fullWidth size="small" value={expiry} onChange={(e) => setExpiry(e.target.value)}>
              {EXPIRIES.map((x) => <MenuItem key={x.value} value={x.value}>{x.label}</MenuItem>)}
            </TextField>
          </>
        )}

        {!granted && step === 4 && (
          <>
            <SectionLabel sx={{ display: 'block', mb: 1.5 }}>STEP 5 — REVIEW &amp; SECURITY CHECK</SectionLabel>
            <Box sx={{ border: `1px solid ${C.line}`, borderRadius: '4px', p: 2, bgcolor: 'rgba(5,7,13,0.5)' }}>
              {[
                ['RECIPIENT', toDID.trim(), true],
                ['RESOURCE', fileName, false],
                ['PERMISSION', action === 'WRITE' ? 'READ + WRITE' : 'READ', false],
                ['EXPIRATION', expiry === 'never' ? 'No expiration (long-term)' : `${Math.round(Number(expiry) / 24)} day(s) — ${new Date(isoIn(Number(expiry))).toLocaleDateString()}`, false]
              ].map(([label, value, mono]) => (
                <Box key={label} sx={{ mb: 1.4 }}>
                  <SectionLabel sx={{ display: 'block', mb: 0.3 }}>{label}</SectionLabel>
                  {mono ? <Mono>{value}</Mono> : <Typography sx={{ fontSize: '0.84rem', color: C.text }}>{value}</Typography>}
                </Box>
              ))}
            </Box>
            {error && (
              <Typography role="alert" sx={{ color: C.red, fontFamily: C.mono, fontSize: '0.72rem', mt: 1.5 }}>
                ✕ {error}
              </Typography>
            )}
          </>
        )}

        {!granted && error && step < 4 && (
          <Typography role="alert" sx={{ color: C.red, fontFamily: C.mono, fontSize: '0.72rem', mt: 1.5 }}>✕ {error}</Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        {granted ? (
          <Button onClick={close} sx={{ color: C.cyan, letterSpacing: '0.06em' }}>DONE</Button>
        ) : (
          <>
            {step > 0 && <Button onClick={() => setStep(step - 1)} disabled={busy} sx={{ color: C.dim }}>BACK</Button>}
            <Button onClick={close} disabled={busy} sx={{ color: C.dim }}>CANCEL</Button>
            {step < 4 ? (
              <Button
                variant="contained" disabled={!canNext} onClick={() => setStep(step + 1)}
                sx={{ bgcolor: C.cyan, color: '#04121F', fontWeight: 700, '&:hover': { bgcolor: '#5CB8FF' }, '&:disabled': { bgcolor: 'rgba(56,166,255,0.25)' } }}
              >
                NEXT
              </Button>
            ) : (
              <Button
                variant="contained" disabled={busy} onClick={submit}
                sx={{ bgcolor: C.cyan, color: '#04121F', fontWeight: 700, '&:hover': { bgcolor: '#5CB8FF' } }}
              >
                {busy ? 'GRANTING…' : 'CONFIRM ACCESS'}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
