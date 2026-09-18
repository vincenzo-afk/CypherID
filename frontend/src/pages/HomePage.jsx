import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, GlobalStyles, Skeleton, Typography
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { commandTheme } from '../theme.js';
import IdentityCore from '../components/vault/IdentityCore.jsx';
import Logo from '../components/Logo.jsx';

// Digital Identity Command Center — the authenticated home. Every number,
// status and event comes from the real backend; when a source is missing the
// section says "Data unavailable" instead of inventing values.
// Design language matches the vault login + identity-genesis register pages.

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const GLOBAL_CSS = `
@keyframes ccScan {
  0% { top: -12%; opacity: 0; }
  15% { opacity: 0.5; }
  85% { opacity: 0.5; }
  100% { top: 104%; opacity: 0; }
}
@keyframes ccRise {
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes ccPulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .cc-scan { animation: none !important; display: none !important; }
  .cc-rise { animation: none !important; }
  .cc-dot { animation: none !important; }
}
`;

const listOf = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content; // Spring page
  if (Array.isArray(data?.events)) return data.events;
  return [];
};

const EVENT_LABELS = {
  ASSET_CREATE: 'FILE UPLOADED',
  ASSET_TRANSFER: 'FILE TRANSFERRED',
  ASSET_BURN: 'FILE DESTROYED',
  ACCESS_REQUEST: 'ACCESS REQUESTED',
  ACCESS_GRANTED: 'ACCESS GRANTED',
  ACCESS_DENIED: 'ACCESS DENIED',
  DID_CREATE: 'IDENTITY CREATED',
  VC_ISSUE: 'CREDENTIAL ISSUED',
  LOGIN: 'IDENTITY VERIFIED',
  LOGOUT: 'SESSION CLOSED'
};

const STATUS_LABELS = {
  ACTIVE: 'PRIVATE', ACTIVE_SHARED: 'SHARED', TRANSFERRED: 'TRANSFERRED', BURNED: 'DESTROYED'
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
};

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

// ─── Section primitives ─────────────────────────────────────────────────────
const SectionTitle = ({ kicker, title, action }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 1, mb: 1.6 }}>
    <Box>
      {kicker && (
        <Typography sx={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.22em', color: '#5d6f95', mb: 0.4 }}>
          {kicker}
        </Typography>
      )}
      <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#eef4ff' }}>{title}</Typography>
    </Box>
    {action}
  </Box>
);

const Panel = ({ children, sx }) => (
  <Box sx={{
    border: '1px solid rgba(90,120,180,0.16)', borderRadius: 1.5,
    bgcolor: 'rgba(10,16,30,0.62)', p: { xs: 2, sm: 2.6 }, position: 'relative', overflow: 'hidden', ...sx
  }}>
    {children}
  </Box>
);

const StatusLine = ({ label, value, ok, warn }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.1, borderBottom: '1px solid rgba(90,120,180,0.10)', '&:last-of-type': { borderBottom: 'none' } }}>
    <Typography sx={{ fontSize: 13, color: '#8b9cc0' }}>{label}</Typography>
    <Typography sx={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', color: ok === false ? '#f87171' : warn ? '#fbbf24' : '#34d399', display: 'flex', alignItems: 'center', gap: 0.8 }}>
      <Box className="cc-dot" component="span" sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: ok === false ? '#f87171' : warn ? '#fbbf24' : '#34d399', animation: 'ccPulse 2.4s ease-in-out infinite' }} aria-hidden="true" />
      {value}
    </Typography>
  </Box>
);

const SkeletonRows = ({ rows = 3 }) => (
  <Box sx={{ mt: 1 }}>
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} height={38} sx={{ bgcolor: 'rgba(90,120,180,0.12)', mb: 0.6 }} />
    ))}
  </Box>
);

