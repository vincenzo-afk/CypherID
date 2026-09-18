import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import ProtectedRenderer from '../renderer/ProtectedRenderer.jsx';
import ProtectionStatus from '../components/ProtectionStatus.jsx';
import { startCaptureMonitoring } from '../monitoring/captureMonitor.js';
import { formatCountdown, msUntilExpiry, sessionSeedFrom } from '../renderer/seed.js';
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
  const [now, setNow] = useState(Date.now());

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

  // Close the server-side session when the viewer unmounts (no leaks).
  useEffect(() => () => {
    if (sessionId) api.closeSession(sessionId).catch(() => {});
  }, [sessionId]);

  // Live expiry countdown.
  useEffect(() => {
    if (!info?.expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [info]);

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

  useEffect(() => {
    if (obscured) {
      window.dispatchEvent(new CustomEvent('cypherid:toast',
        { detail: 'Content obscured — suspicious activity detected.' }));
    }
  }, [obscured]);

  const remaining = info?.expiresAt ? msUntilExpiry(info.expiresAt) : null;

  return (
    <Box sx={{ position: 'fixed', inset: 0, bgcolor: '#fff', p: 2, overflow: 'auto' }}>
      <Typography variant="h6">Protected Document — {info?.contentId || sessionId}</Typography>
      <ProtectionStatus state={obscured ? 'CONTENT_OBSCURED' : info?.state || 'AUTHORIZED'} profile={info?.profile || 'MEDIUM'} />
      <Typography variant="caption" color={remaining != null && remaining < 120000 ? 'error' : 'text.secondary'}>
        {remaining == null ? '' : remaining <= 0 ? 'Session expired — re-authorization required.' : `Session expires in ${formatCountdown(remaining)}`}
      </Typography>
      <Box sx={{ mt: 2 }}>
        <ProtectedRenderer
          lines={lines}
          profile={info?.profile || 'MEDIUM'}
          watermark={info?.watermark || null}
          sessionSeed={sessionSeedFrom(info?.watermark?.displayId, sessionId)}
          obscured={obscured}
        />
      </Box>
    </Box>
  );
}
