import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, MenuItem, Skeleton, TextField, Typography
} from '@mui/material';
import { api } from '../services/api.js';
import { Kicker, SectionLabel, Mono, VAULT_COLORS as C } from '../components/files/FileVisuals.jsx';

const rowsOf = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content; // Spring page
  if (Array.isArray(data?.events)) return data.events;
  return [];
};

const isoDaysAgo = (days) => new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);

// Friendly names for the recorded event types.
const EVENT_LABELS = {
  ASSET_CREATE: 'FILE ADDED',
  ASSET_EVENT: 'FILE EVENT',
  ASSET_TRANSFER: 'FILE PASSED ON',
  ASSET_BURN: 'FILE DESTROYED',
  ACCESS_REQUEST: 'ACCESS ASKED FOR',
  ACCESS_GRANTED: 'ACCESS ALLOWED',
  ACCESS_DENIED: 'ACCESS REFUSED',
  DID_CREATE: 'NEW ID CREATED',
  PROTECTION_EVENT: 'PROTECTION EVENT',
  VC_ISSUE: 'CERTIFICATE ISSUED',
  LOGIN: 'SIGNED IN',
  LOGOUT: 'SIGNED OUT'
};
const eventLabel = (t) => (EVENT_LABELS[t] || (t || 'EVENT').toString().toUpperCase());

const fmtWhen = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const SEVERITY_COLOR = { LOW: C.dim, MEDIUM: C.amber, HIGH: C.red, CRITICAL: C.red };