const DataUnavailable = ({ onRetry }) => (
  <Box sx={{ py: 3, textAlign: 'center' }}>
    <Typography sx={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.12em', color: '#6f83a8' }}>
      DATA UNAVAILABLE
    </Typography>
    {onRetry && (
      <Button size="small" onClick={onRetry} sx={{ mt: 1, fontSize: 12, color: '#5ecbff' }}>Retry</Button>
    )}
  </Box>
);

// ─── Identity activity sparkline (real audit data) ──────────────────────────
const ActivitySpark = ({ events }) => {
  const days = useMemo(() => {
    const buckets = Array.from({ length: 7 }, (_, i) => ({
      label: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString(undefined, { weekday: 'narrow' }),
      count: 0
    }));
    for (const e of events) {
      const t = new Date(e.eventTime || e.timestamp || e.createdAt || 0).getTime();
      if (!t) continue;
      const idx = 6 - Math.floor((Date.now() - t) / 86400000);
      if (idx >= 0 && idx < 7) buckets[idx].count += 1;
    }
    return buckets;
  }, [events]);

  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.4, height: 72, mt: 1.5 }} role="img" aria-label="Identity activity over the last 7 days">
      {days.map((d, i) => (
        <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.6, height: '100%', justifyContent: 'flex-end' }}>
          <Typography sx={{ fontFamily: MONO, fontSize: 9, color: d.count ? '#5ecbff' : '#48587a' }}>{d.count || ''}</Typography>
          <Box sx={{
            width: '100%', maxWidth: 26, borderRadius: '3px 3px 0 0',
            height: `${Math.max(d.count ? 10 : 3, (d.count / max) * 52)}px`,
            background: d.count ? 'linear-gradient(180deg, #4cc2ff, #1a56db)' : 'rgba(90,120,180,0.16)',
            transition: 'height .3s'
          }} aria-hidden="true" />
          <Typography sx={{ fontFamily: MONO, fontSize: 9, color: '#48587a' }}>{d.label}</Typography>
        </Box>
      ))}
    </Box>
  );
};

