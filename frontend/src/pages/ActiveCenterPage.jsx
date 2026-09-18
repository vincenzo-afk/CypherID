import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, MenuItem, Skeleton, TextField, Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Kicker, SectionLabel, VAULT_COLORS as C } from '../components/files/FileVisuals.jsx';
import { Panel, StatusChip, DetailRow, EventLine, timeAgo, fmtDate, shortDid, MONO } from '../components/active/ActiveVisuals.jsx';
import LiveConnectionGraph from '../components/active/LiveConnectionGraph.jsx';

// ACTIVE — live control center for everything currently connected to your
// identity. Every number, session, grant and event comes from the backend.
// Honest limitations, stated in the UI rather than papered over:
//   • Session console shows the REAL current session (this browser, derived
//     from the live access token) and previously-reported sessions derived
//     from audit history — labeled 'LAST REPORTED', not live.
//   • The only immediate revocation the backend implements is ENDING THIS
//     SESSION (real logout → token blacklist + refresh delete). Per-session
//     remote revocation of other devices does not exist yet — no fake button.
//   • EMERGENCY LOCK: suspending your own DID would lock you out of this
//     console permanently (login checks status ACTIVE), so the control is
//     shown as unavailable with that exact reason instead of pretending.

const REDUCED = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

const listOf = (d) => (Array.isArray(d) ? d : []);
const unwrapEvents = (d) => (Array.isArray(d) ? d : (Array.isArray(d?.events) ? d.events : []));

const DAY = 24 * 3600 * 1000;
const SEV_COLOR = { HIGH: C.red, MEDIUM: C.amber, LOW: C.cyan };

const decodeJwt = (token) => {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
};

// One navigation event in the live activity stream.
function ActivityRow({ ev, i }) {
  const ts = ev.timestamp || ev.createdAt;
  const decision = ev.decision || 'INFO';
  const color = decision === 'DENIED' ? C.red : decision === 'GRANTED' ? C.green : C.cyan;
  const title = (ev.action || ev.eventType || 'EVENT').replace(/_/g, ' ');
  const sub = ev.resourceId ? `${ev.resourceId}${ev.reason ? ` · ${ev.reason}` : ''}` : (ev.reason || '');
  return <EventLine key={i} color={color} title={title} sub={sub || undefined} time={timeAgo(ts)} />;
}

