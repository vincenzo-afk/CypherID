import { useState } from 'react';
import {
  Box, Button, Drawer, IconButton, Typography, Divider
} from '@mui/material';
import { Mono, SectionLabel, FileTypeIcon, ClassificationBadge, ActiveStatusChip, EncryptedBadge, VAULT_COLORS as C } from './FileVisuals.jsx';

const fmtSize = (b) => {
  if (b == null) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const Field = ({ label, children }) => (
  <Box sx={{ mb: 1.6 }}>
    <SectionLabel sx={{ display: 'block', mb: 0.4 }}>{label}</SectionLabel>
    <Typography component="div" sx={{ color: C.text, fontSize: '0.85rem' }}>{children}</Typography>
  </Box>
);

const TimelineDot = ({ color = C.cyan }) => (
  <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color, flexShrink: 0, mt: '5px' }} />
);

/**
 * FileDetails — slide-in panel with the real asset record:
 * metadata from GET /assets/{id}, provenance from GET /assets/{id}/history,
 * the genuine IPFS CID as the content hash, and honest access info.
 * Encryption is real in this stack (AES-256-GCM server-side) and is labeled as such.
 */
export default function FileDetails({ open, onClose, asset, ownerLabel, history, historyLoading, canWrite, onShare, onDelete, onOpen }) {
  const [copied, setCopied] = useState(null);
  if (!asset) return null;
  const assetId = asset.assetId || asset.id;
  const cid = asset.ipfsHash || asset.cid || null;

  const copy = (label, value) => {
    try { navigator.clipboard.writeText(value); } catch { /* clipboard unavailable */ }
    setCopied(label);
    setTimeout(() => setCopied(null), 1600);
  };

  return (
    <Drawer
      anchor="right" open={open} onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 420 }, bgcolor: C.bg, borderLeft: `1px solid ${C.line}`,
          backgroundImage: 'none', p: 0
        }
      }}
    >
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <SectionLabel>FILE DETAILS</SectionLabel>
          <IconButton onClick={onClose} aria-label="Close file details" sx={{ color: C.dim, p: 0.5 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
          <FileTypeIcon fileName={asset.fileName} fileType={asset.fileType} size={40} />
          <Box>
            <Typography sx={{ color: C.text, fontWeight: 600, wordBreak: 'break-all' }}>{asset.fileName || assetId}</Typography>
            <Box sx={{ display: 'flex', gap: 0.8, mt: 0.8, flexWrap: 'wrap' }}>
              <ClassificationBadge classification={asset.classification} />
              <ActiveStatusChip status={asset.status} />
              <EncryptedBadge />
            </Box>
          </Box>
        </Box>

        <Divider sx={{ borderColor: C.line, mb: 2.5 }} />

        <Field label="FILE TYPE">{(asset.fileType || (asset.fileName || '').split('.').pop() || '—').toUpperCase()}</Field>
        <Field label="SIZE">{fmtSize(asset.fileSizeBytes)}</Field>
        <Field label="OWNER">{ownerLabel || asset.ownerDID || '—'}</Field>
        <Field label="CREATED">{fmtDate(asset.createdAt)}</Field>
        <Field label="MODIFIED">{fmtDate(asset.updatedAt || asset.createdAt)}</Field>
        <Field label="ENCRYPTION">AES-256-GCM — per-file key, applied server-side before storage</Field>

        <Box sx={{ mb: 1.6 }}>
          <SectionLabel sx={{ display: 'block', mb: 0.4 }}>CONTENT ADDRESS (IPFS CID)</SectionLabel>
          {cid ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Mono sx={{ flex: 1 }}>{cid}</Mono>
              <Button size="small" onClick={() => copy('cid', cid)} sx={{ color: C.cyan, minWidth: 0, px: 1, fontFamily: C.mono, fontSize: '0.62rem', letterSpacing: '0.1em' }}>
                {copied === 'cid' ? 'COPIED ✓' : 'COPY'}
              </Button>
            </Box>
          ) : (
            <Typography sx={{ color: C.dim, fontSize: '0.8rem' }}>Data unavailable</Typography>
          )}
        </Box>

        <Box sx={{ mb: 2.5 }}>
          <SectionLabel sx={{ display: 'block', mb: 0.4 }}>ASSET ID</SectionLabel>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Mono sx={{ flex: 1 }}>{assetId}</Mono>
            <Button size="small" onClick={() => copy('aid', assetId)} sx={{ color: C.cyan, minWidth: 0, px: 1, fontFamily: C.mono, fontSize: '0.62rem', letterSpacing: '0.1em' }}>
              {copied === 'aid' ? 'COPIED ✓' : 'COPY'}
            </Button>
          </Box>
        </Box>

        <Divider sx={{ borderColor: C.line, mb: 2.5 }} />

        <SectionLabel sx={{ display: 'block', mb: 1.5 }}>AUDIT TRAIL — LEDGER PROVENANCE</SectionLabel>
        {historyLoading && <Typography sx={{ color: C.dim, fontSize: '0.8rem' }}>Loading provenance…</Typography>}
        {!historyLoading && (!history || history.length === 0) && (
          <Typography sx={{ color: C.dim, fontSize: '0.8rem' }}>
            No provenance events are available from the ledger for this file.
          </Typography>
        )}
        {!historyLoading && history.length > 0 && (
          <Box sx={{ mb: 2.5 }}>
            {history.map((h, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1.5, pb: i === history.length - 1 ? 0 : 1.5, position: 'relative' }}>
                {i < history.length - 1 && (
                  <Box sx={{ position: 'absolute', left: '3px', top: '14px', bottom: 0, width: 1, bgcolor: C.line }} />
                )}
                <TimelineDot color={i === 0 ? C.green : C.cyan} />
                <Box>
                  <Typography sx={{ color: C.text, fontSize: '0.78rem', fontFamily: C.mono, letterSpacing: '0.06em' }}>
                    {(h.event || h.type || 'EVENT').toString().toUpperCase()}
                  </Typography>
                  <Typography sx={{ color: C.dim, fontSize: '0.72rem' }}>
                    {h.actor || '—'} · {fmtDate(h.timestamp || h.time)}
                  </Typography>
                  {(h.txHash || h.txId) && (
                    <Mono sx={{ fontSize: '0.62rem', color: 'rgba(140,160,196,0.7)' }}>TX {h.txHash || h.txId}</Mono>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        )}

        <Divider sx={{ borderColor: C.line, mb: 2.5 }} />

        <SectionLabel sx={{ display: 'block', mb: 1 }}>ACCESS</SectionLabel>
        <Typography sx={{ color: C.dim, fontSize: '0.78rem', mb: 2 }}>
          This file follows your organization's access policies and any delegations granted below.
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap' }}>
          {onOpen && (
            <Button
              variant="contained" onClick={onOpen}
              sx={{ bgcolor: C.cyan, color: '#04121F', fontWeight: 700, letterSpacing: '0.06em', fontSize: '0.74rem', '&:hover': { bgcolor: '#5CB8FF' } }}
            >
              OPEN
            </Button>
          )}
          {canWrite && (
            <Button onClick={onShare} sx={{ color: C.cyan, border: `1px solid ${C.cyan}55`, letterSpacing: '0.06em', fontSize: '0.74rem' }}>
              SHARE
            </Button>
          )}
          {canWrite && (
            <Button onClick={onDelete} sx={{ color: C.red, border: '1px solid rgba(248,113,113,0.4)', letterSpacing: '0.06em', fontSize: '0.74rem' }}>
              DELETE
            </Button>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}
