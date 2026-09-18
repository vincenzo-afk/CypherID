import { useCallback, useRef, useState } from 'react';
import { Box, Button, LinearProgress, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import { FileTypeIcon, Kicker, Mono, SectionLabel, VAULT_COLORS as C } from './FileVisuals.jsx';

const scan = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(320%); }
`;

const fmtSize = (bytes) => {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const STAGES = ['UPLOADING', 'ENCRYPTING', 'STORING', 'VERIFYING'];
const MAX_BYTES = 50 * 1024 * 1024; // enforced by the backend flow (AssetHub previously used 50 MB)

const fileKindLabel = (name = '') => {
  const ext = (name.split('.').pop() || '').toUpperCase();
  return ext && ext.length <= 5 ? ext : 'FILE';
};

/**
 * UploadVault — the vault's upload experience.
 * Drop zone → file preview (NAME/SIZE/TYPE/STATUS) → Cancel / Encrypt & Upload.
 * While the real request runs, the stage display advances through
 * UPLOADING → ENCRYPTING → STORING → VERIFYING. These are progress indicators
 * for the real pipeline (server-side AES-256-GCM → IPFS → on-chain mint) —
 * COMPLETE ✓ only shows after the backend's 201 response.
 */
export default function UploadVault({ onUpload, reducedMotion }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(-1);
  const [result, setResult] = useState(null); // { ok, assetId, txHash }
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const timers = useRef([]);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const pick = (f) => {
    setResult(null); setError(null); setStage(-1); setProgress(0);
    if (!f) return;
    if (f.size === 0) { setError('This file is empty — choose a file with content.'); return; }
    if (f.size > MAX_BYTES) { setError(`Files must be 50 MB or smaller (this one is ${fmtSize(f.size)}).`); return; }
    setFile(f);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) pick(f);
  }, []);

  const upload = async () => {
    if (!file || busy) return;
    setBusy(true); setError(null); setResult(null); setStage(0); setProgress(8);
    clearTimers();
    // Stage display rides ahead of the real request; nothing is faked at the end.
    timers.current = [
      setTimeout(() => { setStage(1); setProgress(34); }, 700),
      setTimeout(() => { setStage(2); setProgress(62); }, 1600),
      setTimeout(() => { setStage(3); setProgress(86); }, 2600)
    ];
    try {
      const res = await onUpload(file);
      clearTimers();
      setStage(4); setProgress(100);
      setResult({ ok: true, assetId: res?.assetId || res?.id, txHash: res?.txHash || res?.txId });
      setFile(null);
    } catch (e) {
      clearTimers();
      setStage(-1); setProgress(0);
      const down = e?.response?.status === 503 || e?.response?.data?.code === 'FABRIC_UNAVAILABLE';
      setError(down
        ? 'The secure ledger is unreachable right now, so the file cannot be vaulted. Try again when the network is back.'
        : (e?.response?.data?.message || 'Upload failed. The file was not stored.'));
      setResult({ ok: false });
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    if (busy) return;
    clearTimers();
    setFile(null); setStage(-1); setProgress(0); setResult(null); setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <Box sx={{
      border: `1px solid ${C.line}`, bgcolor: C.panel, borderRadius: '4px', p: { xs: 2, md: 3 },
      position: 'relative', overflow: 'hidden'
    }}>
      <Kicker>SECURE FILE VAULT</Kicker>

      <Box
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !busy && !file && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload a file: drop here or press Enter to browse"
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !busy && !file) { e.preventDefault(); inputRef.current?.click(); } }}
        sx={{
          border: `1px dashed ${dragOver ? C.cyan : C.line}`,
          bgcolor: dragOver ? C.cyanSoft : 'rgba(5,7,13,0.5)',
          borderRadius: '4px',
          py: { xs: 4, md: 5 },
          textAlign: 'center', cursor: file || busy ? 'default' : 'pointer',
          outline: 'none',
          '&:focus-visible': { borderColor: C.cyan, boxShadow: `0 0 0 1px ${C.cyan}` },
          transition: 'border-color 0.2s ease, background 0.2s ease'
        }}
      >
        <input
          ref={inputRef} type="file" hidden
          onChange={(e) => pick(e.target.files?.[0])}
          aria-label="Choose a file to upload"
        />

        {!file && !busy && (
          <Box>
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true" style={{ marginBottom: 10 }}>
              <path d="M15 22V6m0 0l-6 6m6-6l6 6" stroke={C.cyan} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
              <path d="M4 24v3h22v-3" stroke={C.dim} strokeWidth="1.2" opacity="0.7" />
            </svg>
            <Typography sx={{ color: C.text, fontWeight: 600, letterSpacing: '0.08em', fontSize: '0.92rem' }}>
              DROP FILES HERE
            </Typography>
            <Typography sx={{ color: C.dim, fontSize: '0.8rem', mt: 0.5 }}>or click to browse</Typography>
            <Typography sx={{ color: C.dim, fontFamily: C.mono, fontSize: '0.68rem', mt: 1.5, letterSpacing: '0.1em' }}>
              MAX 50 MB · ENCRYPTED SERVER-SIDE (AES-256-GCM) BEFORE STORAGE
            </Typography>
          </Box>
        )}

        {file && !busy && (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 2, textAlign: 'left' }}>
            <FileTypeIcon fileName={file.name} size={38} />
            <Box>
              <Mono>{file.name}</Mono>
              <Typography sx={{ color: C.dim, fontFamily: C.mono, fontSize: '0.7rem', mt: 0.3 }}>
                {fmtSize(file.size)} · {fileKindLabel(file.name)}
              </Typography>
            </Box>
          </Box>
        )}

        {busy && (
          <Box sx={{ maxWidth: 420, mx: 'auto' }}>
            <SectionLabel sx={{ mb: 2 }}>
              {STAGES[Math.min(stage, 3)]}…
            </SectionLabel>
            <LinearProgress
              variant="determinate" value={progress}
              sx={{ height: 3, bgcolor: 'rgba(56,166,255,0.1)', '& .MuiLinearProgress-bar': { bgcolor: C.cyan } }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
              {STAGES.map((s, i) => (
                <Typography key={s} sx={{
                  fontFamily: C.mono, fontSize: '0.6rem', letterSpacing: '0.14em',
                  color: i <= stage ? C.cyan : 'rgba(140,160,196,0.4)'
                }}>
                  {i < stage ? '✓' : i === stage ? '●' : '○'} {s}
                </Typography>
              ))}
            </Box>
            {!reducedMotion && (
              <Box sx={{ mt: 2, height: 1, bgcolor: 'rgba(56,166,255,0.12)', overflow: 'hidden', borderRadius: 1 }}>
                <Box sx={{ width: '30%', height: '100%', bgcolor: C.cyan, opacity: 0.5, animation: `${scan} 1.6s linear infinite` }} />
              </Box>
            )}
          </Box>
        )}
      </Box>

      {error && (
        <Typography role="alert" sx={{ color: C.red, fontFamily: C.mono, fontSize: '0.72rem', mt: 1.5 }}>
          ✕ {error}
        </Typography>
      )}

      {result?.ok && (
        <Box sx={{ mt: 1.5, p: 1.5, border: `1px solid ${C.green}44`, borderRadius: '4px', bgcolor: 'rgba(74,222,128,0.05)' }}>
          <Typography sx={{ color: C.green, fontFamily: C.mono, fontSize: '0.72rem', letterSpacing: '0.1em' }}>
            ✓ COMPLETE — VAULTED &amp; RECORDED ON THE LEDGER
          </Typography>
          {result.assetId && <Mono sx={{ display: 'block', mt: 0.5, color: C.dim }}>ASSET ID {result.assetId}</Mono>}
          {result.txHash && <Mono sx={{ display: 'block', color: C.dim }}>TX {result.txHash}</Mono>}
        </Box>
      )}

      {(file || result || error) && !busy && (
        <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
          <Button
            variant="contained"
            disabled={!file}
            onClick={upload}
            sx={{
              bgcolor: C.cyan, color: '#04121F', fontWeight: 700, letterSpacing: '0.06em', fontSize: '0.78rem',
              px: 3, '&:hover': { bgcolor: '#5CB8FF' }, '&:disabled': { bgcolor: 'rgba(56,166,255,0.25)', color: 'rgba(232,238,251,0.5)' }
            }}
          >
            ENCRYPT &amp; UPLOAD
          </Button>
          <Button
            onClick={reset}
            sx={{ color: C.dim, letterSpacing: '0.06em', fontSize: '0.78rem', '&:hover': { color: C.text, bgcolor: 'transparent' } }}
          >
            CANCEL
          </Button>
        </Box>
      )}
    </Box>
  );
}
