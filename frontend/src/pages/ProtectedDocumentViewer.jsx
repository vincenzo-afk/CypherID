import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import ProtectedRenderer from '../renderer/ProtectedRenderer.jsx';
import ProtectionStatus from '../components/ProtectionStatus.jsx';
import { startCaptureMonitoring } from '../monitoring/captureMonitor.js';
import { api } from '../services/api.js';

// Full-screen overlay viewer per docs/frontend/12_PROTECTED_DOCUMENT_UI.md
export default function ProtectedDocumentViewer() {
  const { sessionId } = useParams();
  const location = useLocation();
  const [sessionToken] = useState(location.state?.sessionToken || '');
  const [info, setInfo] = useState(null);
  const [lines, setLines] = useState(['Loading authorized content…']);
  const [chunk, setChunk] = useState(0);
  const [loadingChunk, setLoadingChunk] = useState(false);
  const [obscured, setObscured] = useState(false);
  const [hiddenCount, setHiddenCount] = useState(0);

  useEffect(() => {
    if (!sessionToken) return;
    api.sessionInfo(sessionToken).then(setInfo).catch(() => setLines(['Session invalid or expired. Re-authorization required.']));
  }, [sessionToken]);

  useEffect(() => {
    if (!sessionToken || !info) return;
    let cancelled = false;
    (async () => {
      setLoadingChunk(true);
      try {
        const bytes = await api.fetchChunk(sessionToken, chunk);
        if (!cancelled) setLines(new TextDecoder('utf-8', { fatal: false }).decode(bytes).split(/\r?\n/));
      } catch (e) {
        if (e?.response?.status === 403) setObscured(true);
        if (!cancelled) setLines([e?.response?.status === 403 ? '[Content withheld: session obscured]' : `[Chunk ${chunk + 1} unavailable]`]);
      } finally {
        if (!cancelled) setLoadingChunk(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionToken, info, chunk]);

  useEffect(() => {
    const stop = startCaptureMonitoring(async (event) => {
      try { await api.logSecurityEvent(sessionId, event); } catch { /* offline: keep local state */ }
      if (event.eventType === 'TAB_HIDDEN') {
        setHiddenCount((c) => {
          if (c + 1 >= 3) setObscured(true);
          return c + 1;
        });
      }
      if (info?.profile && (event.eventType === 'WINDOW_BLUR') && ['HIGH', 'EXTREME'].includes(info.profile)) {
        setObscured(true);
      }
    });
    return stop;
  }, [sessionId, info]);

  return (
    <Box sx={{ position: 'fixed', inset: 0, bgcolor: '#fff', p: 2, overflow: 'auto' }}>
      <Typography variant="h6">Protected Document — {info?.contentId || sessionId}</Typography>
      <ProtectionStatus state={obscured ? 'CONTENT_OBSCURED' : info?.state || 'AUTHORIZED'} profile={info?.profile || 'MEDIUM'} />
      {info?.fileType && !info.fileType.startsWith('text/') && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {info.fileName || 'This file'} is delivered in protected chunks. This viewer currently renders UTF-8 text documents; binary PDF and Office rendering needs a format-specific protected renderer.
        </Alert>
      )}
      <Box sx={{ mt: 2 }}>
        <ProtectedRenderer
          lines={lines}
          profile={info?.profile || 'MEDIUM'}
          watermark={info?.watermark ? { ...info.watermark, contentId: info.contentId } : null}
          sessionSeed={sessionId || ''}
          obscured={obscured}
        />
      </Box>
      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button onClick={() => setChunk((value) => Math.max(0, value - 1))} disabled={chunk === 0 || loadingChunk || obscured}>Previous</Button>
        <Typography variant="body2">Chunk {chunk + 1} of {info?.totalChunks || 1}</Typography>
        <Button onClick={() => setChunk((value) => Math.min((info?.totalChunks || 1) - 1, value + 1))} disabled={chunk >= (info?.totalChunks || 1) - 1 || loadingChunk || obscured}>Next</Button>
        {loadingChunk && <CircularProgress size={18} />}
      </Box>
    </Box>
  );
}
