import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, MenuItem, Skeleton, TextField, Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Kicker, SectionLabel, Mono, VAULT_COLORS as C } from '../components/files/FileVisuals.jsx';
import AccessGraph from '../components/access/AccessGraph.jsx';
import GrantAccessModal from '../components/access/GrantAccessModal.jsx';
import RevokeAccessModal from '../components/access/RevokeAccessModal.jsx';
import AccessDetailPanel from '../components/access/AccessDetailPanel.jsx';

const REDUCED = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

const DAY = 24 * 3600 * 1000;
const fmt = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};
const listOf = (d) => (Array.isArray(d) ? d : []);

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'EXPIRING', 'REVOKED'];
const SORTS = { newest: 'NEWEST', oldest: 'OLDEST', expiring: 'EXPIRING SOON' };

export default function AccessCenterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const did = user?.did || '';

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');
  const [direction, setDirection] = useState('outgoing');
  const [grantOpen, setGrantOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [notice, setNotice] = useState(null);

  const outgoingQuery = useQuery({
    queryKey: ['delegations', 'outgoing'],
    queryFn: () => api.listDelegations('outgoing'),
    enabled: Boolean(did),
    retry: false
  });
  const incomingQuery = useQuery({
    queryKey: ['delegations', 'incoming'],
    queryFn: () => api.listDelegations('incoming'),
    enabled: Boolean(did),
    retry: false
  });
  const securityQuery = useQuery({
    queryKey: ['security-events-acl'],
    queryFn: () => api.securityEvents().catch(() => []),
    retry: false
  });

  const outgoing = useMemo(() => listOf(outgoingQuery.data), [outgoingQuery.data]);
  const incoming = useMemo(() => listOf(incomingQuery.data), [incomingQuery.data]);
  const secEvents = useMemo(() => {
    const d = securityQuery.data;
    return Array.isArray(d) ? d : (Array.isArray(d?.events) ? d.events : []);
  }, [securityQuery.data]);

  const stats = useMemo(() => {
    const now = Date.now();
    const active = outgoing.filter((g) => g.active && new Date(g.expiresAt).getTime() > now);
    const expiring = active.filter((g) => new Date(g.expiresAt).getTime() - now < 7 * DAY);
    const revoked = outgoing.filter((g) => !g.active);
    return { active: active.length, expiring: expiring.length, revoked: revoked.length };
  }, [outgoing]);

  const visible = useMemo(() => {
    const now = Date.now();
    let rows = direction === 'incoming' ? incoming : outgoing;
    rows = rows.filter((g) => {
      if (statusFilter === 'ACTIVE') return g.active && new Date(g.expiresAt).getTime() > now;
      if (statusFilter === 'EXPIRING') return g.active && new Date(g.expiresAt).getTime() > now && new Date(g.expiresAt).getTime() - now < 7 * DAY;
      if (statusFilter === 'REVOKED') return !g.active;
      return true;
    });
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((g) =>
      (g.toDID || '').toLowerCase().includes(q)
      || (g.fromDID || '').toLowerCase().includes(q)
      || (g.resourceId || '').toLowerCase().includes(q));
    rows = [...rows].sort((a, b) => {
      if (sort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sort === 'expiring') return new Date(a.expiresAt) - new Date(b.expiresAt);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    return rows;
  }, [direction, outgoing, incoming, statusFilter, search, sort]);

  const doRevoke = async (g) => {
    await api.revokeDelegate({ toDID: g.toDID, resourceId: g.resourceId });
    outgoingQuery.refetch();
    incomingQuery.refetch();
    setSelected(null);
    setRevokeTarget(null);
    setNotice({ ok: true, text: 'ACCESS REVOKED ✓ — the grant no longer applies.' });
  };

  const doExtend = async (g) => {
    const expiresAt = new Date(Date.now() + 7 * DAY).toISOString();
    try {
      await api.delegateAccess({ toDID: g.toDID, resourceId: g.resourceId, action: g.action, expiresAt });
      outgoingQuery.refetch();
      setSelected(null);
      setNotice({ ok: true, text: `EXTENDED — ${g.toDID} now holds this grant for 7 more days.` });
    } catch (e) {
      setNotice({ ok: false, text: e?.response?.data?.message || 'Extension failed.' });
    }
  };

  const openIncoming = async (g) => {
    try {
      const session = await api.issueProtectedSession(g.resourceId);
      if (session.sessionId) {
        navigate(`/protected/document/${session.sessionId}`, { state: { sessionToken: session.sessionToken } });
      } else {
        setNotice({ ok: false, text: 'The backend returned no viewing session.' });
      }
    } catch (e) {
      setNotice({ ok: false, text: e?.response?.data?.message || 'Opening this file was denied.' });
    }
  };

  const loading = outgoingQuery.isLoading;
  const failed = Boolean(outgoingQuery.error);

  const GrantRow = ({ g }) => {
    const now = Date.now();
    const active = g.active && new Date(g.expiresAt).getTime() > now;
    const expiring = active && new Date(g.expiresAt).getTime() - now < 7 * DAY;
    const peer = direction === 'incoming' ? g.fromDID : g.toDID;
    return (
      <Box
        onClick={() => setSelected(g)}
        role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') setSelected(g); }}
        aria-label={`Access details for ${peer}`}
        sx={{
          display: 'flex', alignItems: 'center', gap: 2, px: { xs: 1.5, md: 2.5 }, py: 1.8,
          border: `1px solid ${C.line}`, borderRadius: '3px', mb: 1.2, cursor: 'pointer', outline: 'none',
          bgcolor: 'rgba(10,15,26,0.5)', flexWrap: 'wrap',
          '&:hover, &:focus-visible': { bgcolor: 'rgba(56,166,255,0.06)', borderColor: `${C.cyan}55` }
        }}
      >
        <Box sx={{ flex: '1 1 240px', minWidth: 0 }}>
          <Mono>{peer}</Mono>
          <Typography sx={{ color: C.dim, fontSize: '0.7rem', mt: 0.4, fontFamily: C.mono }}>
            {g.resourceId}
          </Typography>
        </Box>
        <Box sx={{ width: 110 }}>
          <Typography sx={{ fontFamily: C.mono, fontSize: '0.66rem', letterSpacing: '0.12em', color: g.action === 'WRITE' ? C.violet : C.cyan }}>
            {g.action === 'WRITE' ? 'READ + WRITE' : 'READ'}
          </Typography>
        </Box>
        <Box sx={{ width: 100, display: { xs: 'none', md: 'block' } }}>
          <Typography sx={{ color: C.dim, fontSize: '0.72rem' }}>{fmt(g.createdAt)}</Typography>
        </Box>
        <Box sx={{ width: 130 }}>
          <Typography sx={{ color: expiring ? C.amber : C.dim, fontSize: '0.72rem' }}>
            {active ? `Expires ${fmt(g.expiresAt)}` : g.active ? 'Expired' : 'Revoked'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 90 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: active ? (expiring ? C.amber : C.green) : C.dim }} />
          <Typography sx={{ fontFamily: C.mono, fontSize: '0.64rem', letterSpacing: '0.12em', color: active ? (expiring ? C.amber : C.green) : C.dim }}>
            {active ? (expiring ? 'EXPIRING' : 'ACTIVE') : g.active ? 'EXPIRED' : 'REVOKED'}
          </Typography>
        </Box>
        {active && direction === 'outgoing' && (
          <Button
            size="small"
            onClick={(e) => { e.stopPropagation(); setRevokeTarget(g); }}
            sx={{ color: C.red, border: '1px solid rgba(248,113,113,0.4)', fontFamily: C.mono, fontSize: '0.6rem', letterSpacing: '0.12em', minWidth: 0, px: 1.2 }}
          >
            REVOKE
          </Button>
        )}
        {active && direction === 'incoming' && (
          <Button
            size="small"
            onClick={(e) => { e.stopPropagation(); openIncoming(g); }}
            sx={{ color: C.cyan, border: `1px solid ${C.cyan}55`, fontFamily: C.mono, fontSize: '0.6rem', letterSpacing: '0.12em', minWidth: 0, px: 1.2 }}
          >
            OPEN FILE
          </Button>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ color: C.text, maxWidth: 1180, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 3, md: 5 } }}>

      {/* header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Kicker>ACCESS CONTROL</Kicker>
          <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
            Decide who can access your identity and files.
          </Typography>
        </Box>
        <Button
          variant="contained" onClick={() => setGrantOpen(true)}
          sx={{ bgcolor: C.cyan, color: '#04121F', fontWeight: 700, letterSpacing: '0.06em', '&:hover': { bgcolor: '#5CB8FF' } }}
        >
          + GRANT ACCESS
        </Button>
      </Box>

      {/* overview */}
      <Box sx={{ display: 'flex', gap: { xs: 2.5, md: 5 }, mt: 3, flexWrap: 'wrap' }}>
        {[
          ['ACTIVE GRANTS', loading ? null : stats.active],
          ['EXPIRING SOON', loading ? null : stats.expiring],
          ['REVOKED', loading ? null : stats.revoked],
          ['RECENT SECURITY EVENTS', securityQuery.isLoading ? null : secEvents.length]
        ].map(([label, v]) => (
          <Box key={label}>
            <SectionLabel>{label}</SectionLabel>
            {v == null
              ? <Skeleton width={42} sx={{ bgcolor: 'rgba(56,166,255,0.12)' }} />
              : <Typography sx={{ fontFamily: C.mono, fontSize: '1.5rem', fontWeight: 700 }}>{v}</Typography>}
          </Box>
        ))}
      </Box>

      {/* graph */}
      <Box sx={{ mt: 4 }}>
        <AccessGraph did={did} grants={outgoing} onSelect={setSelected} reducedMotion={REDUCED} />
      </Box>

      {/* notice */}
      {notice && (
        <Typography role="status" sx={{
          mt: 2.5, fontFamily: C.mono, fontSize: '0.74rem', letterSpacing: '0.06em',
          color: notice.ok ? C.green : C.red
        }}>
          {notice.text}
        </Typography>
      )}

      {/* filters */}
      <Box sx={{ display: 'flex', gap: 1.5, mt: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small" placeholder="Search identities or files…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          sx={{
            minWidth: 230, '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(5,7,13,0.6)', fontFamily: C.mono, fontSize: '0.8rem',
              '& fieldset': { borderColor: C.line }, '&:hover fieldset': { borderColor: `${C.cyan}66` }
            }
          }}
        />
        {STATUS_FILTERS.map((f) => (
          <Button key={f} onClick={() => setStatusFilter(f)}
            sx={{
              minWidth: 0, px: 1.6, py: 0.5, fontFamily: C.mono, fontSize: '0.64rem', letterSpacing: '0.14em',
              color: statusFilter === f ? '#04121F' : C.dim, bgcolor: statusFilter === f ? C.cyan : 'transparent',
              border: `1px solid ${statusFilter === f ? C.cyan : C.line}`, borderRadius: '2px',
              '&:hover': { bgcolor: statusFilter === f ? '#5CB8FF' : 'rgba(56,166,255,0.06)' }
            }}>
            {f}
          </Button>
        ))}
        <Box sx={{ flex: 1 }} />
        <TextField
          select size="small" value={direction} onChange={(e) => setDirection(e.target.value)}
          sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { fontFamily: C.mono, fontSize: '0.7rem', '& fieldset': { borderColor: C.line } } }}
        >
          <MenuItem value="outgoing">I'VE GRANTED</MenuItem>
          <MenuItem value="incoming">GRANTED TO ME</MenuItem>
        </TextField>
        <TextField
          select size="small" value={sort} onChange={(e) => setSort(e.target.value)}
          sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { fontFamily: C.mono, fontSize: '0.7rem', '& fieldset': { borderColor: C.line } } }}
        >
          {Object.entries(SORTS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
        </TextField>
      </Box>

      {/* failed */}
      {failed && (
        <Box sx={{ mt: 3, border: `1px solid ${C.line}`, borderRadius: '4px', p: 2.5 }}>
          <Typography sx={{ color: C.dim, fontSize: '0.82rem' }}>Unable to load access information.</Typography>
          <Button onClick={() => outgoingQuery.refetch()} sx={{ mt: 1.5, color: C.cyan, border: `1px solid ${C.cyan}55`, letterSpacing: '0.06em' }}>
            RETRY
          </Button>
        </Box>
      )}

      {/* skeletons */}
      {loading && <Box sx={{ mt: 3 }}>{[0, 1].map((i) => <Skeleton key={i} height={56} sx={{ bgcolor: 'rgba(56,166,255,0.08)', mb: 1.2 }} />)}</Box>}

      {/* list */}
      {!loading && !failed && (
        <Box sx={{ mt: 3 }}>
          <SectionLabel sx={{ display: 'block', mb: 1.5 }}>
            {direction === 'outgoing' ? "ACCESS I'VE GRANTED" : 'ACCESS GRANTED TO ME'}
          </SectionLabel>
          {visible.length === 0 ? (
            <Typography sx={{ color: C.dim, fontSize: '0.84rem', py: 3 }}>
              {direction === 'outgoing'
                ? 'NO ACTIVE ACCESS — you have not granted anyone access yet. Use + GRANT ACCESS to share a file.'
                : 'Nothing has been granted to you yet.'}
            </Typography>
          ) : visible.map((g, i) => <GrantRow key={i} g={g} />)}
        </Box>
      )}

      {/* default policy — true statements only */}
      <Box sx={{ mt: 5, border: `1px solid ${C.line}`, borderRadius: '4px', p: 2.5, bgcolor: C.panel }}>
        <SectionLabel sx={{ display: 'block', mb: 1.5 }}>DEFAULT ACCESS POLICY</SectionLabel>
        <Box sx={{ display: 'flex', gap: { xs: 2.5, md: 5 }, flexWrap: 'wrap' }}>
          {[
            ['NEW FILES', 'PRIVATE BY DEFAULT'],
            ['DEFAULT SHARING', 'NO ACCESS'],
            ['DEFAULT EXPIRATION', '30 DAYS (THIS CONSOLE)']
          ].map(([k, v]) => (
            <Box key={k}>
              <SectionLabel sx={{ display: 'block', mb: 0.4 }}>{k}</SectionLabel>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: C.green }} />
                <Typography sx={{ fontFamily: C.mono, fontSize: '0.74rem', letterSpacing: '0.1em', color: C.text }}>{v}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* panels */}
      <GrantAccessModal
        open={grantOpen} onClose={() => setGrantOpen(false)}
        onGranted={() => { outgoingQuery.refetch(); setGrantOpen(false); setNotice({ ok: true, text: 'ACCESS GRANTED ✓ — visible in your grants below.' }); }}
      />
      <RevokeAccessModal
        open={Boolean(revokeTarget)} onClose={() => setRevokeTarget(null)}
        grant={revokeTarget} onRevoked={doRevoke}
      />
      <AccessDetailPanel
        open={Boolean(selected)} onClose={() => setSelected(null)}
        grant={selected} direction={direction}
        onRevoke={() => setRevokeTarget(selected)}
        onExtend={() => doExtend(selected)}
      />
    </Box>
  );
}
