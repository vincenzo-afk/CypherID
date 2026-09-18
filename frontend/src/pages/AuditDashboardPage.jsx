import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, CircularProgress, Paper,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import { api } from '../services/api.js';
import BlockchainTxBadge from '../components/BlockchainTxBadge.jsx';

const rowsOf = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content; // Spring page
  if (Array.isArray(data?.events)) return data.events;
  return [];
};

const isoDaysAgo = (days) => new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);

// Friendly names for the recorded event types.
const EVENT_LABELS = {
  ASSET_CREATE: 'File added',
  ASSET_TRANSFER: 'File passed on',
  ASSET_BURN: 'File destroyed',
  ACCESS_REQUEST: 'Access asked for',
  ACCESS_GRANTED: 'Access allowed',
  ACCESS_DENIED: 'Access refused',
  DID_CREATE: 'New ID created',
  VC_ISSUE: 'Certificate issued',
  LOGIN: 'Signed in',
  LOGOUT: 'Signed out'
};
const eventLabel = (t) => EVENT_LABELS[t] || t || '';

const SEVERITY_COLOR = { LOW: 'default', MEDIUM: 'warning', HIGH: 'error', CRITICAL: 'error' };

export default function AuditDashboardPage() {
  const [filters, setFilters] = useState({ did: '', resourceId: '', decision: '' });
  const [applied, setApplied] = useState({});
  const [startDate, setStartDate] = useState(isoDaysAgo(7));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [provenanceId, setProvenanceId] = useState('');
  const [provenance, setProvenance] = useState(null);

  // Live event stream over the gateway-proxied audit WebSocket, with the
  // 30s security-events polling below as fallback when WS is unreachable.
  const [live, setLive] = useState([]);
  const [wsState, setWsState] = useState('connecting');
  useEffect(() => {
    const token = localStorage.getItem('cypherid_access_token');
    if (!token) { setWsState('polling'); return; }
    const base = (import.meta.env.VITE_API_URL || window.location.origin).replace(/^http/, 'ws');
    let ws;
    try {
      ws = new WebSocket(`${base}/ws/audit?access_token=${encodeURIComponent(token)}`);
    } catch { setWsState('polling'); return; }
    ws.onopen = () => setWsState('live');
    ws.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data);
        setLive((prev) => [evt, ...prev].slice(0, 50));
      } catch { /* ignore malformed frames */ }
    };
    ws.onerror = () => setWsState('polling');
    ws.onclose = () => setWsState((s) => (s === 'live' ? 'polling' : s));
    return () => { try { ws.close(); } catch { /* noop */ } };
  }, []);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ['audit', applied],
    queryFn: () => api.auditLogs({ ...applied, size: 50 }).catch(() => ({ events: [] }))
  });
  const rows = rowsOf(data);

  const secQuery = useQuery({
    queryKey: ['audit-sec-events'],
    queryFn: () => api.securityEvents().catch(() => []),
    refetchInterval: wsState === 'live' ? false : 30000
  });
  const secEvents = rowsOf(secQuery.data);

  const eventColor = (e) => {
    if (e.decision === 'GRANTED' || e.severity === 'LOW') return 'success.main';
    if (e.decision === 'DENIED' || e.severity === 'HIGH' || e.severity === 'CRITICAL') return 'error.main';
    return 'warning.main';
  };

  const download = async () => {
    try {
      const blob = await api.auditReport(
        new Date(startDate).toISOString(),
        new Date(endDate).toISOString()
      );
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `cypherid-audit-report-${startDate}-to-${endDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* backend unavailable */ }
  };

  const lookupProvenance = async () => {
    if (!provenanceId.trim()) return;
    try { setProvenance(await api.assetHistory(provenanceId.trim())); }
    catch { setProvenance({ error: 'We could not find the history for that file.' }); }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Activity</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        The full story of what happened: who opened, shared or destroyed a file, and
        anything the system flagged as unusual. This record cannot be edited by
        anyone, and you can download it as a report.
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Search the record</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <TextField size="small" label="Person (digital ID)" value={filters.did} onChange={(e) => setFilters({ ...filters, did: e.target.value })} />
          <TextField size="small" label="File ID" value={filters.resourceId} onChange={(e) => setFilters({ ...filters, resourceId: e.target.value })} />
          <TextField
            size="small"
            label="Was it allowed?"
            placeholder="GRANTED or DENIED"
            value={filters.decision}
            onChange={(e) => setFilters({ ...filters, decision: e.target.value })}
          />
          <Button variant="contained" onClick={() => { setApplied({ ...filters }); setTimeout(() => refetch(), 0); }}>Search</Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mt: 2 }}>
          <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <Button variant="outlined" onClick={download}>Download report (PDF)</Button>
        </Box>
      </Paper>

      <Typography variant="h6" gutterBottom>What happened ({rows.length})</Typography>
      {isFetching && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">Loading…</Typography>
        </Box>
      )}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>When</TableCell>
            <TableCell>What happened</TableCell>
            <TableCell>Person</TableCell>
            <TableCell>File</TableCell>
            <TableCell>Allowed?</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r.id || i}>
              <TableCell>{r.eventTime || r.timestamp || ''}</TableCell>
              <TableCell>{eventLabel(r.eventType || r.type)}</TableCell>
              <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.did || ''}</TableCell>
              <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.resourceId || r.resource || ''}</TableCell>
              <TableCell>
                {r.decision
                  ? <Chip size="small" label={r.decision === 'GRANTED' ? 'Allowed' : 'Refused'} color={r.decision === 'GRANTED' ? 'success' : 'error'} />
                  : ''}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length === 0 && !isFetching && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">Nothing recorded for this search yet.</Typography>
        </Paper>
      )}

      <Typography variant="h6" sx={{ mt: 3 }}>Things the system flagged ({secEvents.length})</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Unusual behaviour during protected viewing — for example, something that
        looked like an attempt to photograph or record the screen.
      </Typography>
      {secEvents.length === 0
        ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">Nothing flagged. That is good news.</Typography>
          </Paper>
        )
        : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>When</TableCell>
                <TableCell>What was seen</TableCell>
                <TableCell>How serious</TableCell>
                <TableCell>Session</TableCell>
                <TableCell>Tx</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {secEvents.map((s, i) => (
                <TableRow key={s.id || i}>
                  <TableCell>{s.timestamp || s.createdAt || ''}</TableCell>
                  <TableCell>{eventLabel(s.eventType || s.type)}</TableCell>
                  <TableCell>
                    {s.severity
                      ? <Chip size="small" label={s.severity} color={SEVERITY_COLOR[s.severity] || 'default'} />
                      : ''}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.sessionId || ''}</TableCell>
                  <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.txHash || s.txId || ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

      <Typography variant="h6" sx={{ mt: 3 }}>History of a file</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        See everywhere a file has been: who added it, who it was passed to, and when
        it was destroyed.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <TextField size="small" label="File ID" placeholder="ASSET-…" value={provenanceId} onChange={(e) => setProvenanceId(e.target.value)} />
        <Button variant="outlined" onClick={lookupProvenance}>Show history</Button>
      </Box>
      {provenance?.error && <Alert severity="error">{provenance.error}</Alert>}
      {provenance && !provenance.error && (
        <Accordion elevation={0} sx={{ border: '1px solid #e5e7eb', boxShadow: 'none' }}>
          <AccordionSummary>
            <Typography variant="body2">Technical details</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <pre style={{ margin: 0, maxHeight: 240, overflow: 'auto' }}>{JSON.stringify(provenance, null, 2)}</pre>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
}
