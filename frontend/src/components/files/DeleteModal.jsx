import { useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography
} from '@mui/material';
import { SectionLabel, VAULT_COLORS as C } from './FileVisuals.jsx';

/**
 * DeleteModal — destructive confirmation for burning a file.
 * The backend requires the owner's signature (BurnAssetRequest.ownerSignature);
 * the wording states plainly what will happen.
 */
export default function DeleteModal({ open, onClose, asset, onDelete }) {
  const [signature, setSignature] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!asset) return null;
  const assetId = asset.assetId || asset.id;
  const name = asset.fileName || assetId;

  const close = () => {
    if (busy) return;
    setSignature(''); setConfirmText(''); setError(null);
    onClose();
  };

  const del = async () => {
    if (!signature.trim()) { setError('Your signature is required to destroy this file.'); return; }
    setBusy(true); setError(null);
    try {
      await onDelete({ ownerSignature: signature.trim() });
      close();
    } catch (e) {
      setError(e?.response?.data?.message || 'The ledger refused this deletion.');
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open} onClose={close} maxWidth="xs" fullWidth
      PaperProps={{ sx: { bgcolor: C.panel, border: '1px solid rgba(248,113,113,0.35)', borderRadius: '4px', backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <SectionLabel sx={{ color: C.red }}>DELETE FILE?</SectionLabel>
        <Typography sx={{ color: C.text, fontWeight: 600, mt: 0.5 }}>{name}</Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Typography sx={{ color: C.dim, fontSize: '0.82rem', lineHeight: 1.6 }}>
          This permanently destroys the encrypted file and its on-chain record.
          Associated access permissions stop applying. This cannot be undone.
        </Typography>
        <TextField
          fullWidth size="small" margin="normal"
          label="Type the file name to confirm"
          value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
          sx={{ '& .MuiOutlinedInput-root': { fontFamily: C.mono, fontSize: '0.8rem' } }}
        />
        <TextField
          fullWidth size="small" margin="dense"
          label="Owner signature"
          placeholder="Your cryptographic signature"
          value={signature} onChange={(e) => setSignature(e.target.value)}
          error={Boolean(error)}
          sx={{ '& .MuiOutlinedInput-root': { fontFamily: C.mono, fontSize: '0.8rem' } }}
        />
        {error && (
          <Typography role="alert" sx={{ color: C.red, fontFamily: C.mono, fontSize: '0.72rem', mt: 1 }}>
            ✕ {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={close} disabled={busy} sx={{ color: C.dim, letterSpacing: '0.06em' }}>CANCEL</Button>
        <Button
          onClick={del} disabled={busy || confirmText !== name}
          variant="contained"
          sx={{
            bgcolor: 'rgba(248,113,113,0.85)', color: '#1B0505', fontWeight: 700, letterSpacing: '0.06em',
            '&:hover': { bgcolor: 'rgba(248,113,113,1)' },
            '&:disabled': { bgcolor: 'rgba(248,113,113,0.25)', color: 'rgba(232,238,251,0.5)' }
          }}
        >
          {busy ? 'DESTROYING…' : 'DELETE FILE'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
