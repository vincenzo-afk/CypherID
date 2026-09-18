import { useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography
} from '@mui/material';
import { Mono, SectionLabel, VAULT_COLORS as C } from '../files/FileVisuals.jsx';

/**
 * RevokeAccessModal — states precisely what ends and that it is immediate.
 * Calls the real revoke endpoint; shows ACCESS REVOKED ✓ on confirmation.
 */
export default function RevokeAccessModal({ open, onClose, grant, onRevoked }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  if (!grant) return null;

  const close = () => { if (!busy) { setDone(false); setError(null); onClose(); } };

  const revoke = async () => {
    setBusy(true); setError(null);
    try {
      await onRevoked(grant);
      setDone(true);
    } catch (e) {
      setError(e?.response?.data?.message || 'Revocation failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open} onClose={close} maxWidth="xs" fullWidth
      PaperProps={{ sx: { bgcolor: C.panel, border: '1px solid rgba(248,113,113,0.35)', borderRadius: '4px', backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <SectionLabel sx={{ color: C.red }}>{done ? 'ACCESS REVOKED ✓' : 'REVOKE ACCESS?'}</SectionLabel>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {done ? (
          <Typography sx={{ color: C.dim, fontSize: '0.84rem' }}>
            The grant has been revoked on the access service. It no longer applies.
          </Typography>
        ) : (
          <>
            <Typography sx={{ color: C.dim, fontSize: '0.84rem', lineHeight: 1.7 }}>
              <Typography component="span" sx={{ color: C.text, fontFamily: C.mono, fontSize: '0.8rem' }}>
                {grant.toDID}
              </Typography>
              {' '}will immediately lose {grant.action === 'WRITE' ? 'READ + WRITE' : 'READ'} access to
            </Typography>
            <Mono sx={{ display: 'block', mt: 1, mb: 1.5 }}>{grant.resourceId}</Mono>
            <Typography sx={{ color: C.dim, fontSize: '0.78rem' }}>
              This action takes effect immediately.
            </Typography>
            {error && (
              <Typography role="alert" sx={{ color: C.red, fontFamily: C.mono, fontSize: '0.72rem', mt: 1.5 }}>✕ {error}</Typography>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {done ? (
          <Button onClick={close} sx={{ color: C.cyan, letterSpacing: '0.06em' }}>DONE</Button>
        ) : (
          <>
            <Button onClick={close} disabled={busy} sx={{ color: C.dim, letterSpacing: '0.06em' }}>KEEP ACCESS</Button>
            <Button
              onClick={revoke} disabled={busy} variant="contained"
              sx={{
                bgcolor: 'rgba(248,113,113,0.85)', color: '#1B0505', fontWeight: 700, letterSpacing: '0.06em',
                '&:hover': { bgcolor: 'rgba(248,113,113,1)' }
              }}
            >
              {busy ? 'REVOKING…' : 'REVOKE ACCESS'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
