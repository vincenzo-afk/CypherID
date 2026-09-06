import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Box, Button, TextField, Typography } from '@mui/material';
import ProtectionStatus from '../components/ProtectionStatus.jsx';
import { startCaptureMonitoring } from '../monitoring/captureMonitor.js';
import { api } from '../services/api.js';

// Video viewer per docs/protection + docs/api/14_VIDEO_APIS.md.
// Recorded playback only (not live conferencing) per docs/06_NON_GOALS.md:
// chunks stream through the protected-content pipeline with session watermark.
export default function ProtectedVideoViewer() {
  const { sessionId: routeSessionId } = useParams();
  const location = useLocation();
  const [videoId, setVideoId] = useState(location.state?.videoId || '');
  const [videoInput, setVideoInput] = useState('');
  const [session, setSession] = useState(
    location.state?.sessionToken ? { sessionId: routeSessionId, sessionToken: location.state.sessionToken } : null
  );
  const [info, setInfo] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [msg, setMsg] = useState('');
  const [obscured, setObscured] = useState(false);

  const start = async () => {
    const id = videoInput || videoId;
    if (!id) { setMsg('Enter a video ID to start playback.'); return; }
    try {
      const res = await api.startVideo(id);
      setVideoId(id);
      setSession({ sessionId: res.sessionId, sessionToken: res.sessionToken });
      setChunks([]);
      setObscured(false);
      setMsg(`Playback session started (expires ${res.expiresAt || 'soon'}).`);
    } catch { setMsg('Could not start playback — access denied or service unavailable.'); }
  };

  useEffect(() => {
    if (!session?.sessionToken) return;
    api.sessionInfo(session.sessionToken).then(setInfo).catch(() => setObscured(true));
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const stop = startCaptureMonitoring(async (event) => {
      try { await api.logSecurityEvent(session.sessionId, event); } catch { /* offline */ }
      if (event.eventType === 'TAB_HIDDEN') setObscured(true);
    });
    return stop;
  }, [session]);

  useEffect(() => {
    if (!playing || !session || obscured) return;
    const total = info?.totalChunks || 8;
    let i = chunks.length;
    let cancelled = false;
    const timer = setInterval(async () => {
      if (i >= total) { clearInterval(timer); setPlaying(false); return; }
      try {
        const chunk = await api.fetchChunk(session.sessionToken, i);
        if (!cancelled) setChunks((prev) => [...prev, typeof chunk === 'string' ? chunk : JSON.stringify(chunk)]);
      } catch (e) {
        if (e?.response?.status === 403) { setObscured(true); clearInterval(timer); }
      }
      i += 1;
    }, 1500);
    return () => { cancelled = true; clearInterval(timer); };
  }, [playing, session, obscured, info]);

  if (!session) {
    return (
      <Box sx={{ position: 'fixed', inset: 0, bgcolor: '#000', color: '#fff', p: 3 }}>
        <Typography variant="h6">Protected Video</Typography>
        <ProtectionStatus state="AUTHORIZED" profile="MEDIUM" />
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <TextField size="small" label="Video ID" value={videoInput} onChange={(e) => setVideoInput(e.target.value)} sx={{ input: { color: '#fff' } }} />
          <Button variant="contained" onClick={start}>Start Playback</Button>
        </Box>
        {msg && <Typography sx={{ mt: 2 }}>{msg}</Typography>}
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'fixed', inset: 0, bgcolor: '#000', color: '#fff', p: 2, overflow: 'auto' }}>
      <Typography variant="h6">Protected Video — {videoId}</Typography>
      <ProtectionStatus state={obscured ? 'CONTENT_OBSCURED' : 'PROTECTED_VIEW'} profile={info?.profile || 'MEDIUM'} />
      <Typography variant="caption">
        Watermark: {info?.watermark ? JSON.stringify(info.watermark) : 'session-bound'} · OS-level recording cannot be prevented by a web app.
      </Typography>
      <Box sx={{ mt: 2 }}>
        {obscured
          ? <Typography>Playback obscured — suspicious activity detected.</Typography>
          : chunks.map((c, idx) => <Typography key={idx} variant="body2" sx={{ opacity: 0.85 }}>[segment {idx}] {String(c).slice(0, 200)}</Typography>)}
        {!chunks.length && !obscured && <Typography>Press Play to stream encrypted segments.</Typography>}
      </Box>
      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <Button variant="contained" disabled={playing || obscured} onClick={() => setPlaying(true)}>Play</Button>
        <Button variant="outlined" onClick={() => setPlaying(false)}>Pause</Button>
        <Button variant="outlined" color="error" onClick={async () => { try { await api.closeSession(session.sessionId); } catch { /* noop */ } setPlaying(false); setMsg('Session closed.'); }}>Close Session</Button>
      </Box>
      {msg && <Typography sx={{ mt: 2 }}>{msg}</Typography>}
    </Box>
  );
}
