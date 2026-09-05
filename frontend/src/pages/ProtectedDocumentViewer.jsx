import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
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
  const [obscured, setObscured] = useState(false);
  const [hiddenCount, setHiddenCount] = useState(0);

  useEffect(() => {
    if (!sessionToken) return;
    api.sessionInfo(sessionToken).then(setInfo).catch(() => setLines(['Session invalid or expired. Re-authorization required.']));
  }, [sessionToken]);

  useEffect(() => {
    if (!sessionToken || !info) return;
    let cancelled = false;
    const total = info.totalChunks || 1;
    (async () => {
      const out = [];
      for (let i = 0; i < total; i++) {
        try {
          const chunk = await api.fetchChunk(sessionToken, i);
          out.push(typeof chunk === 'string' ? chunk : JSON.stringify(chunk));
        } catch (e) {
          if (e?.response?.status === 403) { setObscured(true); out.push('[Chunk withheld: session obscured]'); }
          else { out.push(`[Chunk ${i} unavailable]`); }
        }
        if (cancelled) return;
        setLines([...out]);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionToken, info]);

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
      <Box sx={{ mt: 2 }}>
        <ProtectedRenderer
          lines={lines}
          profile={info?.profile || 'MEDIUM'}
          watermark={info?.watermark || null}
          sessionSeed={sessionId ? sessionId.length : 0}
          obscured={obscured}
        />
      </Box>
    </Box>
  );
}
