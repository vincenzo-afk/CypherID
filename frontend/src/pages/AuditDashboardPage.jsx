import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { api } from '../services/api.js';

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

  const { data, refetch, isFetching } = useQuery({
    queryKey: ['audit', applied],
    queryFn: () => api.auditLogs({ ...applied, size: 50 }).catch(() => ({ events: [] }))
  });
  const rows = rowsOf(data);

  const secQuery = useQuery({
    queryKey: ['audit-sec-events'],
    queryFn: () => api.securityEvents().catch(() => []),
    refetchInterval: 30000
  });
  const secEvents = rowsOf(secQuery.data);

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
              <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.txHash || r.txId || ''}</TableCell>
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
                <TableCell>Session</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {secEvents.map((s, i) => (
                <TableRow key={s.id || i}>
                  <TableCell>{s.timestamp || s.createdAt || ''}</TableCell>
                  <TableCell>{s.eventType || s.type || ''}</TableCell>
                  <TableCell>{s.severity || ''}</TableCell>
                  <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.sessionId || ''}</TableCell>
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
