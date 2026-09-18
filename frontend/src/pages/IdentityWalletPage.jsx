import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, GlobalStyles, Skeleton, Typography
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { commandTheme } from '../theme.js';
import IdentityCore from '../components/vault/IdentityCore.jsx';
import Logo from '../components/Logo.jsx';
import { qrPath } from '../utils/qr.js';

// Identity Vault — the user's cryptographic identity as the centerpiece.
// Every field, status and timestamp comes from the real backend:
//   resolveDID → { didDocument{did,status,publicKey,createdAt,updatedAt,metadata}, status, resolvedAt }
// When a value is not recorded for this identity the UI says so instead of
// inventing it. No password/key/seed/token is ever displayed or encoded.

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const GLOBAL_CSS = `
@keyframes ivScan {
  0% { top: -12%; opacity: 0; }
  15% { opacity: 0.5; }
  85% { opacity: 0.5; }
  100% { top: 104%; opacity: 0; }
}
@keyframes ivPulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
@keyframes ivRise {
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .iv-scan { animation: none !important; display: none !important; }
  .iv-dot { animation: none !important; }
  .iv-rise { animation: none !important; }
}
`;

const rowsOf = (d) => (Array.isArray(d) ? d : Array.isArray(d?.events) ? d.events : []);

const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' });
};
const fmtStamp = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const SectionTitle = ({ kicker, title, action }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 1, mb: 1.6 }}>
    <Box>
      {kicker && <Typography sx={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.22em', color: '#5d6f95', mb: 0.4 }}>{kicker}</Typography>}
      <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#eef4ff' }}>{title}</Typography>
    </Box>
    {action}
  </Box>
);

const Panel = ({ children, sx }) => (
  <Box sx={{ border: '1px solid rgba(90,120,180,0.16)', borderRadius: 1.5, bgcolor: 'rgba(10,16,30,0.62)', p: { xs: 2, sm: 2.6 }, position: 'relative', overflow: 'hidden', ...sx }}>
    {children}
  </Box>
);

const InfoRow = ({ label, value, mono, editable, onChange }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '150px 1fr' }, gap: '2px 14px', py: 1.2, borderBottom: '1px solid rgba(90,120,180,0.10)' }}>
    <Typography sx={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.16em', color: '#6f83a8', pt: 0.6 }}>{label}</Typography>
    {editable && onChange ? (
      <Box
        component="input"
        value={value}
        onChange={onChange}
        sx={{
          bgcolor: 'rgba(6,9,17,0.6)', border: '1px solid rgba(90,140,220,0.3)', borderRadius: 1,
          color: '#e8eefb', fontSize: 13.5, px: 1.4, py: 0.9, outline: 'none', width: '100%',
          '&:focus': { borderColor: 'rgba(80,160,255,0.65)' }
        }}
      />
    ) : (
      <Typography sx={{ fontSize: 13.5, color: '#e8eefb', wordBreak: mono ? 'break-all' : undefined, fontFamily: mono ? MONO : undefined }}>
        {value}
      </Typography>
    )}
  </Box>
);

