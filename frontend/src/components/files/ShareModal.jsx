import { useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, TextField, Typography
} from '@mui/material';
import { Mono, SectionLabel, VAULT_COLORS as C } from './FileVisuals.jsx';

const isoIn = (days) => {
  const d = new Date(Date.now() + days * 24 * 3600 * 1000);
  return d.toISOString();
};

/**
 * ShareModal — grant a delegation through the real access service
 * (POST /api/v1/access/delegate → {toDID, resourceId, action, expiresAt}).
 * Shows the exact values that were actually granted after the backend responds.
 */
export default function ShareModal({ open, onClose, asset, onGrant }) {
  const [toDID, setToDID] = useState('');
  const [action, setAction] = useState('READ');
  const [expiryChoice, setExpiryChoice] = useState('7');
  const [busy, setBusy] = useState(false);
  const [granted, setGranted] = useState(null);
  const [error, setError] = useState(null);

  if (!asset) return null;
  const assetId = asset.assetId || asset.id;

  const close = () => {
    if (busy) return;
    setToDID(''); setAction('READ'); setExpiryChoice('7');
    setGranted(null); setError(null);
    onClose();
  };

  const grant = async () => {
    if (!toDID.trim()) { setError('Enter the digital ID or organization to share with.'); return; }
    setBusy(true); setError(null);
    try {
      const expiresAt = expiryChoice === 'never' ? isoIn(365 * 5) : isoIn(Number(expiryChoice));
      const res = await onGrant({ toDID: toDID.trim(), resourceId: assetId, action, expiresAt });
      setGranted({ toDID: res?.toDID || toDID.trim(), action: res?.action || action, expiresAt: res?.expiresAt || expiresAt });
    } catch (e) {
      setError(e?.response?.data?.message || 'The access service refused this request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open} onClose={close} maxWidth="xs" fullWidth
      PaperProps={{ sx: { bgcolor: C.panel, border: `1px solid ${C.line}`, borderRadius: '4px', backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <SectionLabel>SHARE FILE</SectionLabel>
        <Typography sx={{ color: C.text, fontWeight: 600, mt: 0.5 }}>{asset.fileName || assetId}</Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {granted ? (
          <Box sx={{ py: 2 }}>
            <Typography sx={{ color: C.green, fontFamily: C.mono, fontSize: '0.78rem', letterSpacing: '0.1em', mb: 1.5 }}>
              ✓ ACCESS GRANTED
            </Typography>
            <SectionLabel sx={{ display: 'block', mb: 0.5 }}>IDENTITY</SectionLabel>
            <Mono sx={{ display: 'block', mb: 1.5 }}>{granted.toDID}</Mono>
            <SectionLabel sx={{ display: 'block', mb: 0.5 }}>PERMISSION</SectionLabel>
            <Mono sx={{ display: 'block', mb: 1.5 }}>{granted.action === 'READ' ? 'READ' : 'READ + WRITE'}</Mono>
            <SectionLabel sx={{ display: 'block', mb: 0.5 }}>EXPIRES</SectionLabel>
            <Mono sx={{ display: 'block' }}>{new Date(granted.expiresAt).toLocaleString()}</Mono>
          </Box>
        ) : (
          <>
            <TextField
              fullWidth size="small" margin="dense"
              label="Digital ID / Organization"
              placeholder="did:cypherid:… or organization name"
              value={toDID} onChange={(e) => setToDID(e.target.value)}
              error={Boolean(error && !toDID.trim())}
              sx={{ '& .MuiOutlinedInput-root': { fontFamily: C.mono, fontSize: '0.8rem' } }}
            />
            <TextField
              select fullWidth size="small" margin="dense"
              label="Permission" value={action}
              onChange={(e) => setAction(e.target.value)}
            >
              <MenuItem value="READ">Read</MenuItem>
              <MenuItem value="WRITE">Read + Write</MenuItem>
            </TextField>
            <TextField
              select fullWidth size="small" margin="dense"
              label="Expiration" value={expiryChoice}
              onChange={(e) => setExpiryChoice(e.target.value)}
            >
              <MenuItem value="1">1 day</MenuItem>
              <MenuItem value="7">7 days</MenuItem>
              <MenuItem value="30">30 days</MenuItem>
              <MenuItem value="never">Never</MenuItem>
            </TextField>
            {error && (
              <Typography role="alert" sx={{ color: C.red, fontFamily: C.mono, fontSize: '0.72rem', mt: 1 }}>
                ✕ {error}
              </Typography>
            )}
            <Typography sx={{ color: C.dim, fontSize: '0.72rem', mt: 1.5 }}>
              Grants a real delegation on the access service. It can be revoked at any time from this file's panel.
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {granted ? (
          <Button onClick={close} sx={{ color: C.cyan, letterSpacing: '0.06em' }}>DONE</Button>
        ) : (
          <>
            <Button onClick={close} disabled={busy} sx={{ color: C.dim, letterSpacing: '0.06em' }}>CANCEL</Button>
            <Button
              onClick={grant} disabled={busy}
              variant="contained"
              sx={{ bgcolor: C.cyan, color: '#04121F', fontWeight: 700, letterSpacing: '0.06em', '&:hover': { bgcolor: '#5CB8FF' } }}
            >
              {busy ? 'GRANTING…' : 'GRANT ACCESS'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