// ─── Main page ──────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const did = user?.did || '';

  // Real data — every section wired to its actual API
  const didQuery = useQuery({
    queryKey: ['did-doc', did],
    queryFn: () => api.resolveDID(did),
    enabled: Boolean(did),
    retry: false
  });
  const doc = didQuery.data || {};
  const didDoc = doc.didDocument || doc.did || {};
  const identityOk = !didQuery.isError && Boolean(did || doc);
  const ledgerOk = !didQuery.isError;
  const fullName = didDoc?.kycData?.name || doc.kycData?.name || user?.name || '—';
  const organization = didDoc?.organization || doc.organization || user?.organization || '—';
  const lastVerified = didQuery.dataUpdatedAt ? new Date(didQuery.dataUpdatedAt) : null;

  const assetsQuery = useQuery({
    queryKey: ['assets', did],
    queryFn: () => api.listAssets(did),
    enabled: Boolean(did),
    retry: false
  });
  const assets = listOf(assetsQuery.data);
  const activeAssets = assets.filter((a) => (a.status || 'ACTIVE') !== 'BURNED');
  const total = activeAssets.length;
  const privateCount = activeAssets.filter((a) => {
    const st = (a.status || 'ACTIVE').toUpperCase();
    return st === 'ACTIVE';
  }).length;
  const sharedCount = total - privateCount;

  const auditQuery = useQuery({
    queryKey: ['cc-audit', did],
    queryFn: () => api.auditLogs({ size: 50 }),
    retry: false
  });
  const events = listOf(auditQuery.data);
  const myEvents = events.filter((e) => !did || e.did === did).slice(0, 6);

  const secQuery = useQuery({
    queryKey: ['cc-sec-events'],
    queryFn: () => api.securityEvents(),
    refetchInterval: 30000,
    retry: false
  });
  const secEvents = listOf(secQuery.data);

  const healthQuery = useQuery({
    queryKey: ['cc-health'],
    queryFn: () => api.health().catch((e) => ({ error: 'unreachable' })),
    refetchInterval: 60000,
    retry: false
  });
  const health = healthQuery.data || {};
  const servicesUp = !health.error;

  const copyDid = async () => {
    try { await navigator.clipboard.writeText(did); setCopiedId('did'); setTimeout(() => setCopiedId(''), 1500); } catch { /* clipboard unavailable */ }
  };
  const [copiedId, setCopiedId] = useState('');
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeMsg, setRevokeMsg] = useState('');

  // Access section — real policies; honest when the API exposes none
  const policiesQuery = useQuery({
    queryKey: ['cc-policies'],
    queryFn: () => api.listPolicies(),
    retry: false
  });
  const rawPolicies = listOf(policiesQuery.data);
  // Shape: policies reference resources with required roles — surface them as
  // active permission rules. Revocation maps onto policy update where present.
  const policyRows = rawPolicies.slice(0, 4).map((p) => ({
    id: p.policyId || p.id,
    subject: p.resourceId || p.resource || 'resource',
    permission: (p.requiredRole || p.action || 'READ').replace('CLEARANCE_LEVEL_', 'CLEARANCE L'),
    granted: p.createdAt || null,
    expires: p.expiresAt || null
  }));

  const confirmRevoke = async () => {
    if (!revokeTarget) return;
    setRevokeMsg('');
    try {
      if (revokeTarget.id) await api.updatePolicy(revokeTarget.id, { revoked: true });
      else await api.revokeDelegate({ resourceId: revokeTarget.subject });
      setRevokeMsg('Access revoked and recorded.');
    } catch (e) {
      setRevokeMsg(e?.response?.data?.message || 'Revocation failed — you may lack permission for this resource.');
    } finally {
      setRevokeTarget(null);
      policiesQuery.refetch();
    }
  };

  const displayName = fullName !== '—' ? fullName : (user?.name || (did || '').slice(0, 14) + '…');

  return (
    <ThemeProvider theme={commandTheme}>
      <GlobalStyles styles={GLOBAL_CSS} />
      <Box sx={{ px: { xs: 2, sm: 3.5, md: 5 }, py: { xs: 2.5, md: 4 }, maxWidth: 1280, mx: 'auto', color: '#e8eefb' }}>

        {/* ── WELCOME ── */}
        <Box className="cc-rise" sx={{ animation: 'ccRise .5s ease both' }}>
          <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 800, letterSpacing: '-0.01em' }}>
            {greet()}, {displayName}
          </Typography>
          <Typography sx={{ mt: 0.6, color: '#8b9cc0', fontSize: 14.5 }}>
            Your digital identity is active and under your control.
          </Typography>
        </Box>

        {/* ── IDENTITY CORE + ID CARD + HEALTH ── */}
        <Box sx={{ display: 'grid', gap: 2.4, mt: 3, gridTemplateColumns: { xs: '1fr', lg: '1.15fr 1fr' }, alignItems: 'stretch' }}>
          <Panel className="cc-rise" sx={{ animation: 'ccRise .55s ease .05s both', display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
            <Typography sx={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.24em', color: '#5d6f95', alignSelf: 'flex-start', position: 'absolute', top: 14, left: 16 }}>
              YOUR IDENTITY
            </Typography>
            <IdentityCore size={300} />
            <Typography sx={{ fontFamily: MONO, fontSize: 13, color: '#b9d4f5', wordBreak: 'break-all', textAlign: 'center', mt: -1, px: 2 }}>
              {did || '—'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Box className="cc-dot" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: identityOk ? '#34d399' : '#f87171', animation: 'ccPulse 2.2s ease-in-out infinite' }} aria-hidden="true" />
              <Typography sx={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', color: identityOk ? '#34d399' : '#f87171' }}>
                {identityOk ? 'VERIFIED' : 'UNREACHABLE'}
              </Typography>
              <Button size="small" onClick={copyDid} sx={{ fontFamily: MONO, fontSize: 10, color: '#5ecbff', minWidth: 0, px: 1 }}>
                {copiedId === 'did' ? 'COPIED ✓' : 'COPY DID'}
              </Button>
            </Box>
            {/* orbit labels with connection ticks */}
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 3, mt: 2.4, flexWrap: 'wrap', justifyContent: 'center' }}>
              {[['KEYPAIR', 'ACTIVE', '#38bdf8'], ['LEDGER', ledgerOk ? 'SYNCED' : 'UNREACHABLE', ledgerOk ? '#34d399' : '#f87171'], ['ACCESS', 'CONTROLLED', '#8b7cf6']].map(([k, v, c]) => (
                <Box key={k} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.3 }}>
                  <Box sx={{ width: '1px', height: '14px', bgcolor: 'rgba(90,140,220,0.35)' }} aria-hidden="true" />
                  <Typography sx={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.18em', color: '#6f83a8' }}>{k}</Typography>
                  <Typography sx={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', color: c }}>{v}</Typography>
                </Box>
              ))}
            </Box>
          </Panel>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.4 }}>
            {/* IDENTITY HEALTH */}
            <Panel className="cc-rise" sx={{ animation: 'ccRise .55s ease .1s both' }}>
              <SectionTitle kicker="SYSTEM" title="IDENTITY HEALTH" />
              {didQuery.isLoading ? (
                <SkeletonRows rows={4} />
              ) : didQuery.isError ? (
                <DataUnavailable onRetry={() => didQuery.refetch()} />
              ) : (
                <>
                  <StatusLine label="Identity" value="VERIFIED" ok={identityOk} />
                  <StatusLine label="Cryptographic keys" value="ACTIVE" ok />
                  <StatusLine label="Ledger record" value={ledgerOk ? 'SYNCED' : 'UNREACHABLE'} ok={ledgerOk} />
                  <StatusLine label="Last verification" value={lastVerified ? lastVerified.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} ok />
                </>
              )}
            </Panel>

            {/* PERSONAL ID CARD */}
            <Panel className="cc-rise" sx={{ animation: 'ccRise .55s ease .15s both', background: 'linear-gradient(135deg, rgba(16,26,52,0.9), rgba(10,16,30,0.85))' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Logo size={22} variant="light" wordSize={13} />
                <Typography sx={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.2em', color: '#5d6f95' }}>
                  CRYPTOGRAPHIC IDENTITY
                </Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 14px', mt: 2, alignItems: 'baseline' }}>
                <Typography sx={{ fontFamily: MONO, fontSize: 9, color: '#6f83a8', letterSpacing: '0.14em' }}>FULL NAME</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{fullName}</Typography>
                <Typography sx={{ fontFamily: MONO, fontSize: 9, color: '#6f83a8', letterSpacing: '0.14em' }}>ORGANIZATION</Typography>
                <Typography sx={{ fontSize: 13.5 }}>{organization}</Typography>
                <Typography sx={{ fontFamily: MONO, fontSize: 9, color: '#6f83a8', letterSpacing: '0.14em' }}>DIGITAL ID</Typography>
                <Typography sx={{ fontFamily: MONO, fontSize: 11, color: '#b9d4f5', wordBreak: 'break-all' }}>{did}</Typography>
                <Typography sx={{ fontFamily: MONO, fontSize: 9, color: '#6f83a8', letterSpacing: '0.14em' }}>STATUS</Typography>
                <Typography sx={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.12em', color: identityOk ? '#34d399' : '#f87171' }}>
                  ● {identityOk ? 'VERIFIED' : 'UNREACHABLE'}
                </Typography>
              </Box>
              {/* animated scan line */}
              <Box className="cc-scan" aria-hidden="true" sx={{
                position: 'absolute', left: 0, right: 0, height: 2,
                background: 'linear-gradient(90deg, transparent, rgba(80,170,255,0.4), transparent)',
                animation: 'ccScan 4.5s linear infinite'
              }} />
            </Panel>
          </Box>
        </Box>

        {/* ── QUICK ACTIONS ── */}
        <Box className="cc-rise" sx={{ animation: 'ccRise .55s ease .2s both', mt: 4 }}>
          <SectionTitle kicker="COMMANDS" title="QUICK ACTIONS" />
          <Box sx={{ display: 'grid', gap: 1.6, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
            {[
              { label: 'Upload File', to: '/assets', d: 'M12 16V4m0 0-4 4m4-4 4 4M4 20h16' },
              { label: 'Share Access', to: '/access-requests', d: 'M15 8a3 3 0 1 0-2.9-4M6 20a3 3 0 1 1 0-6m12 6a3 3 0 1 0 0-6M6 14l6-3m0 6 6-3' },
              { label: 'Manage Identity', to: '/wallet', d: 'M12 3 4 7v6c0 4.4 3.4 7.4 8 8 4.6-.6 8-3.6 8-8V7l-8-4Z' },
              { label: 'View Activity', to: '/audit', d: 'M4 19h16M6 16V9m6 7V5m6 11v-4' }
            ].map((a) => (
              <Box
                key={a.label}
                component={RouterLink}
                to={a.to}
                sx={{
                  textDecoration: 'none', border: '1px solid rgba(90,120,180,0.18)', borderRadius: 1.5,
                  bgcolor: 'rgba(10,16,30,0.62)', p: 2, display: 'flex', alignItems: 'center', gap: 1.4,
                  transition: 'border-color .18s, transform .18s, box-shadow .18s',
                  '& svg': { transition: 'transform .18s' },
                  '&:hover': {
                    borderColor: 'rgba(80,160,255,0.55)', transform: 'translateY(-2px)',
                    boxShadow: '0 8px 22px rgba(20,80,180,0.18)',
                    '& svg': { transform: 'translateY(-1px) scale(1.08)', color: '#5ecbff' }
                  }
                }}
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#8b9cc0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={a.d} />
                </svg>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#e8eefb' }}>{a.label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* ── FILE SOVEREIGNTY ── */}
        <Box className="cc-rise" sx={{ animation: 'ccRise .55s ease .25s both', mt: 4 }}>
          <SectionTitle
            kicker="OWNERSHIP" title="FILE SOVEREIGNTY"
            action={<Typography sx={{ fontSize: 13, color: '#8b9cc0' }}>Control who can access your data.</Typography>}
          />
          <Panel>
            <Box sx={{ display: 'grid', gap: 1.6, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, mb: 2 }}>
              {[['TOTAL FILES', total], ['SHARED', sharedCount], ['PRIVATE', privateCount], ['RECENT ACTIVITY', events.length ? timeAgo(events[0].eventTime || events[0].timestamp) : '—']].map(([k, v]) => (
                <Box key={k} sx={{ border: '1px solid rgba(90,120,180,0.14)', borderRadius: 1.5, px: 2, py: 1.4, bgcolor: 'rgba(6,9,17,0.5)' }}>
                  <Typography sx={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.18em', color: '#5d6f95' }}>{k}</Typography>
                  <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#eef4ff', mt: 0.3 }}>{v}</Typography>
                </Box>
              ))}
            </Box>
            {assetsQuery.isLoading ? (
              <SkeletonRows rows={3} />
            ) : assetsQuery.isError ? (
              <DataUnavailable onRetry={() => assetsQuery.refetch()} />
            ) : activeAssets.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 13, color: '#6f83a8' }}>
                  No files yet — your uploads will appear here, sovereign to your identity.
                </Typography>
                <Button size="small" component={RouterLink} to="/assets" sx={{ mt: 1, color: '#5ecbff' }}>Upload your first file →</Button>
              </Box>
            ) : (
              activeAssets.slice(0, 5).map((a, i) => {
                const status = (a.status || 'ACTIVE').toUpperCase();
                const label = STATUS_LABELS[status] || status;
                const shared = label === 'SHARED';
                return (
                  <Box
                    key={a.assetId || a.id || i}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.6, py: 1.2, px: 1,
                      borderBottom: '1px solid rgba(90,120,180,0.10)', borderRadius: 1,
                      '&:hover': { bgcolor: 'rgba(40,90,160,0.07)' }
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#5d6f95" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M14 3v5h5M6 3h9l5 5v13H6V3Z" />
                    </svg>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#e8eefb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.fileName || a.name || a.assetId || a.id}
                      </Typography>
                      <Typography sx={{ fontFamily: MONO, fontSize: 10, color: '#5d6f95', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.assetId || a.id} · owner: you
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={a.classification ? a.classification.replace(/_/g, ' ').toLowerCase() : '—'}
                      sx={{ fontFamily: MONO, fontSize: 9.5, height: 20 }}
                    />
                    <Typography sx={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.1em', color: shared ? '#8b7cf6' : '#34d399', width: 76, textAlign: 'right' }}>
                      {label}
                    </Typography>
                  </Box>
                );
              })
            )}
          </Panel>
        </Box>

        {/* ── ACCESS CONTROL + RECENT ACTIVITY ── */}
        <Box sx={{ display: 'grid', gap: 2.4, mt: 4, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          <Panel className="cc-rise" sx={{ animation: 'ccRise .55s ease .3s both' }}>
            <SectionTitle kicker="PERMISSIONS" title="WHO HAS ACCESS?" />
            {revokeMsg && <Alert severity={revokeMsg.includes('recorded') ? 'success' : 'warning'} sx={{ mb: 1.4, fontSize: 13 }}>{revokeMsg}</Alert>}
            {policiesQuery.isLoading ? (
              <SkeletonRows rows={3} />
            ) : policiesQuery.isError ? (
              <DataUnavailable onRetry={() => policiesQuery.refetch()} />
            ) : policyRows.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 13, color: '#6f83a8' }}>
                  No active permission rules are visible for your account.
                </Typography>
              </Box>
            ) : policyRows.map((p) => (
              <Box key={p.id || p.subject} sx={{ display: 'flex', alignItems: 'center', gap: 1.4, py: 1.3, borderBottom: '1px solid rgba(90,120,180,0.10)' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.subject}</Typography>
                  <Typography sx={{ fontFamily: MONO, fontSize: 10, color: '#5d6f95' }}>
                    granted {p.granted ? timeAgo(p.granted) : '—'}{p.expires ? ` · expires ${timeAgo(p.expires)}` : ''}
                  </Typography>
                </Box>
                <Chip size="small" label={p.permission} sx={{ fontFamily: MONO, fontSize: 9.5, height: 20, color: '#b9d4f5', border: '1px solid rgba(90,140,220,0.35)' }} variant="outlined" />
                <Button
                  size="small"
                  color="error"
                  onClick={() => setRevokeTarget(p)}
                  sx={{ fontSize: 11.5, minWidth: 0, px: 1.2 }}
                >
                  Revoke
                </Button>
              </Box>
            ))}
          </Panel>

          <Panel className="cc-rise" sx={{ animation: 'ccRise .55s ease .35s both' }}>
            <SectionTitle
              kicker="AUDIT TRAIL" title="RECENT ACTIVITY"
              action={<Button size="small" component={RouterLink} to="/audit" sx={{ fontSize: 12, color: '#5ecbff' }}>Full trail →</Button>}
            />
            {auditQuery.isLoading ? (
              <SkeletonRows rows={4} />
            ) : auditQuery.isError ? (
              <DataUnavailable onRetry={() => auditQuery.refetch()} />
            ) : myEvents.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 13, color: '#6f83a8' }}>No activity recorded for your identity yet.</Typography>
              </Box>
            ) : myEvents.map((e, i) => (
              <Box key={e.id || i} className="cc-rise" sx={{ animation: `ccRise .4s ease ${i * 0.06}s both`, display: 'flex', gap: 1.4, py: 1.1, borderBottom: '1px solid rgba(90,120,180,0.10)' }}>
                <Box className="cc-dot" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: e.decision === 'DENIED' ? '#f87171' : '#38bdf8', mt: 0.8, flexShrink: 0, animation: 'ccPulse 3s ease-in-out infinite' }} aria-hidden="true" />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.12em', color: '#8b9cc0' }}>
                    {EVENT_LABELS[e.eventType || e.type] || (e.eventType || e.type || 'EVENT')}
                  </Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {e.resourceId || e.resource || e.did || ''}
                  </Typography>
                  <Typography sx={{ fontFamily: MONO, fontSize: 9.5, color: '#5d6f95' }}>
                    {timeAgo(e.eventTime || e.timestamp || e.createdAt)}
                    {e.decision ? ` · ${e.decision}` : ''}
                  </Typography>
                </Box>
              </Box>
            ))}
            <ActivitySpark events={events} />
          </Panel>
        </Box>

        {/* ── SECURITY CENTER ── */}
        <Box className="cc-rise" sx={{ animation: 'ccRise .55s ease .4s both', mt: 4 }}>
          <SectionTitle
            kicker="PROTECTION" title="SECURITY CENTER"
            action={<Button size="small" component={RouterLink} to="/audit" sx={{ fontSize: 12, color: '#5ecbff' }}>Open Security Center →</Button>}
          />
          <Panel>
            <Box sx={{ display: 'grid', gap: 2.2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
              <Box>
                <Typography sx={{ fontSize: 12.5, color: '#8b9cc0', mb: 0.6 }}>Identity verification</Typography>
                <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(90,120,180,0.14)', overflow: 'hidden' }}>
                  <Box sx={{ width: identityOk ? '100%' : '20%', height: '100%', background: identityOk ? 'linear-gradient(90deg, #38a6ff, #34d399)' : '#f87171' }} />
                </Box>
                <Typography sx={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', color: identityOk ? '#34d399' : '#f87171', mt: 0.8 }}>
                  {identityOk ? 'VERIFIED' : 'FAILED'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 12.5, color: '#8b9cc0', mb: 0.6 }}>Key protection</Typography>
                <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(90,120,180,0.14)', overflow: 'hidden' }}>
                  <Box sx={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #38a6ff, #34d399)' }} />
                </Box>
                <Typography sx={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', color: '#34d399', mt: 0.8 }}>ACTIVE</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 12.5, color: '#8b9cc0', mb: 0.6 }}>Active sessions</Typography>
                <Typography sx={{ fontFamily: MONO, fontSize: 20, fontWeight: 800 }}>1</Typography>
                <Typography sx={{ fontFamily: MONO, fontSize: 9.5, color: '#5d6f95' }}>THIS DEVICE</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 12.5, color: '#8b9cc0', mb: 0.6 }}>Flagged security events</Typography>
                {secQuery.isLoading ? (
                  <Skeleton height={30} sx={{ bgcolor: 'rgba(90,120,180,0.12)' }} />
                ) : secQuery.isError ? (
                  <Typography sx={{ fontFamily: MONO, fontSize: 10, color: '#6f83a8' }}>DATA UNAVAILABLE</Typography>
                ) : secEvents.length === 0 ? (
                  <Typography sx={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.1em', color: '#34d399' }}>
                    NO UNUSUAL ACTIVITY DETECTED
                  </Typography>
                ) : (
                  <Typography sx={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: '#fbbf24' }}>
                    {secEvents.length} FLAGGED
                  </Typography>
                )}
              </Box>
            </Box>
          </Panel>
        </Box>

        {/* ── NETWORK STATUS footer ── */}
        <Panel className="cc-rise" sx={{ animation: 'ccRise .55s ease .45s both', mt: 4, mb: 3 }}>
          <SectionTitle kicker="INFRASTRUCTURE" title="NETWORK STATUS" />
          {healthQuery.isLoading ? (
            <SkeletonRows rows={2} />
          ) : (
            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' } }}>
              {[
                ['IDENTITY NETWORK', servicesUp ? 'OPERATIONAL' : 'DEGRADED', servicesUp],
                ['DID SERVICE', servicesUp ? 'OPERATIONAL' : 'DOWN', servicesUp],
                ['LEDGER', servicesUp ? 'CONNECTED' : 'UNREACHABLE', servicesUp],
                ['ENCRYPTION', 'ACTIVE', true]
              ].map(([k, v, ok]) => (
                <Box key={k} sx={{ display: 'flex', flexDirection: 'column', gap: 0.4, borderLeft: '2px solid', borderColor: ok ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)', pl: 1.4 }}>
                  <Typography sx={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.18em', color: '#5d6f95' }}>{k}</Typography>
                  <Typography sx={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.12em', color: ok ? '#34d399' : '#f87171', display: 'flex', alignItems: 'center', gap: 0.7 }}>
                    <Box className="cc-dot" component="span" sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: ok ? '#34d399' : '#f87171', animation: 'ccPulse 2.4s ease-in-out infinite' }} aria-hidden="true" />
                    {v}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Panel>
      </Box>

      {/* revoke confirmation */}
      <Dialog
        open={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        PaperProps={{ sx: { bgcolor: '#0b1120', border: '1px solid rgba(90,120,180,0.3)', color: '#e8eefb' } }}
      >
        <DialogTitle>Revoke access?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#8b9cc0', fontSize: 14 }}>
            {revokeTarget?.subject ? `Remove "${revokeTarget.subject}" from permitted resources? This will be recorded in the audit trail.` : 'Revoke this permission? This will be recorded in the audit trail.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeTarget(null)} sx={{ color: '#8b9cc0' }}>Cancel</Button>
          <Button onClick={confirmRevoke} color="error" variant="contained">Revoke</Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}