const CryptoModule = ({ title, status, ok, warn, text, icon }) => (
  <Box sx={{
    border: '1px solid', borderColor: warn ? 'rgba(251,191,36,0.35)' : ok ? 'rgba(52,211,153,0.28)' : 'rgba(248,113,113,0.35)',
    borderRadius: 1.5, bgcolor: 'rgba(6,9,17,0.55)', p: 1.8
  }}>
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={warn ? '#fbbf24' : ok ? '#34d399' : '#f87171'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', marginBottom: 8 }}>
      <path d={icon} />
    </svg>
    <Typography sx={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', color: '#6f83a8' }}>{title}</Typography>
    <Typography sx={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.12em', color: warn ? '#fbbf24' : ok ? '#34d399' : '#f87171', mt: 0.3, display: 'flex', alignItems: 'center', gap: 0.7 }}>
      <Box className="iv-dot" component="span" sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: warn ? '#fbbf24' : ok ? '#34d399' : '#f87171', animation: 'ivPulse 2.4s ease-in-out infinite' }} aria-hidden="true" />
      {status}
    </Typography>
    <Typography sx={{ fontSize: 11.5, color: '#8b9cc0', mt: 0.9, lineHeight: 1.45 }}>{text}</Typography>
  </Box>
);

const VERIFY_STAGES = ['VERIFYING IDENTITY', 'CHECKING KEYPAIR', 'RESOLVING DID', 'CHECKING RECORD'];

export default function IdentityWalletPage() {
  const { user } = useAuth();
  const did = user?.did || '';
  const [copied, setCopied] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyStage, setVerifyStage] = useState(0);
  const [verifyResult, setVerifyResult] = useState(null); // true | false | null
  const [editOpen, setEditOpen] = useState(false);
  const [editNotice, setEditNotice] = useState(false);

  const docQuery = useQuery({
    queryKey: ['iv-did-doc', did],
    queryFn: () => api.resolveDID(did),
    enabled: Boolean(did),
    retry: false
  });

  const secQuery = useQuery({
    queryKey: ['iv-sec-events'],
    queryFn: () => api.securityEvents(),
    refetchInterval: 60000,
    retry: false
  });

  const doc = docQuery.data || {};
  const didDoc = doc.didDocument || doc.did || {};
  const metadata = useMemo(() => {
    const raw = didDoc?.metadata;
    if (!raw) return {};
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return {}; }
    }
    return raw;
  }, [didDoc?.metadata]);
  const kyc = metadata.kyc || didDoc?.kycData || doc.kycData || {};

  const ledgerSource = didDoc?.source || doc.source || null;
  const onLedger = Boolean(didDoc) && ledgerSource !== 'local-fallback';
  const identityActive = (doc.status || didDoc?.status) === 'ACTIVE';
  const publicKey = didDoc?.publicKey || doc.publicKey || null;

  const fullName = kyc.name || null;
  const staffNumber = kyc.employeeId || null;
  const organization = metadata.org || didDoc?.organization || doc.organization || null;
  const department = metadata.dept || didDoc?.department || doc.department || null;
  const createdAt = didDoc?.createdAt || doc.createdAt || null;

  // Identity history from real document facts only
  const timeline = useMemo(() => {
    const items = [];
    if (createdAt) {
      items.push({ title: 'IDENTITY CREATED', text: 'Digital identity generated', at: fmtStamp(createdAt) });
      items.push({ title: 'KEYPAIR GENERATED', text: 'Cryptographic keypair created', at: fmtStamp(createdAt) });
      items.push({ title: 'IDENTITY REGISTERED', text: onLedger ? 'DID recorded on the ledger' : 'DID record created', at: fmtStamp(didDoc?.updatedAt || createdAt) });
    }
    if (doc.resolvedAt) {
      items.push({ title: 'IDENTITY VERIFIED', text: 'Latest verification completed', at: fmtStamp(doc.resolvedAt) });
    }
    return items;
  }, [createdAt, didDoc?.updatedAt, doc.resolvedAt, onLedger]);

  const copy = async (text, tag) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      setTimeout(() => setCopied(''), 1500);
    } catch { /* clipboard unavailable */ }
  };

  const verify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    const timers = [600, 1300, 2000, 2700].map((ms, i) => setTimeout(() => setVerifyStage(i), ms));
    try {
      const fresh = await api.resolveDID(did); // the real check: a fresh ledger-backed resolve
      const ok = (fresh?.status || fresh?.didDocument?.status) === 'ACTIVE';
      setVerifyResult(ok);
    } catch {
      setVerifyResult(false);
    } finally {
      timers.forEach(clearTimeout);
      setVerifying(false);
      docQuery.refetch();
    }
  };

  const exportIdentity = () => {
    const payload = { did, status: doc.status || didDoc?.status, didDocument: didDoc, resolvedAt: doc.resolvedAt || null };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `cypherid-identity-${did.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const qr = useMemo(() => {
    try { return showQr ? qrPath(did) : null; } catch { return null; }
  }, [showQr, did]);

  const secEvents = rowsOf(secQuery.data);
  const displayName = fullName || (did || '').slice(0, 18) + '…';

  return (
    <ThemeProvider theme={commandTheme}>
      <GlobalStyles styles={GLOBAL_CSS} />
      <Box sx={{ px: { xs: 2, sm: 3.5, md: 5 }, py: { xs: 2.5, md: 3.5 }, maxWidth: 1280, mx: 'auto', color: '#e8eefb' }}>

        {/* ── PAGE HEADER ── */}
        <Box className="iv-rise" sx={{ animation: 'ivRise .5s ease both', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1.6 }}>
          <Box>
            <Typography sx={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', color: '#5ecbff' }}>IDENTITY</Typography>
            <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 800, mt: 0.6 }}>
              Your digital identity, under your control.
            </Typography>
            <Typography sx={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', mt: 1, color: identityActive ? '#34d399' : '#f87171', display: 'flex', alignItems: 'center', gap: 0.9 }}>
              <Box className="iv-dot" component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: identityActive ? '#34d399' : '#f87171', animation: 'ivPulse 2.2s ease-in-out infinite' }} aria-hidden="true" />
              IDENTITY {docQuery.isLoading ? 'CHECKING…' : identityActive ? 'ACTIVE' : (doc.status || didDoc?.status || 'UNAVAILABLE')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={() => copy(did, 'header')}
              sx={{ borderColor: 'rgba(90,140,220,0.4)', color: '#c6d5ef', fontSize: 13 }}
            >
              {copied === 'header' ? 'COPIED ✓' : 'Copy Digital ID'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => document.getElementById('iv-controls')?.scrollIntoView({ behavior: 'smooth' })}
              sx={{ borderColor: 'rgba(90,140,220,0.4)', color: '#c6d5ef', fontSize: 13 }}
            >
              Identity Settings
            </Button>
          </Box>
        </Box>

        {docQuery.isError && (
          <Alert severity="error" sx={{ mt: 2, bgcolor: 'rgba(150,40,40,0.14)', border: '1px solid rgba(220,90,90,0.4)' }}>
            Unable to load identity information.
            <Button size="small" onClick={() => docQuery.refetch()} sx={{ ml: 1 }}>Retry</Button>
          </Alert>
        )}

        {/* ── IDENTITY CORE + DIGITAL ID CARD ── */}
        <Box sx={{ display: 'grid', gap: 2.4, mt: 3, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, alignItems: 'stretch' }}>
          <Panel className="iv-rise" sx={{ animation: 'ivRise .55s ease .05s both', display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
            <Typography sx={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.24em', color: '#5d6f95', alignSelf: 'flex-start', position: 'absolute', top: 14, left: 16 }}>
              IDENTITY CORE
            </Typography>
            <IdentityCore size={320} />
            <Typography sx={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.2em', color: docQuery.isError ? '#f87171' : '#34d399', mt: -1 }}>
              {docQuery.isLoading ? 'RESOLVING…' : docQuery.isError ? 'UNREACHABLE' : 'VERIFIED'}
            </Typography>
            <Typography
              onClick={() => copy(did, 'core')}
              title="Click to copy"
              sx={{ fontFamily: MONO, fontSize: 13, color: '#b9d4f5', wordBreak: 'break-all', textAlign: 'center', mt: 0.8, px: 2, cursor: 'pointer', '&:hover': { color: '#5ecbff' } }}
            >
              {did}
            </Typography>
            <Typography sx={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', color: '#5d6f95', mt: 1.6 }}>
              CRYPTOGRAPHIC IDENTITY
            </Typography>
            <Typography sx={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.14em', color: identityActive ? '#34d399' : '#f87171' }}>
              {identityActive ? 'ACTIVE' : (doc.status || didDoc?.status || 'UNKNOWN')}
            </Typography>
          </Panel>

          <Panel className="iv-rise" sx={{ animation: 'ivRise .55s ease .1s both', background: 'linear-gradient(135deg, rgba(16,26,52,0.92), rgba(10,16,30,0.88))', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Logo size={24} variant="light" wordSize={14} />
              <Typography sx={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.2em', color: '#5d6f95' }}>
                DIGITAL ID · CRYPTOGRAPHIC PASSPORT
              </Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '7px 16px', mt: 2.4, alignItems: 'baseline' }}>
              <Typography sx={{ fontFamily: MONO, fontSize: 9, color: '#6f83a8', letterSpacing: '0.14em' }}>FULL NAME</Typography>
              <Typography sx={{ fontSize: 14.5, fontWeight: 700 }}>{fullName || <Box component="span" sx={{ color: '#5d6f95', fontWeight: 500 }}>Not recorded for this identity</Box>}</Typography>
              <Typography sx={{ fontFamily: MONO, fontSize: 9, color: '#6f83a8', letterSpacing: '0.14em' }}>ORGANIZATION</Typography>
              <Typography sx={{ fontSize: 13.5 }}>{organization || <Box component="span" sx={{ color: '#5d6f95' }}>Not recorded</Box>}</Typography>
              <Typography sx={{ fontFamily: MONO, fontSize: 9, color: '#6f83a8', letterSpacing: '0.14em' }}>DEPARTMENT</Typography>
              <Typography sx={{ fontSize: 13.5 }}>{department || <Box component="span" sx={{ color: '#5d6f95' }}>Not recorded</Box>}</Typography>
              <Typography sx={{ fontFamily: MONO, fontSize: 9, color: '#6f83a8', letterSpacing: '0.14em' }}>DIGITAL ID</Typography>
              <Typography sx={{ fontFamily: MONO, fontSize: 11.5, color: '#b9d4f5', wordBreak: 'break-all' }}>{did}</Typography>
              <Typography sx={{ fontFamily: MONO, fontSize: 9, color: '#6f83a8', letterSpacing: '0.14em' }}>STATUS</Typography>
              <Typography sx={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.12em', color: identityActive ? '#34d399' : '#f87171' }}>● {identityActive ? 'VERIFIED' : (doc.status || didDoc?.status || 'UNKNOWN')}</Typography>
              <Typography sx={{ fontFamily: MONO, fontSize: 9, color: '#6f83a8', letterSpacing: '0.14em' }}>CREATED</Typography>
              <Typography sx={{ fontSize: 13 }}>{fmtDate(createdAt) || <Box component="span" sx={{ color: '#5d6f95' }}>Not recorded</Box>}</Typography>
            </Box>
            <Box sx={{ mt: 'auto', pt: 2.4, display: 'flex', gap: 1.2, flexWrap: 'wrap' }}>
              <Button size="small" variant="contained" onClick={() => copy(did, 'card')} sx={{ fontSize: 12, background: 'linear-gradient(90deg, #4cc2ff, #38a6ff)', color: '#051018', fontWeight: 700 }}>
                {copied === 'card' ? 'COPIED ✓' : 'COPY DID'}
              </Button>
              <Button size="small" variant="outlined" onClick={() => setDetailsOpen(true)} sx={{ fontSize: 12, borderColor: 'rgba(90,140,220,0.4)', color: '#c6d5ef' }}>
                VIEW DETAILS
              </Button>
            </Box>
            <Box className="iv-scan" aria-hidden="true" sx={{
              position: 'absolute', left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg, transparent, rgba(80,170,255,0.4), transparent)',
              animation: 'ivScan 4.5s linear infinite'
            }} />
          </Panel>
        </Box>

        {/* ── IDENTITY INFORMATION ── */}
        <Box className="iv-rise" sx={{ animation: 'ivRise .55s ease .15s both', mt: 4 }}>
          <SectionTitle
            kicker="RECORD" title="IDENTITY INFORMATION"
            action={<Button size="small" variant="outlined" onClick={() => setEditOpen(true)} sx={{ fontSize: 12, borderColor: 'rgba(90,140,220,0.4)', color: '#c6d5ef' }}>Edit Identity</Button>}
          />
          <Panel>
            {docQuery.isLoading ? (
              <Box sx={{ py: 1 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={36} sx={{ bgcolor: 'rgba(90,120,180,0.12)' }} />)}</Box>
            ) : docQuery.isError ? (
              <Typography sx={{ py: 2, textAlign: 'center', fontFamily: MONO, fontSize: 11, color: '#6f83a8' }}>
                UNABLE TO LOAD IDENTITY INFORMATION
                <Button size="small" onClick={() => docQuery.refetch()} sx={{ ml: 1.5, color: '#5ecbff' }}>Retry</Button>
              </Typography>
            ) : (
              <>
                <InfoRow label="FULL NAME" value={fullName || 'Not recorded for this identity'} />
                <InfoRow label="STAFF NUMBER" value={staffNumber || 'Not recorded for this identity'} />
                <InfoRow label="ORGANIZATION" value={organization || 'Not recorded'} />
                <InfoRow label="DEPARTMENT" value={department || 'Not recorded'} />
                <InfoRow label="DIGITAL ID" value={did} mono />
                <InfoRow label="CREATED" value={fmtStamp(createdAt) || 'Not recorded'} />
              </>
            )}
          </Panel>
        </Box>

        {/* ── CRYPTOGRAPHIC STATUS ── */}
        <Box className="iv-rise" sx={{ animation: 'ivRise .55s ease .2s both', mt: 4 }}>
          <SectionTitle kicker="TECHNICAL" title="CRYPTOGRAPHIC STATUS" />
          <Box sx={{ display: 'grid', gap: 1.6, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
            <CryptoModule title="KEYPAIR" status={publicKey ? 'ACTIVE' : 'UNRECORDED'} ok={Boolean(publicKey)} warn={!publicKey}
              text={publicKey ? 'Your cryptographic keypair is active for this identity.' : 'No public key material is recorded on this identity document.'}
              icon="M14 10a2 2 0 1 0-2.6-1.9L4 15.5V20h4.5l1-1v-2h2l1-1v-2h1.5l.9-.9A2 2 0 0 0 14 10Z" />
            <CryptoModule title="PUBLIC KEY" status={publicKey ? 'REGISTERED' : 'UNRECORDED'} ok={Boolean(publicKey)} warn={!publicKey}
              text={publicKey ? 'The public key is registered with the identity document.' : 'This identity has no registered public key material.'}
              icon="M8 18h8M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V12h-4v-2.5A4 4 0 0 1 12 2ZM5 20h14" />
            <CryptoModule title="DID" status={docQuery.isError ? 'UNRESOLVED' : 'RESOLVED'} ok={!docQuery.isError}
              text={docQuery.isError ? 'The identity document could not be resolved.' : 'The DID resolves to a valid identity document.'}
              icon="M12 3v3m0 12v3M3 12h3m12 0h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
            <CryptoModule title="LEDGER RECORD" status={docQuery.isError ? 'UNREACHABLE' : onLedger ? 'VERIFIED' : 'LOCAL RECORD'} ok={docQuery.isError ? false : onLedger} warn={!docQuery.isError && !onLedger}
              text={docQuery.isError ? 'The ledger could not be reached to confirm the record.' : onLedger ? 'The identity record is confirmed on the ledger.' : 'Served from a local record — ledger confirmation is not available for this seeded identity.'}
              icon="M4 7h16M4 12h16M4 17h10M20 15l-2.5 2.5L15 15" />
          </Box>
        </Box>

        {/* ── IDENTITY HISTORY + VERIFY ── */}
        <Box sx={{ display: 'grid', gap: 2.4, mt: 4, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          <Panel className="iv-rise" sx={{ animation: 'ivRise .55s ease .25s both' }}>
            <SectionTitle kicker="AUDIT" title="IDENTITY HISTORY" />
            {docQuery.isLoading ? (
              <Box sx={{ py: 1 }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={40} sx={{ bgcolor: 'rgba(90,120,180,0.12)' }} />)}</Box>
            ) : timeline.length === 0 ? (
              <Typography sx={{ py: 2, textAlign: 'center', fontSize: 13, color: '#6f83a8' }}>
                No identity events are recorded for this document.
              </Typography>
            ) : (
              <Box sx={{ position: 'relative', pl: 3 }}>
                <Box aria-hidden="true" sx={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 1, background: 'linear-gradient(180deg, rgba(90,140,220,0.5), rgba(90,140,220,0.1))' }} />
                {timeline.map((t, i) => (
                  <Box key={t.title + i} sx={{ position: 'relative', pb: i === timeline.length - 1 ? 0 : 2.4 }}>
                    <Box className="iv-dot" sx={{ position: 'absolute', left: -27, top: 4, width: 7, height: 7, borderRadius: '50%', bgcolor: i === timeline.length - 1 ? '#34d399' : '#38bdf8', boxShadow: '0 0 8px rgba(56,189,248,0.6)', animation: 'ivPulse 2.6s ease-in-out infinite' }} aria-hidden="true" />
                    <Typography sx={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.14em', color: '#8b9cc0' }}>{t.title}</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, mt: 0.2 }}>{t.text}</Typography>
                    {t.at && <Typography sx={{ fontFamily: MONO, fontSize: 9.5, color: '#5d6f95', mt: 0.3 }}>{t.at}</Typography>}
                  </Box>
                ))}
              </Box>
            )}
          </Panel>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.4 }}>
            {/* VERIFY */}
            <Panel className="iv-rise" sx={{ animation: 'ivRise .55s ease .3s both' }}>
              <SectionTitle kicker="TRUST" title="VERIFY YOUR IDENTITY" />
              <Typography sx={{ fontSize: 13, color: '#8b9cc0', lineHeight: 1.55 }}>
                Verify that your cryptographic identity is valid and associated with your registered record.
              </Typography>
              {verifying && (
                <Box sx={{ mt: 1.6 }} aria-live="polite">
                  {VERIFY_STAGES.map((s, i) => (
                    <Typography key={s} sx={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.12em', color: i < verifyStage ? '#5d6f95' : i === verifyStage ? '#5ecbff' : '#3a4a68', py: 0.25 }}>
                      {s}…{i < verifyStage ? ' ✓' : ''}
                    </Typography>
                  ))}
                </Box>
              )}
              {verifyResult === true && !verifying && (
                <Alert severity="success" sx={{ mt: 1.6, bgcolor: 'rgba(16,42,34,0.4)', border: '1px solid rgba(52,211,153,0.4)', '& .MuiAlert-message': { color: '#86efac' } }}>
                  ✓ IDENTITY VERIFIED — the ledger resolved an active identity document.
                </Alert>
              )}
              {verifyResult === false && !verifying && (
                <Alert severity="error" sx={{ mt: 1.6, bgcolor: 'rgba(150,40,40,0.14)', border: '1px solid rgba(220,90,90,0.4)' }}>
                  Verification failed — the identity could not be resolved. Try again.
                </Alert>
              )}
              <Button
                fullWidth
                variant="contained"
                disabled={verifying || docQuery.isLoading}
                onClick={verify}
                sx={{ mt: 2, py: 1.2, fontWeight: 700, letterSpacing: '0.08em', fontSize: 13, background: 'linear-gradient(90deg, #4cc2ff, #38a6ff)', color: '#051018' }}
              >
                {verifying ? VERIFY_STAGES[verifyStage] + '…' : 'VERIFY IDENTITY'}
              </Button>
            </Panel>

            {/* SECURITY */}
            <Panel className="iv-rise" sx={{ animation: 'ivRise .55s ease .35s both' }}>
              <SectionTitle kicker="PROTECTION" title="SECURITY" action={<Button size="small" component={RouterLink} to="/audit" sx={{ fontSize: 12, color: '#5ecbff' }}>Open Security Center</Button>} />
              {[
                ['Last verification', fmtStamp(doc.resolvedAt) || '—'],
                ['Active sessions', '1 (this device)'],
                ['Authentication method', 'DID + password'],
                ['Recent security event', secQuery.isLoading ? 'checking…' : secQuery.isError ? 'data unavailable' : secEvents.length ? `${secEvents.length} flagged event${secEvents.length > 1 ? 's' : ''}` : 'none flagged']
              ].map(([k, v]) => (
                <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid rgba(90,120,180,0.10)' }}>
                  <Typography sx={{ fontSize: 12.5, color: '#8b9cc0' }}>{k}</Typography>
                  <Typography sx={{ fontFamily: MONO, fontSize: 11, color: '#e8eefb' }}>{v}</Typography>
                </Box>
              ))}
            </Panel>
          </Box>
        </Box>

        {/* ── IDENTITY CONTROL + QR ── */}
        <Box id="iv-controls" className="iv-rise" sx={{ animation: 'ivRise .55s ease .4s both', mt: 4, mb: 3 }}>
          <SectionTitle kicker="OWNERSHIP" title="IDENTITY CONTROL" />
          <Box sx={{ display: 'grid', gap: 2.4, gridTemplateColumns: { xs: '1fr', lg: '1.4fr 1fr' } }}>
            <Panel>
              {[
                { label: 'Copy Digital ID', desc: 'Copy the public DID to your clipboard.', run: () => copy(did, 'ctrl'), done: copied === 'ctrl' },
                { label: 'Export Identity Information', desc: 'Download the public identity document as JSON.', run: exportIdentity },
                { label: 'View Public Key', desc: 'Show the registered public key (never the private key).', run: () => setShowPublicKey(true) },
                { label: 'Manage Authentication', desc: 'Sessions and notifications for your account.', run: () => { window.location.assign('/notifications'); } },
                { label: 'Security Settings', desc: 'Audit trail and flagged security events.', run: () => { window.location.assign('/audit'); } }
              ].map((a) => (
                <Box key={a.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.6, py: 1.4, borderBottom: '1px solid rgba(90,120,180,0.10)', flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 220 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{a.label}</Typography>
                    <Typography sx={{ fontSize: 12, color: '#6f83a8', mt: 0.2 }}>{a.desc}</Typography>
                  </Box>
                  <Button size="small" variant="outlined" onClick={a.run} sx={{ fontSize: 12, borderColor: 'rgba(90,140,220,0.4)', color: '#c6d5ef', minWidth: 96 }}>
                    {a.done ? 'COPIED ✓' : 'Open'}
                  </Button>
                </Box>
              ))}
            </Panel>

            <Panel sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <Typography sx={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.22em', color: '#5d6f95' }}>IDENTITY QR</Typography>
              {showQr && qr ? (
                <Box sx={{ mt: 2, p: 1.6, bgcolor: '#fff', borderRadius: 1.5 }} aria-label="QR code of your public digital identity">
                  <svg width="180" height="180" viewBox={`0 0 ${qr.size} ${qr.size}`} role="img" aria-label="QR code encoding your public DID">
                    <path d={qr.d} fill="#05070D" />
                  </svg>
                </Box>
              ) : (
                <Box sx={{
                  mt: 2, width: 180, height: 180, borderRadius: 1.5, border: '1px dashed rgba(90,140,220,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Typography sx={{ fontFamily: MONO, fontSize: 9.5, color: '#48587a', px: 2 }}>QR PREVIEW<br />OFF</Typography>
                </Box>
              )}
              <Typography sx={{ fontSize: 11.5, color: '#6f83a8', mt: 2, maxWidth: 240 }}>
                Share only your public identity information.
              </Typography>
              <Button
                variant="outlined"
                onClick={() => setShowQr((v) => !v)}
                sx={{ mt: 1.6, fontSize: 12.5, borderColor: 'rgba(90,140,220,0.4)', color: '#c6d5ef' }}
              >
                {showQr ? 'Hide QR' : 'Generate QR'}
              </Button>
            </Panel>
          </Box>
        </Box>
      </Box>

      {/* VIEW DETAILS dialog — raw public DID document */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} fullWidth maxWidth="sm"
        PaperProps={{ sx: { bgcolor: '#0b1120', border: '1px solid rgba(90,120,180,0.3)', color: '#e8eefb' } }}>
        <DialogTitle>DID document (public)</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#6f83a8', fontSize: 12, mb: 1 }}>
            The public identity record. Secrets are never part of this document.
          </DialogContentText>
          <pre style={{ margin: 0, maxHeight: 320, overflow: 'auto', fontSize: 11.5, color: '#b9d4f5' }}>
            {JSON.stringify(didDoc || doc, null, 2)}
          </pre>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)} sx={{ color: '#8b9cc0' }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* PUBLIC KEY dialog */}
      <Dialog open={showPublicKey} onClose={() => setShowPublicKey(false)} fullWidth maxWidth="sm"
        PaperProps={{ sx: { bgcolor: '#0b1120', border: '1px solid rgba(90,120,180,0.3)', color: '#e8eefb' } }}>
        <DialogTitle>Registered public key</DialogTitle>
        <DialogContent>
          {publicKey ? (
            <Typography sx={{ fontFamily: MONO, fontSize: 11.5, color: '#b9d4f5', wordBreak: 'break-all' }}>
              {publicKey}
            </Typography>
          ) : (
            <DialogContentText sx={{ color: '#8b9cc0', fontSize: 13 }}>
              No public key material is recorded for this identity in this deployment.
            </DialogContentText>
          )}
          <DialogContentText sx={{ color: '#6f83a8', fontSize: 11.5, mt: 1.6 }}>
            The private key is never stored on any server and is never shown.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          {publicKey && (
            <Button onClick={() => copy(publicKey, 'pk')} sx={{ color: '#5ecbff' }}>{copied === 'pk' ? 'COPIED ✓' : 'Copy key'}</Button>
          )}
          <Button onClick={() => setShowPublicKey(false)} sx={{ color: '#8b9cc0' }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* EDIT dialog — honest about immutability */}
      <Dialog open={editOpen} onClose={() => { setEditOpen(false); setEditNotice(false); }} fullWidth maxWidth="xs"
        PaperProps={{ sx: { bgcolor: '#0b1120', border: '1px solid rgba(90,120,180,0.3)', color: '#e8eefb' } }}>
        <DialogTitle>Edit identity</DialogTitle>
        <DialogContent>
          {editNotice && (
            <Alert severity="info" sx={{ mb: 1.6, bgcolor: 'rgba(40,90,150,0.12)', border: '1px solid rgba(80,150,230,0.35)' }}>
              Identity attributes are immutable on the ledger in this deployment — name, organization and staff number cannot be changed after creation.
            </Alert>
          )}
          <DialogContentText sx={{ color: '#8b9cc0', fontSize: 13 }}>
            Your identity attributes were fixed when the identity was created. If a record is wrong, your administrator can issue a corrected identity and retire this one.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditNotice(true)} variant="outlined" sx={{ color: '#c6d5ef', borderColor: 'rgba(90,140,220,0.4)' }}>Request change</Button>
          <Button onClick={() => { setEditOpen(false); setEditNotice(false); }} sx={{ color: '#8b9cc0' }}>Close</Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}
