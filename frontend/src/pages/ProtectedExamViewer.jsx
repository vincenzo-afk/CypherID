import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Box, Button, TextField, Typography } from '@mui/material';
import ProtectedRenderer from '../renderer/ProtectedRenderer.jsx';
import ProtectionStatus from '../components/ProtectionStatus.jsx';
import { startCaptureMonitoring } from '../monitoring/captureMonitor.js';
import { api } from '../services/api.js';

// Exam viewer per docs/protection/exams + docs/api/13_EXAM_APIS.md.
// HIGH profile: any focus loss obscures content immediately.
export default function ProtectedExamViewer() {
  const { sessionId: routeSessionId } = useParams();
  const location = useLocation();
  const [examId, setExamId] = useState(location.state?.examId || '');
  const [examInput, setExamInput] = useState('');
  const [session, setSession] = useState(
    location.state?.sessionToken ? { sessionId: routeSessionId, sessionToken: location.state.sessionToken } : null
  );
  const [question, setQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [msg, setMsg] = useState('');
  const [obscured, setObscured] = useState(false);
  const [ended, setEnded] = useState(false);

  const start = async () => {
    const id = examInput || examId;
    if (!id) { setMsg('Enter an exam ID to start.'); return; }
    try {
      const res = await api.startExam(id);
      setExamId(id);
      setSession({ sessionId: res.sessionId, sessionToken: res.sessionToken });
      setQuestionIndex(0);
      setEnded(false);
      setObscured(false);
      setMsg(`Exam session started (expires ${res.expiresAt || 'soon'}).`);
    } catch { setMsg('Could not start exam — access denied or service unavailable.'); }
  };

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const q = await api.examQuestion(session.sessionId, questionIndex);
        let body = '';
        try {
          const chunk = await api.fetchChunk(session.sessionToken, q.chunk ?? questionIndex);
          body = typeof chunk === 'string' ? chunk : JSON.stringify(chunk);
        } catch { body = '[Question content withheld: session obscured]'; setObscured(true); }
        setQuestion({ ...q, body });
      } catch { setMsg('Failed to load question.'); }
    })();
  }, [session, questionIndex]);

  useEffect(() => {
    if (!session) return;
    const stop = startCaptureMonitoring(async (event) => {
      try { await api.logSecurityEvent(session.sessionId, event); } catch { /* offline */ }
      // HIGH profile: obscure on any focus loss
      if (event.eventType === 'WINDOW_BLUR' || event.eventType === 'TAB_HIDDEN') setObscured(true);
    });
    return stop;
  }, [session]);

  const submit = async () => {
    if (!session) return;
    try {
      await api.submitAnswer({ sessionId: session.sessionId, questionIndex, answer });
      setMsg(`Answer for Q${questionIndex} recorded. Correct answers are never revealed.`);
      setAnswer('');
    } catch { setMsg('Answer submission failed.'); }
  };

  const end = async () => {
    if (!session) return;
    try {
      const res = await api.endExam(examId, { sessionId: session.sessionId });
      setEnded(true);
      setMsg(`Exam submitted. Answered: ${res.answeredCount ?? '?'}. Tx: ${res.txHash ?? 'n/a'}`);
    } catch { setMsg('Failed to end exam.'); }
  };

  if (!session) {
    return (
      <Box sx={{ position: 'fixed', inset: 0, bgcolor: '#fff', p: 3 }}>
        <Typography variant="h6">Protected Exam</Typography>
        <ProtectionStatus state="AUTHORIZED" profile="HIGH" />
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <TextField size="small" label="Exam ID" value={examInput} onChange={(e) => setExamInput(e.target.value)} />
          <Button variant="contained" onClick={start}>Start Exam</Button>
        </Box>
        {msg && <Typography sx={{ mt: 2 }}>{msg}</Typography>}
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'fixed', inset: 0, bgcolor: '#fff', p: 2, overflow: 'auto' }}>
      <Typography variant="h6">Protected Exam — {examId} (Q{questionIndex})</Typography>
      <ProtectionStatus state={ended ? 'EXPIRED' : obscured ? 'CONTENT_OBSCURED' : 'PROTECTED_VIEW'} profile="HIGH" />
      <Box sx={{ mt: 2 }}>
        <ProtectedRenderer
          lines={[question?.body || 'Loading question…']}
          profile="HIGH"
          watermark={null}
          sessionSeed={session.sessionId ? session.sessionId.length : 0}
          obscured={obscured || ended}
        />
      </Box>
      {!ended && !obscured && (
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <TextField size="small" fullWidth label="Your answer" value={answer} onChange={(e) => setAnswer(e.target.value)} />
          <Button variant="contained" onClick={submit}>Submit</Button>
          <Button variant="outlined" onClick={() => setQuestionIndex((i) => i + 1)}>Next</Button>
          <Button variant="outlined" color="error" onClick={end}>End Exam</Button>
        </Box>
      )}
      {msg && <Typography sx={{ mt: 2 }}>{msg}</Typography>}
    </Box>
  );
}
