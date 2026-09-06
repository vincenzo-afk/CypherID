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

export default function AuditDashboardPage() {
  const [filters, setFilters] = useState({ did: '', resourceId: '', decision: '' });
  const [applied, setApplied] = useState({});
  const { data, refetch, isFetching } = useQuery({
    queryKey: ['audit', applied],
    queryFn: () => api.auditLogs({ ...applied, size: 50 }).catch(() => ({ events: [] }))
  });
  const rows = rowsOf(data);

  const download = async () => {
    try {
      const end = new Date().toISOString();
      const start = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const blob = await api.auditReport(start, end);
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cypherid-audit-report.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* backend unavailable */ }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Audit Dashboard</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <TextField size="small" label="DID" value={filters.did} onChange={(e) => setFilters({ ...filters, did: e.target.value })} />
        <TextField size="small" label="Resource" value={filters.resourceId} onChange={(e) => setFilters({ ...filters, resourceId: e.target.value })} />
        <TextField size="small" label="Decision" value={filters.decision} onChange={(e) => setFilters({ ...filters, decision: e.target.value })} />
        <Button variant="contained" onClick={() => { setApplied({ ...filters }); setTimeout(() => refetch(), 0); }}>Filter</Button>
        <Button variant="outlined" onClick={download}>PDF (7d)</Button>
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
    </Box>
  );
}