export default function AuditDashboardPage() {
  const [filters, setFilters] = useState({ did: '', resourceId: '', decision: '' });
  const [applied, setApplied] = useState({});
  const [startDate, setStartDate] = useState(isoDaysAgo(7));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [provenanceId, setProvenanceId] = useState('');
  const [provenance, setProvenance] = useState(null);

  const { data, refetch, isFetching, isError } = useQuery({
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
    catch { setProvenance({ error: 'We could not find the history for that file.' }); }
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: 'rgba(5,7,13,0.6)', fontSize: '0.8rem',
      '& fieldset': { borderColor: C.line }, '&:hover fieldset': { borderColor: `${C.cyan}66` }
    }
  };

  return (
    <Box sx={{ color: C.text, maxWidth: 1180, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 3, md: 5 } }}>

      {/* header */}
      <Kicker>ACTIVITY</Kicker>
      <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.01em', maxWidth: 720 }}>
        The full story of what happened — who opened, shared or destroyed a file,
        and anything the system flagged as unusual.
      </Typography>
      <Typography sx={{ color: C.dim, fontSize: '0.82rem', mt: 1, maxWidth: 680 }}>
        This record cannot be edited by anyone, and you can download it as a report.
      </Typography>

      {/* search the record */}
      <Box sx={{ mt: 4, border: `1px solid ${C.line}`, borderRadius: '4px', p: { xs: 2, md: 2.5 }, bgcolor: C.panel }}>
        <SectionLabel sx={{ display: 'block', mb: 1.5 }}>SEARCH THE RECORD</SectionLabel>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField size="small" label="Person (digital ID)" value={filters.did}
            onChange={(e) => setFilters({ ...filters, did: e.target.value })} sx={{ ...inputSx, minWidth: 220 }} />
          <TextField size="small" label="File ID" value={filters.resourceId}
            onChange={(e) => setFilters({ ...filters, resourceId: e.target.value })} sx={{ ...inputSx, minWidth: 180 }} />
          <TextField size="small" select label="Was it allowed?" value={filters.decision}
            onChange={(e) => setFilters({ ...filters, decision: e.target.value })} sx={{ ...inputSx, minWidth: 150 }}>
            <MenuItem value="">Any</MenuItem>
            <MenuItem value="GRANTED">Allowed</MenuItem>
            <MenuItem value="DENIED">Refused</MenuItem>
          </TextField>
          <Button
            variant="contained"
            onClick={() => { setApplied({ ...filters }); setTimeout(() => refetch(), 0); }}
            sx={{ bgcolor: C.cyan, color: '#04121F', fontWeight: 700, letterSpacing: '0.06em', '&:hover': { bgcolor: '#5CB8FF' } }}
          >
            SEARCH
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mt: 2 }}>
          <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }}
            value={startDate} onChange={(e) => setStartDate(e.target.value)} sx={inputSx} />
          <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }}
            value={endDate} onChange={(e) => setEndDate(e.target.value)} sx={inputSx} />
          <Button onClick={download} sx={{ color: C.cyan, border: `1px solid ${C.cyan}55`, letterSpacing: '0.06em' }}>
            DOWNLOAD REPORT (PDF)
          </Button>
        </Box>
      </Box>

      {/* events */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mt: 4.5, mb: 2 }}>
        <SectionLabel>WHAT HAPPENED</SectionLabel>
        <Typography sx={{ fontFamily: C.mono, fontSize: '1.1rem', fontWeight: 700, color: C.cyan }}>
          {isFetching ? '…' : rows.length}
        </Typography>
        {isError && <Typography sx={{ color: C.dim, fontSize: '0.72rem' }}>· unable to reach the audit log — showing what loaded</Typography>}
      </Box>

      {isFetching && (
        <Box>{[0, 1, 2].map((i) => <Skeleton key={i} height={44} sx={{ bgcolor: 'rgba(56,166,255,0.08)', mb: 1 }} />)}</Box>
      )}

      {!isFetching && rows.length === 0 && (
        <Typography sx={{ color: C.dim, fontSize: '0.84rem', py: 3 }}>
          Nothing recorded for this search yet.
        </Typography>
      )}

      {!isFetching && rows.map((r, i) => {
        const denied = r.decision === 'DENIED';
        const granted = r.decision === 'GRANTED';
        return (
          <Box key={r.id || i} sx={{
            display: 'flex', gap: 2, alignItems: 'center', px: { xs: 1.5, md: 2.5 }, py: 1.5,
            border: `1px solid ${C.line}`, borderRadius: '3px', mb: 1,
            bgcolor: i % 2 ? 'rgba(10,15,26,0.5)' : 'transparent',
            flexWrap: 'wrap'
          }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, bgcolor: granted ? C.green : denied ? C.red : C.cyan }} />
            <Box sx={{ width: 190 }}>
              <Typography sx={{ fontFamily: C.mono, fontSize: '0.72rem', color: C.dim }}>{fmtWhen(r.eventTime || r.timestamp)}</Typography>
            </Box>
            <Box sx={{ width: 170 }}>
              <Typography sx={{ fontFamily: C.mono, fontSize: '0.68rem', letterSpacing: '0.1em', color: C.text }}>
                {eventLabel(r.eventType || r.type)}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 130, overflow: 'hidden' }}>
              <Mono sx={{ fontSize: '0.7rem', color: C.dim }}>{r.did || '—'}</Mono>
            </Box>
            <Box sx={{ flex: 1, minWidth: 130, overflow: 'hidden' }}>
              <Mono sx={{ fontSize: '0.7rem', color: C.dim }}>{r.resourceId || r.resource || '—'}</Mono>
            </Box>
            {r.decision ? (
              <Typography component="span" sx={{
                fontFamily: C.mono, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em',
                color: granted ? C.green : C.red,
                border: `1px solid ${granted ? `${C.green}55` : 'rgba(248,113,113,0.4)'}`,
                px: 1, py: '2px', borderRadius: '2px'
              }}>
                {granted ? 'ALLOWED' : 'REFUSED'}
              </Typography>
            ) : <Box sx={{ width: 70 }} />}
          </Box>
        );
      })}

      {/* flagged */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mt: 5, mb: 1 }}>
        <SectionLabel>THINGS THE SYSTEM FLAGGED</SectionLabel>
        <Typography sx={{ fontFamily: C.mono, fontSize: '1.1rem', fontWeight: 700, color: secEvents.length ? C.amber : C.green }}>
          {secQuery.isLoading ? '…' : secEvents.length}
        </Typography>
      </Box>
      <Typography sx={{ color: C.dim, fontSize: '0.8rem', mb: 2, maxWidth: 640 }}>
        Unusual behaviour during protected viewing — for example, something that looked
        like an attempt to photograph or record the screen.
      </Typography>

      {secQuery.isLoading && <Skeleton height={44} sx={{ bgcolor: 'rgba(56,166,255,0.08)' }} />}
      {!secQuery.isLoading && secEvents.length === 0 && (
        <Typography sx={{ color: C.green, fontFamily: C.mono, fontSize: '0.78rem', py: 2 }}>
          ✓ NOTHING FLAGGED — no unusual viewing behaviour was recorded.
        </Typography>
      )}
      {!secQuery.isLoading && secEvents.map((s, i) => (
        <Box key={s.id || i} sx={{
          display: 'flex', gap: 2, alignItems: 'center', px: { xs: 1.5, md: 2.5 }, py: 1.4,
          border: '1px solid rgba(251,191,36,0.3)', borderRadius: '3px', mb: 1, bgcolor: 'rgba(251,191,36,0.04)',
          flexWrap: 'wrap'
        }}>
          <Typography sx={{ fontFamily: C.mono, fontSize: '0.7rem', color: C.dim, width: 190 }}>
            {fmtWhen(s.timestamp || s.createdAt)}
          </Typography>
          <Typography sx={{ fontFamily: C.mono, fontSize: '0.68rem', letterSpacing: '0.1em', color: C.amber, flex: 1, minWidth: 140 }}>
            {eventLabel(s.eventType || s.type)}
          </Typography>
          <Typography sx={{
            fontFamily: C.mono, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em',
            color: SEVERITY_COLOR[s.severity] || C.dim,
            border: `1px solid ${(SEVERITY_COLOR[s.severity] || C.dim)}55`, px: 1, py: '2px', borderRadius: '2px'
          }}>
            {(s.severity || 'INFO').toUpperCase()}
          </Typography>
          <Mono sx={{ fontSize: '0.66rem', color: C.dim, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {s.sessionId || ''}
          </Mono>
        </Box>
      ))}

      {/* provenance lookup */}
      <Box sx={{ mt: 5, border: `1px solid ${C.line}`, borderRadius: '4px', p: { xs: 2, md: 2.5 }, bgcolor: C.panel }}>
        <SectionLabel sx={{ display: 'block', mb: 0.8 }}>HISTORY OF A FILE</SectionLabel>
        <Typography sx={{ color: C.dim, fontSize: '0.8rem', mb: 2 }}>
          See everywhere a file has been: who added it, who it was passed to, and when it was destroyed.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField size="small" label="File ID" placeholder="ASSET-…" value={provenanceId}
            onChange={(e) => setProvenanceId(e.target.value)}
            sx={{ ...inputSx, minWidth: 280, '& .MuiOutlinedInput-root': { ...inputSx['& .MuiOutlinedInput-root'], fontFamily: C.mono } }} />
          <Button onClick={lookupProvenance} sx={{ color: C.cyan, border: `1px solid ${C.cyan}55`, letterSpacing: '0.06em' }}>
            SHOW HISTORY
          </Button>
        </Box>
        {provenance?.error && (
          <Typography role="alert" sx={{ color: C.red, fontFamily: C.mono, fontSize: '0.74rem', mt: 1.5 }}>
            ✕ {provenance.error}
          </Typography>
        )}
        {provenance && !provenance.error && (
          <Box sx={{ mt: 2 }}>
            <pre style={{
              margin: 0, maxHeight: 260, overflow: 'auto', padding: 14,
              border: `1px solid ${C.line}`, borderRadius: 4,
              background: 'rgba(5,7,13,0.7)', color: '#9FB4D8',
              fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 11
            }}>
              {JSON.stringify(provenance, null, 2)}
            </pre>
          </Box>
        )}
      </Box>
    </Box>
  );
}