export default function ActiveCenterPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const did = user?.did || '';

  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sessionDetail, setSessionDetail] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const [notice, setNotice] = useState(null);

  // current access token (never rendered — only decoded for issued/expiry)
  const [token] = useState(() => localStorage.getItem('cypherid_access_token'));
  const claims = useMemo(() => decodeJwt(token || ''), [token]);

  const grantsQuery = useQuery({
    queryKey: ['delegations', 'outgoing', 'active-page'],
    queryFn: () => api.listDelegations('outgoing'),
    enabled: Boolean(did),
    retry: false,
    refetchInterval: 60000
  });
  const auditQuery = useQuery({
    queryKey: ['audit-logs', 'active-page'],
    queryFn: () => api.auditLogs({ page: 0, size: 25 }).catch(() => null),
    enabled: Boolean(did),
    retry: false
  });
  const securityQuery = useQuery({
    queryKey: ['security-events-active'],
    queryFn: () => api.securityEvents().catch(() => []),
    enabled: Boolean(did),
    retry: false,
    refetchInterval: 60000
  });

  const grants = useMemo(() => listOf(grantsQuery.data), [grantsQuery.data]);
  const auditRows = useMemo(() => {
    const d = auditQuery.data;
    return Array.isArray(d?.content) ? d.content : [];
  }, [auditQuery.data]);
  const secEvents = useMemo(() => unwrapEvents(securityQuery.data), [securityQuery.data]);
  const mySecEvents = useMemo(
    () => secEvents.filter((e) => e.userDid === did),
    [secEvents, did]
  );

  const activeGrants = useMemo(() => {
    const now = Date.now();
    return grants.filter((g) => g.active && new Date(g.expiresAt).getTime() > now);
  }, [grants]);

  const expiringSoon = useMemo(
    () => activeGrants.filter((g) => new Date(g.expiresAt).getTime() - Date.now() < 7 * DAY),
    [activeGrants]
  );

  // ---- derived session history (honest labeling) --------------------------
  const sessions = useMemo(() => {
    const list = [];
    // The current session is REAL: this browser, this token.
    if (claims?.iat) {
      list.push({
        id: claims.jti || 'current',
        current: true,
        issuedAt: new Date(claims.iat * 1000).toISOString(),
        expiresAt: new Date(claims.exp * 1000).toISOString(),
        status: 'ACTIVE'
      });
    }
    // Previously-reported sessions: unique sessionIds in MY security events.
    // These are exam/protected-viewing capture sessions, not auth sessions —
    // presented as monitoring sessions with their last report time.
    const seen = new Map();
    mySecEvents.forEach((e) => {
      if (e.sessionId && !seen.has(e.sessionId)) seen.set(e.sessionId, e);
    });
    [...seen.values()].slice(0, 4).forEach((e) => {
      list.push({
        id: e.sessionId,
        current: false,
        issuedAt: e.createdAt,
        lastActive: e.createdAt,
        status: 'IDLE',
        note: 'Protected-viewing monitoring session'
      });
    });
    return list;
  }, [claims, mySecEvents]);

  const currentSession = sessions.find((s) => s.current);
  const derivedSessions = sessions.filter((s) => !s.current);

  // shared resources: unique resourceIds across ACTIVE grants
  const sharedResources = useMemo(
    () => [...new Set(activeGrants.map((g) => g.resourceId))],
    [activeGrants]
  );

  // security posture: is anything flagged HIGH/MEDIUM for me?
  const flagged = useMemo(
    () => mySecEvents.filter((e) => e.severity === 'HIGH' || e.severity === 'MEDIUM'),
    [mySecEvents]
  );

  const loading = grantsQuery.isLoading;
  const failed = Boolean(grantsQuery.error);

  const doEndSession = async () => {
    setEnding(true);
    try {
      await logout(); // real backend logout → access jti blacklisted, refresh deleted
      navigate('/login');
    } catch {
      setEnding(false);
      setConfirmEnd(false);
      setNotice({ ok: false, text: 'Could not end the session — the server did not confirm. Try again.' });
    }
  };

  // ---- filtering ----------------------------------------------------------
  const matchSearch = (text) => {
    const q = search.trim().toLowerCase();
    return !q || (text || '').toLowerCase().includes(q);
  };
  const showSessions = filter === 'ALL' || filter === 'SESSIONS';
  const showDevices = filter === 'ALL' || filter === 'DEVICES';
  const showAccess = filter === 'ALL' || filter === 'ACCESS';
  const showFiles = filter === 'ALL' || filter === 'FILES';

  return (
    <Box sx={{ color: C.text, maxWidth: 1180, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 3, md: 5 } }}>

      {/* ============ header ============ */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Kicker>ACTIVE</Kicker>
          <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
            Monitor everything currently connected to your identity.
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mt: 1.2 }}>
            <StatusChip status="ACTIVE" pulse={!REDUCED} reduced={REDUCED} />
            <Typography sx={{ fontFamily: MONO, fontSize: '0.62rem', letterSpacing: '0.16em', color: C.dim }}>
              SYSTEM MONITORING
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          onClick={() => navigate('/access-requests')}
          sx={{ bgcolor: C.cyan, color: '#04121F', fontWeight: 700, letterSpacing: '0.06em', '&:hover': { bgcolor: '#5CB8FF' } }}
        >
          + MANAGE ACCESS
        </Button>
      </Box>

      {/* ============ hero stats — all real ============ */}
      <Box sx={{ display: 'flex', gap: { xs: 2.5, md: 5 }, mt: 3, flexWrap: 'wrap' }}>
        {[
          ['CURRENT SESSIONS', loading ? null : sessions.length],
          ['ACTIVE DEVICES', loading ? null : (currentSession ? 1 : 0)],
          ['ACTIVE ACCESS GRANTS', loading ? null : activeGrants.length],
          ['SHARED RESOURCES', loading ? null : sharedResources.length]
        ].map(([label, v]) => (
          <Box key={label}>
            <SectionLabel>{label}</SectionLabel>
            {v == null
              ? <Skeleton width={40} sx={{ bgcolor: 'rgba(56,166,255,0.12)' }} />
              : <Typography sx={{ fontFamily: C.mono, fontSize: '1.5rem', fontWeight: 700 }}>{v}</Typography>}
          </Box>
        ))}
      </Box>

      {/* ============ identity core graph ============ */}
      <Box sx={{ mt: 4 }}>
        <LiveConnectionGraph
          did={did}
          grants={activeGrants}
          events={auditRows}
          onSelect={(n) => {
            if (n.kind === 'DELEGATION') navigate('/access-requests');
            else navigate('/assets');
          }}
          reduced={REDUCED}
        />
      </Box>

      {notice && (
        <Typography role="status" sx={{
          mt: 2.5, fontFamily: C.mono, fontSize: '0.74rem', letterSpacing: '0.06em',
          color: notice.ok ? C.green : C.red
        }}>
          {notice.text}
        </Typography>
      )}

      {/* ============ filters ============ */}
      <Box sx={{ display: 'flex', gap: 1.5, mt: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small" placeholder="Search sessions, grants, events…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          sx={{
            minWidth: 230, '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(5,7,13,0.6)', fontFamily: C.mono, fontSize: '0.8rem',
              '& fieldset': { borderColor: C.line }, '&:hover fieldset': { borderColor: `${C.cyan}66` }
            }
          }}
        />
        {['ALL', 'SESSIONS', 'DEVICES', 'ACCESS', 'FILES'].map((f) => (
          <Button key={f} onClick={() => setFilter(f)}
            sx={{
              minWidth: 0, px: 1.6, py: 0.5, fontFamily: C.mono, fontSize: '0.64rem', letterSpacing: '0.14em',
              color: filter === f ? '#04121F' : C.dim, bgcolor: filter === f ? C.cyan : 'transparent',
              border: `1px solid ${filter === f ? C.cyan : C.line}`, borderRadius: '2px',
              '&:hover': { bgcolor: filter === f ? '#5CB8FF' : 'rgba(56,166,255,0.06)' }
            }}>
            {f}
          </Button>
        ))}
      </Box>

      {/* ============ failed state ============ */}
      {failed && (
        <Box sx={{ mt: 3, border: `1px solid ${C.line}`, borderRadius: '4px', p: 2.5 }}>
          <Typography sx={{ color: C.dim, fontSize: '0.82rem' }}>Unable to load active connections.</Typography>
          <Button onClick={() => grantsQuery.refetch()} sx={{ mt: 1.5, color: C.cyan, border: `1px solid ${C.cyan}55`, letterSpacing: '0.06em' }}>
            RETRY
          </Button>
        </Box>
      )}

      {/* ============ ACTIVE SESSIONS ============ */}
      {showSessions && !failed && (
        <Box sx={{ mt: 4 }}>
          <SectionLabel sx={{ display: 'block', mb: 1.5 }}>ACTIVE SESSIONS</SectionLabel>

          {currentSession && (
            <Panel sx={{ mb: 2, borderColor: `${C.cyan}44` }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 700 }}>This browser — current session</Typography>
                  <Typography sx={{ fontFamily: C.mono, fontSize: '0.66rem', color: C.dim, mt: 0.4 }}>
                    SESSION {currentSession.id ? `${String(currentSession.id).slice(0, 8)}…` : 'LIVE'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <StatusChip status="ACTIVE" pulse={!REDUCED} reduced={REDUCED} />
                  <Button size="small" onClick={() => setSessionDetail(true)}
                    sx={{ color: C.cyan, border: `1px solid ${C.cyan}55`, fontFamily: C.mono, fontSize: '0.6rem', letterSpacing: '0.12em' }}>
                    VIEW DETAILS
                  </Button>
                  <Button size="small" onClick={() => setConfirmEnd(true)}
                    sx={{ color: C.red, border: '1px solid rgba(248,113,113,0.4)', fontFamily: C.mono, fontSize: '0.6rem', letterSpacing: '0.12em' }}>
                    END SESSION
                  </Button>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: { xs: 2, md: 5 }, flexWrap: 'wrap' }}>
                <DetailRow k="STARTED" v={currentSession.issuedAt ? `${fmtDate(currentSession.issuedAt)} · ${new Date(currentSession.issuedAt).toLocaleTimeString()}` : '—'} mono />
                <DetailRow k="EXPIRES" v={`${fmtDate(currentSession.expiresAt)} · ${new Date(currentSession.expiresAt).toLocaleTimeString()}`} mono />
                <DetailRow k="AUTH" v="DID + PASSWORD (LEDGER-VERIFIED)" mono />
              </Box>
            </Panel>
          )}

          <Panel label="PREVIOUSLY REPORTED SESSIONS">
            {derivedSessions.length === 0 ? (
              <Typography sx={{ color: C.dim, fontSize: '0.8rem', py: 1 }}>
                No other sessions have reported to the security monitor from your identity.
              </Typography>
            ) : derivedSessions.map((s) => (
              <Box key={s.id} sx={{ py: 1.2, borderBottom: '1px solid rgba(90,120,180,0.08)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography sx={{ fontFamily: C.mono, fontSize: '0.72rem', color: C.text }}>
                      SESSION {String(s.id).slice(0, 8)}…
                    </Typography>
                    <Typography sx={{ fontSize: '0.68rem', color: C.dim, mt: 0.3 }}>{s.note}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography sx={{ fontFamily: C.mono, fontSize: '0.62rem', color: C.dim }}>
                      LAST REPORT {timeAgo(s.lastActive)}
                    </Typography>
                    <StatusChip status={s.status} reduced={REDUCED} />
                  </Box>
                </Box>
              </Box>
            ))}
            <Typography sx={{ fontSize: '0.66rem', color: C.dim, mt: 1.5, fontStyle: 'italic' }}>
              The backend does not yet maintain a live remote-session registry — this list is derived from
              your security-monitor history and may not reflect devices signed in right now.
            </Typography>
          </Panel>
        </Box>
      )}

      {/* ============ ACTIVE DEVICES (honest) ============ */}
      {showDevices && !failed && (
        <Box sx={{ mt: 4 }}>
          <Panel label="ACTIVE DEVICES">
            {currentSession ? (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                  <Box>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 700 }}>
                      This browser {navigator.userAgent.includes('Edg') ? '· Edge' : navigator.userAgent.includes('Chrome') ? '· Chrome' : navigator.userAgent.includes('Firefox') ? '· Firefox' : navigator.userAgent.includes('Safari') ? '· Safari' : ''}
                    </Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: C.dim, mt: 0.3 }}>
                      Detected from this browser — the backend records no device registry.
                    </Typography>
                  </Box>
                  <StatusChip status="ACTIVE" pulse={!REDUCED} reduced={REDUCED} />
                </Box>
                <Typography sx={{ fontSize: '0.66rem', color: C.dim, mt: 1.5, fontStyle: 'italic' }}>
                  No trusted-device registry exists in the backend, so no other devices are shown.
                </Typography>
              </>
            ) : (
              <Typography sx={{ color: C.dim, fontSize: '0.8rem' }}>Unable to determine the current session.</Typography>
            )}
          </Panel>
        </Box>
      )}

      {/* ============ ACTIVE ACCESS GRANTS ============ */}
      {showAccess && !failed && (
        <Box sx={{ mt: 4 }}>
          <SectionLabel sx={{ display: 'block', mb: 1.5 }}>ACTIVE ACCESS GRANTS</SectionLabel>
          {loading ? (
            <Skeleton height={54} sx={{ bgcolor: 'rgba(56,166,255,0.08)' }} />
          ) : activeGrants.length === 0 ? (
            <Typography sx={{ color: C.dim, fontSize: '0.84rem', py: 2 }}>
              NO ACTIVE ACCESS — nothing is currently granted to another identity.
            </Typography>
          ) : activeGrants.map((g, i) => {
            const expiring = new Date(g.expiresAt).getTime() - Date.now() < 7 * DAY;
            return (
              <Box
                key={i}
                onClick={() => navigate('/access-requests')}
                role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate('/access-requests'); }}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 2, px: { xs: 1.5, md: 2.5 }, py: 1.7,
                  border: `1px solid ${C.line}`, borderRadius: '3px', mb: 1.2, cursor: 'pointer',
                  bgcolor: 'rgba(10,15,26,0.5)', flexWrap: 'wrap',
                  '&:hover, &:focus-visible': { bgcolor: 'rgba(56,166,255,0.06)', borderColor: `${C.cyan}55` }
                }}
              >
                <Box sx={{ flex: '1 1 220px', minWidth: 0 }}>
                  <Typography sx={{ fontFamily: C.mono, fontSize: '0.72rem', color: C.text }}>
                    {shortDid(g.toDID)}
                  </Typography>
                  <Typography sx={{ fontFamily: C.mono, fontSize: '0.62rem', color: C.dim, mt: 0.3 }}>
                    {g.resourceId}
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: C.mono, fontSize: '0.64rem', letterSpacing: '0.1em', color: g.action === 'WRITE' ? C.violet : C.cyan, width: 110 }}>
                  {g.action === 'WRITE' ? 'READ + WRITE' : g.action}
                </Typography>
                <Typography sx={{ color: C.dim, fontSize: '0.7rem', width: 110, display: { xs: 'none', md: 'block' } }}>
                  {fmtDate(g.createdAt)}
                </Typography>
                <Typography sx={{ color: expiring ? C.amber : C.dim, fontSize: '0.7rem', width: 120 }}>
                  EXPIRES {fmtDate(g.expiresAt)}
                </Typography>
                <StatusChip status={expiring ? 'EXPIRING' : 'ACTIVE'} reduced={REDUCED} />
              </Box>
            );
          })}
        </Box>
      )}

      {/* ============ ACTIVE FILE SHARES ============ */}
      {showFiles && !failed && (
        <Box sx={{ mt: 4 }}>
          <Panel
            label="ACTIVE FILE SHARES"
            right={sharedResources.length > 0 && (
              <Button size="small" onClick={() => navigate('/access-requests')}
                sx={{ color: C.cyan, border: `1px solid ${C.cyan}55`, fontFamily: C.mono, fontSize: '0.6rem', letterSpacing: '0.12em' }}>
                MANAGE SHARING
              </Button>
            )}
          >
            {sharedResources.length === 0 ? (
              <Typography sx={{ color: C.dim, fontSize: '0.8rem' }}>
                No files are currently shared with other identities.
              </Typography>
            ) : sharedResources.map((rid) => {
              const peers = activeGrants.filter((g) => g.resourceId === rid);
              const anyWrite = peers.some((g) => g.action === 'WRITE');
              const expiring = peers.some((g) => new Date(g.expiresAt).getTime() - Date.now() < 7 * DAY);
              return (
                <Box key={rid} sx={{ py: 1.4, borderBottom: '1px solid rgba(90,120,180,0.08)' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontFamily: C.mono, fontSize: '0.74rem', color: C.text, wordBreak: 'break-all' }}>
                        {rid}
                      </Typography>
                      <Typography sx={{ fontSize: '0.68rem', color: C.dim, mt: 0.4 }}>
                        SHARED WITH {peers.length} IDENTIT{peers.length === 1 ? 'Y' : 'IES'} · {peers.map((p) => shortDid(p.toDID)).join(', ')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography sx={{ fontFamily: C.mono, fontSize: '0.62rem', color: anyWrite ? C.violet : C.cyan }}>
                        {anyWrite ? 'READ + WRITE' : 'READ'}
                      </Typography>
                      <StatusChip status={expiring ? 'EXPIRING' : 'ACTIVE'} reduced={REDUCED} />
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Panel>
        </Box>
      )}

      {/* ============ LIVE ACTIVITY + SECURITY EVENTS ============ */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5, mt: 4 }}>
        <Panel label="LIVE ACTIVITY" right={<Typography sx={{ fontFamily: C.mono, fontSize: '0.58rem', color: C.dim }}>LEDGER AUDIT · LATEST {auditRows.length}</Typography>}>
          {auditQuery.isLoading ? (
            <Skeleton height={40} sx={{ bgcolor: 'rgba(56,166,255,0.08)' }} />
          ) : auditRows.length === 0 ? (
            <Typography sx={{ color: C.dim, fontSize: '0.8rem' }}>No activity recorded yet.</Typography>
          ) : (
            auditRows.slice(0, 8).map((ev, i) => <ActivityRow ev={ev} i={i} />)
          )}
          <Typography sx={{ fontSize: '0.62rem', color: C.dim, mt: 1.2, fontStyle: 'italic' }}>
            Latest ledger audit events. Live streaming is not implemented in the backend — this
            updates on refresh / 60 s polling.
          </Typography>
        </Panel>

        <Panel label="SECURITY EVENTS" right={(
          flagged.length === 0
            ? <StatusChip status="ACTIVE" pulse={!REDUCED} reduced={REDUCED} />
            : <StatusChip status="EXPIRING" reduced={REDUCED} />
        )}>
          {securityQuery.isLoading ? (
            <Skeleton height={40} sx={{ bgcolor: 'rgba(56,166,255,0.08)' }} />
          ) : mySecEvents.length === 0 ? (
            <Typography sx={{ color: C.dim, fontSize: '0.8rem' }}>
              No security events reported for your identity.
            </Typography>
          ) : (
            <>
              {flagged.length === 0 && (
                <Box sx={{ mb: 1.4, display: 'flex', gap: 1.2, alignItems: 'center' }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: C.green }} aria-hidden="true" />
                  <Typography sx={{ fontFamily: C.mono, fontSize: '0.66rem', color: C.green, letterSpacing: '0.08em' }}>
                    NORMAL — no flagged events on your identity.
                  </Typography>
                </Box>
              )}
              {mySecEvents.slice(0, 7).map((e) => (
                <EventLine
                  key={e.id}
                  color={SEV_COLOR[e.severity] || C.cyan}
                  title={(e.eventType || 'EVENT').replace(/_/g, ' ')}
                  sub={`${e.severity || 'LOW'} SEVERITY${e.sessionId ? ` · SESSION ${String(e.sessionId).slice(0, 8)}…` : ''}`}
                  time={timeAgo(e.createdAt)}
                />
              ))}
            </>
          )}
        </Panel>
      </Box>

      {/* ============ SECURITY SUMMARY ============ */}
      <Box sx={{ mt: 4 }}>
        <Panel label="ACTIVE SECURITY">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2.2 }}>
            {[
              ['IDENTITY', 'ACTIVE', C.green],
              ['SESSIONS', `${sessions.length} LIVE`, C.green],
              ['ACTIVE GRANTS', `${activeGrants.length}`, C.cyan],
              ['EXPIRING SOON', `${expiringSoon.length}`, expiringSoon.length ? C.amber : C.dim]
            ].map(([k, v, color]) => (
              <Box key={k}>
                <SectionLabel sx={{ display: 'block', mb: 0.5 }}>{k}</SectionLabel>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color }} aria-hidden="true" />
                  <Typography sx={{ fontFamily: C.mono, fontSize: '0.76rem', letterSpacing: '0.1em' }}>{v}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
          <Typography sx={{ fontSize: '0.62rem', color: C.dim, mt: 2, fontStyle: 'italic' }}>
            Threat detection is not implemented in the backend — nothing here is inferred beyond the
            counters above.
          </Typography>
        </Panel>
      </Box>

      {/* ============ IDENTITY CONTROL ============ */}
      <Box sx={{ mt: 4, mb: 2 }}>
        <Panel
          label="IDENTITY CONTROL"
          right={<Typography sx={{ fontFamily: C.mono, fontSize: '0.58rem', color: C.dim }}>ACTIONS THE BACKEND IMPLEMENTS</Typography>}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <Box sx={{ border: `1px solid ${C.line}`, borderRadius: '3px', p: 2 }}>
              <Typography sx={{ fontSize: '0.84rem', fontWeight: 700 }}>End this session</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: C.dim, mt: 0.6, lineHeight: 1.55 }}>
                Signs this browser out now. The access token is blacklisted and the refresh token is
                deleted server-side — effective immediately.
              </Typography>
              <Button size="small" onClick={() => setConfirmEnd(true)}
                sx={{ mt: 1.6, color: C.red, border: '1px solid rgba(248,113,113,0.4)', fontFamily: C.mono, fontSize: '0.62rem', letterSpacing: '0.12em' }}>
                END SESSION
              </Button>
            </Box>
            <Box sx={{ border: `1px solid ${C.line}`, borderRadius: '3px', p: 2 }}>
              <Typography sx={{ fontSize: '0.84rem', fontWeight: 700 }}>Manage active grants</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: C.dim, mt: 0.6, lineHeight: 1.55 }}>
                Revoke or extend any active access grant from the Access Control Center — changes take
                effect immediately on the policy engine.
              </Typography>
              <Button size="small" onClick={() => navigate('/access-requests')}
                sx={{ mt: 1.6, color: C.cyan, border: `1px solid ${C.cyan}55`, fontFamily: C.mono, fontSize: '0.62rem', letterSpacing: '0.12em' }}>
                OPEN ACCESS CENTER
              </Button>
            </Box>
            <Box sx={{ border: `1px solid ${C.line}`, borderRadius: '3px', p: 2, opacity: 0.75 }}>
              <Typography sx={{ fontSize: '0.84rem', fontWeight: 700 }}>Suspend identity (emergency lock)</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: C.dim, mt: 0.6, lineHeight: 1.55 }}>
                The backend implements DID suspension, but it would lock YOU out of this console
                permanently — suspended identities cannot sign in. Use it only from the admin panel for
                other identities.
              </Typography>
              <Typography sx={{ mt: 1.6, fontFamily: C.mono, fontSize: '0.62rem', letterSpacing: '0.12em', color: C.dim }}>
                NOT AVAILABLE FOR YOUR OWN IDENTITY
              </Typography>
            </Box>
            <Box sx={{ border: `1px solid ${C.line}`, borderRadius: '3px', p: 2, opacity: 0.75 }}>
              <Typography sx={{ fontSize: '0.84rem', fontWeight: 700 }}>Revoke other sessions remotely</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: C.dim, mt: 0.6, lineHeight: 1.55 }}>
                Not implemented in the backend — there is no per-session registry to revoke from. The
                only revocation path is ending the session you are using.
              </Typography>
              <Typography sx={{ mt: 1.6, fontFamily: C.mono, fontSize: '0.62rem', letterSpacing: '0.12em', color: C.dim }}>
                NOT IMPLEMENTED
              </Typography>
            </Box>
          </Box>
        </Panel>
      </Box>

      {/* ============ session detail drawer ============ */}
      {sessionDetail && currentSession && (
        <Box
          onClick={() => setSessionDetail(false)}
          sx={{ position: 'fixed', inset: 0, zIndex: 30, bgcolor: 'rgba(3,4,9,0.6)', display: 'flex', justifyContent: 'flex-end' }}
        >
          <Box
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-label="Session details"
            sx={{
              width: { xs: '100%', sm: 420 }, height: '100%', overflowY: 'auto',
              bgcolor: '#080C16', borderLeft: `1px solid ${C.line}`, p: 3
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography sx={{ fontFamily: C.mono, fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.2em', color: C.cyan }}>
                SESSION DETAILS
              </Typography>
              <Button size="small" onClick={() => setSessionDetail(false)} sx={{ color: C.dim, minWidth: 0 }}>✕</Button>
            </Box>
            <DetailRow k="SESSION ID" v={currentSession.id ? String(currentSession.id).slice(0, 18) : 'LIVE'} mono />
            <DetailRow k="STATUS" v="ACTIVE" mono />
            <DetailRow k="STARTED" v={new Date(currentSession.issuedAt).toLocaleString()} mono />
            <DetailRow k="EXPIRES" v={new Date(currentSession.expiresAt).toLocaleString()} mono />
            <DetailRow k="AUTHENTICATION" v="DID + PASSWORD · LEDGER-VERIFIED" mono />
            <DetailRow k="IDENTITY" v={did} mono />
            <DetailRow k="TRANSPORT" v="HTTPS · JWT BEARER" mono />
            <Typography sx={{ fontSize: '0.66rem', color: C.dim, mt: 2, fontStyle: 'italic' }}>
              No secrets are shown — the token itself is never displayed or exported.
            </Typography>
            <Button fullWidth onClick={() => { setSessionDetail(false); setConfirmEnd(true); }}
              sx={{ mt: 2.5, color: C.red, border: '1px solid rgba(248,113,113,0.4)', fontFamily: C.mono, fontSize: '0.66rem', letterSpacing: '0.12em' }}>
              REVOKE SESSION
            </Button>
          </Box>
        </Box>
      )}

      {/* ============ end-session confirmation ============ */}
      {confirmEnd && (
        <Box
          onClick={() => !ending && setConfirmEnd(false)}
          sx={{ position: 'fixed', inset: 0, zIndex: 40, bgcolor: 'rgba(3,4,9,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}
        >
          <Box
            onClick={(e) => e.stopPropagation()}
            role="alertdialog" aria-label="End session confirmation"
            sx={{ width: '100%', maxWidth: 430, bgcolor: '#080C16', border: `1px solid ${C.line}`, p: 3 }}
          >
            <Typography sx={{ fontFamily: C.mono, fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.2em', color: C.red }}>
              END THIS SESSION?
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', color: C.text, mt: 1.5, lineHeight: 1.6 }}>
              You will be signed out of this browser immediately. The access token is revoked and the
              refresh token deleted — this device must authenticate again to regain access.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, mt: 3, justifyContent: 'flex-end' }}>
              <Button disabled={ending} onClick={() => setConfirmEnd(false)}
                sx={{ color: C.dim, border: `1px solid ${C.line}`, fontFamily: C.mono, fontSize: '0.66rem' }}>
                STAY SIGNED IN
              </Button>
              <Button disabled={ending} onClick={doEndSession}
                sx={{ color: '#0B0202', bgcolor: C.red, fontFamily: C.mono, fontSize: '0.66rem', fontWeight: 700, '&:hover': { bgcolor: '#f88080' }, '&:disabled': { opacity: 0.5 } }}>
                {ending ? 'ENDING…' : 'END SESSION'}
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
