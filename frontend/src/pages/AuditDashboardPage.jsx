import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { api } from '../services/api.js';
import BlockchainTxBadge from '../components/BlockchainTxBadge.jsx';

const rowsOf = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content; // Spring page
  if (Array.isArray(data?.events)) return data.events;
  return [];
};

const isoDaysAgo = (days) => new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);

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
    catch { setProvenance({ error: 'Provenance lookup failed.' }); }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Audit Dashboard</Typography>

      <Typography variant="h6">
        Live Event Stream {wsState === 'live' ? '(live)' : wsState === 'connecting' ? '(connecting…)' : '(polling fallback)'}
      </Typography>
      <Box sx={{ maxHeight: 200, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1, p: 1, mb: 2 }}>
        {live.length === 0 && <Typography variant="body2">No live events yet — stream opens when the audit service emits.</Typography>}
        {live.map((e, i) => (
          <Typography key={i} variant="body2" color={eventColor(e)} sx={{ fontFamily: 'monospace' }}>
            [{e.eventTime || e.timestamp || ''}] {e.eventType || e.type || ''} {e.did || ''} {e.resourceId || ''} {e.decision || e.severity || ''} {e.txHash || e.txId || ''}
          </Typography>
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <TextField size="small" label="DID" value={filters.did} onChange={(e) => setFilters({ ...filters, did: e.target.value })} />
        <TextField size="small" label="Resource" value={filters.resourceId} onChange={(e) => setFilters({ ...filters, resourceId: e.target.value })} />
        <TextField size="small" label="Decision" value={filters.decision} onChange={(e) => setFilters({ ...filters, decision: e.target.value })} />
        <Button variant="contained" onClick={() => { setApplied({ ...filters }); setTimeout(() => refetch(), 0); }}>Filter</Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
        <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <Button variant="outlined" onClick={download}>Export PDF</Button>
      </Box>
      {isFetching && <Typography variant="body2">Loading…</Typography>}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Time</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>DID</TableCell>
            <TableCell>Resource</TableCell>
            <TableCell>Decision</TableCell>
            <TableCell>Tx</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r.id || i}>
              <TableCell>{r.eventTime || r.timestamp || ''}</TableCell>
              <TableCell>{r.eventType || r.type || ''}</TableCell>
              <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.did || ''}</TableCell>
              <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.resourceId || r.resource || ''}</TableCell>
              <TableCell>{r.decision || ''}</TableCell>
              <TableCell><BlockchainTxBadge txHash={r.txHash || r.txId} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length === 0 && !isFetching && <Typography variant="body2" sx={{ mt: 1 }}>No audit events.</Typography>}

      <Typography variant="h6" sx={{ mt: 3 }}>Security Alerts ({secEvents.length})</Typography>
      {secEvents.length === 0
        ? <Typography variant="body2">No security alerts.</Typography>
        : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Event</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>DID</TableCell>
                <TableCell>Session</TableCell>
                <TableCell>Tx</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {secEvents.map((s, i) => (
                <TableRow key={s.id || i}>
                  <TableCell>{s.timestamp || s.createdAt || ''}</TableCell>
                  <TableCell>{s.eventType || s.type || ''}</TableCell>
                  <TableCell>{s.severity || ''}</TableCell>
                  <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.did || s.userDid || ''}</TableCell>
                  <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.sessionId || ''}</TableCell>
                  <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.txHash || s.txId || ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

      <Typography variant="h6" sx={{ mt: 3 }}>Asset Provenance</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <TextField size="small" label="Asset ID" value={provenanceId} onChange={(e) => setProvenanceId(e.target.value)} />
        <Button variant="outlined" onClick={lookupProvenance}>Lookup</Button>
      </Box>
      {provenance && <pre style={{ maxHeight: 240, overflow: 'auto' }}>{JSON.stringify(provenance, null, 2)}</pre>}
    </Box>
  );
}
