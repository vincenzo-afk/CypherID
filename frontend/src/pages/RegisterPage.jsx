import { useMemo, useState } from 'react';
import { Alert, Box, Button, GlobalStyles, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import DataStreams from '../components/vault/DataStreams.jsx';
import VaultField from '../components/vault/VaultField.jsx';
import GenesisCore from '../components/vault/GenesisCore.jsx';
import Logo from '../components/Logo.jsx';

// Identity Genesis — "Create Digital ID" as an identity-generation terminal,
// pairing with the vault login. Left 55%: genesis visualization that assembles
// as the form fills. Right 45%: the registration panel.
// API contract unchanged: api.createDID({organization, department?, kycData{name, employeeId}})
// → { did, temporaryPassword }. DID/one-time password shown only from the real response.

const GLOBAL_CSS = `
@keyframes genesisEnter {
  0% { opacity: 0; transform: translateY(14px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes genesisBarFill { 0% { width: 0; } 100% { width: var(--bar-w, 100%); } }
@keyframes genesisOkPulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .genesis-anim-in { animation: none !important; }
  .genesis-bar-fill { animation: none !important; }
  .genesis-ok-dot { animation: none !important; }
}
`;

const STAGES = [
  { label: 'GENERATING KEYPAIR', frac: 0.8 },
  { label: 'CREATING DIGITAL ID', frac: 1.0 },
  { label: 'RECORDING IDENTITY', frac: 1.0 }
];

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const FOOTER_ITEMS = [
  { icon: '🔐', label: 'Cryptographically generated' },
  { icon: '⛓', label: 'Tamper-evident record' },
  { icon: '🛡', label: 'User-controlled identity' }
];

const CTA_BTN = {
  position: 'relative', overflow: 'hidden', mt: 3.2, py: 1.5, borderRadius: 1,
  fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', color: '#051018',
  background: 'linear-gradient(90deg, #4cc2ff 0%, #38a6ff 100%)',
  boxShadow: '0 6px 24px rgba(56,166,255,0.28)',
  '&:hover': { background: 'linear-gradient(90deg, #63ccff 0%, #4cb2ff 100%)', boxShadow: '0 8px 30px rgba(56,166,255,0.4)' },
  '&:disabled': { color: 'rgba(5,16,24,0.55)' },
  transition: 'box-shadow .2s'
};

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', employeeId: '', organization: '', department: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // form completion drives the genesis visualization (0..1)
  const progress = useMemo(() => {
    const filled = [form.name.trim(), form.employeeId.trim(), form.organization.trim(), form.department.trim()]
      .filter(Boolean).length;
    return Math.min(1, filled / 3 + (form.department.trim() ? 0 : 0)); // required 3 fields; department is bonus
  }, [form]);

  const allValid = Boolean(form.name.trim() && form.employeeId.trim() && form.organization.trim());

  const copy = async (text, tag) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      setTimeout(() => setCopied(''), 1600);
    } catch { /* clipboard unavailable — ignore */ }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setDone(false);
    if (!allValid) {
      setError('Please fill in your name, staff number and organization.');
      return;
    }
    setBusy(true);
    setStage(0);
    // staged generation sequence while the real request runs — never fakes
    // the outcome: "recorded" state comes only from the backend response
    const t1 = setTimeout(() => setStage(1), 700);
    const t2 = setTimeout(() => setStage(2), 1500);
    try {
      const res = await api.createDID({
        organization: form.organization.trim(),
        department: form.department.trim() || undefined,
        kycData: { name: form.name.trim(), employeeId: form.employeeId.trim() }
      });
      setResult(res);
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.message || err?.friendlyMessage || 'We could not create your ID. Please try again.');
    } finally {
      clearTimeout(t1); clearTimeout(t2);
      setBusy(false);
    }
  };

  return (
    <Box>
      <GlobalStyles styles={GLOBAL_CSS} />
      <DataStreams />

      {/* ============ transparent dark header: logo + login link ============ */}
      <Box component="header" sx={{
        position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', px: { xs: 2.5, sm: 5, md: 6 }, py: 2
      }}>
        <Link to="/home" aria-label="CypherID home" style={{ textDecoration: 'none', display: 'inline-flex' }}>
          <Logo size={28} variant="light" wordSize={18} />
        </Link>
        <Typography sx={{ fontSize: 13, color: '#8b9cc0', display: { xs: 'none', sm: 'block' } }}>
          Already have an identity?{' '}
          <Link to="/login" style={{ color: '#5ecbff', fontWeight: 700, textDecoration: 'none' }}>Log in</Link>
        </Typography>
        <Link to="/login" style={{ textDecoration: 'none', display: { sm: 'none' } }}>
          <Button size="small" variant="outlined" sx={{ color: '#c6d5ef', borderColor: 'rgba(90,130,200,0.35)' }}>Log in</Button>
        </Link>
      </Box>

      <Box sx={{
        position: 'relative', zIndex: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' },
        color: '#e8eefb', alignItems: { xs: 'center', md: 'stretch' }
      }}>

        {/* ================= LEFT 55% — identity genesis ================= */}
        <Box sx={{
          flexBasis: { md: '55%' }, display: 'flex', flexDirection: 'column', alignItems: { xs: 'center', md: 'flex-start' },
          px: { xs: 3, sm: 6, md: 8 }, pt: { xs: 2, md: 4 }, pb: { xs: 3, md: 5 }, order: { xs: 1, md: 1 }
        }}>
          <Box className="genesis-anim-in" sx={{ animation: 'genesisEnter .6s ease both', maxWidth: 470 }}>
            <Typography sx={{ fontFamily: MONO, fontSize: 13, letterSpacing: '0.55em', color: '#5ecbff', userSelect: 'none' }}>
              CYPHERID
            </Typography>
            <Typography sx={{ fontSize: { xs: 30, md: 40 }, fontWeight: 800, lineHeight: 1.12, mt: 2, letterSpacing: '-0.02em' }}>
              Create an identity
              <Box component="span" sx={{ display: 'block', color: '#7da9e8' }}>that belongs to you.</Box>
            </Typography>
            <Typography sx={{ mt: 2, color: '#8b9cc0', fontSize: 15, maxWidth: 430 }}>
              Your digital identity is generated, secured, and recorded as a verifiable cryptographic identity.
            </Typography>
          </Box>

          {/* genesis visualization — reacts to form completion */}
          <Box sx={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            my: { xs: 2, md: 0 }, mt: { xs: 3, md: 2 }
          }}>
            <Box className="genesis-anim-in" sx={{ animation: 'genesisEnter .8s ease .15s both', display: 'flex', justifyContent: 'center' }}>
              <GenesisCore size={400} progress={progress} complete={allValid} />
            </Box>
          </Box>
        </Box>

        {/* hairline divider */}
        <Box sx={{ display: { xs: 'none', md: 'block' }, width: '1px', my: 6, background: 'linear-gradient(180deg, transparent, rgba(90,140,220,0.35), transparent)' }} />

        {/* ================= RIGHT 45% — registration panel ================= */}
        <Box sx={{
          flexBasis: { md: '45%' }, display: 'flex', flexDirection: 'column',
          px: { xs: 3, sm: 6, md: 6 }, py: { xs: 3, md: 4 },
          bgcolor: 'rgba(6,9,17,0.55)', borderLeft: { md: '1px solid rgba(90,120,180,0.16)' },
          backdropFilter: 'blur(2px)', order: { xs: 2, md: 2 }
        }}>
          <Box className="genesis-anim-in" sx={{ animation: 'genesisEnter .6s ease .1s both', maxWidth: 470, width: '100%', mx: 'auto', display: 'flex', flexDirection: 'column' }}>
            <Typography sx={{ fontSize: 21, fontWeight: 800, letterSpacing: '0.02em', color: '#eef4ff' }}>
              Create your digital identity
            </Typography>
            <Typography sx={{ mt: 1, color: '#8b9cc0', fontSize: 14 }}>
              Tell us who you are. We&apos;ll generate a unique identity and securely record it.
            </Typography>

            <Box component="form" onSubmit={submit} noValidate sx={{ mt: 3.2 }}>
              <VaultField
                name="name" label="FULL NAME"
                placeholder="Enter your full name"
                value={form.name} onChange={set('name')}
                autoComplete="name" required
              />
              <VaultField
                name="employeeId" label="STAFF NUMBER"
                placeholder="Enter your staff number"
                helperText="The identifier provided by your organization."
                value={form.employeeId} onChange={set('employeeId')}
                autoComplete="off" required
              />
              <VaultField
                name="organization" label="ORGANIZATION"
                placeholder="Enter organization"
                helperText="For example: DRDO, BEL, or your organization."
                value={form.organization} onChange={set('organization')}
                autoComplete="organization" required
              />
              <VaultField
                name="department" label="DEPARTMENT"
                placeholder="Select department"
                helperText="Optional."
                value={form.department} onChange={set('department')}
                autoComplete="organization-title"
              />

              {/* identity preview — no real DID until created */}
              <Box sx={{
                mt: 2.4, border: '1px solid rgba(90,120,180,0.18)', borderRadius: 1,
                bgcolor: 'rgba(10,16,30,0.5)', px: 2, py: 1.6
              }} aria-label="Identity preview">
                <Typography sx={{
                  fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.22em', color: '#5d6f95'
                }}>
                  IDENTITY PREVIEW
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mt: 1 }}>
                  <Typography sx={{ fontFamily: MONO, fontSize: 10.5, color: '#6f83a8' }}>DID</Typography>
                  <Typography sx={{ fontFamily: MONO, fontSize: 12.5, color: '#b9d4f5', wordBreak: 'break-all' }}>
                    did:cypherid:••••••••••
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mt: 0.7 }}>
                  <Typography sx={{ fontFamily: MONO, fontSize: 10.5, color: '#6f83a8' }}>STATUS</Typography>
                  <Typography sx={{
                    fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em',
                    color: done ? '#34d399' : busy ? '#5ecbff' : '#6f83a8'
                  }}>
                    {done ? 'RECORDED ✓' : busy ? 'GENERATING…' : 'WAITING FOR CREATION'}
                  </Typography>
                </Box>
              </Box>

              {/* staged generation sequence */}
              {busy && (
                <Box sx={{ mt: 2.4 }} aria-live="polite">
                  {STAGES.map((s, i) => (
                    <Box key={s.label} sx={{ mb: 1.1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <Typography sx={{
                          fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.12em',
                          color: i < stage ? '#6f83a8' : i === stage ? '#5ecbff' : '#48587a'
                        }}>
                          {s.label}{i <= stage ? '...' : ''}
                        </Typography>
                        <Typography sx={{ fontFamily: MONO, fontSize: 10, color: i < stage ? '#6f83a8' : i === stage ? '#5ecbff' : '#48587a' }}>
                          {i < stage ? '100%' : i === stage ? `${Math.round(s.frac * 100)}%` : '0%'}
                        </Typography>
                      </Box>
                      <Box sx={{ height: 3, bgcolor: 'rgba(90,120,180,0.14)', borderRadius: 1, mt: 0.5, overflow: 'hidden' }}>
                        <Box
                          className="genesis-bar-fill"
                          sx={{
                            height: '100%', borderRadius: 1,
                            background: 'linear-gradient(90deg, #38a6ff, #4cc2ff)',
                            '--bar-w': i < stage ? '100%' : i === stage ? `${s.frac * 100}%` : '0%',
                            animation: i <= stage ? 'genesisBarFill .9s ease-out forwards' : 'none',
                            width: i < stage ? '100%' : i === stage ? `${s.frac * 100}%` : '0%'
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}

              {done && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }} aria-live="polite">
                  <Box className="genesis-ok-dot" sx={{
                    width: 7, height: 7, borderRadius: '50%', bgcolor: '#34d399',
                    boxShadow: '0 0 8px rgba(52,211,153,0.7)', animation: 'genesisOkPulse 2s ease-in-out infinite'
                  }} aria-hidden="true" />
                  <Typography sx={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.14em', color: '#34d399' }}>
                    IDENTITY CREATED ✓
                  </Typography>
                </Box>
              )}

              {error && (
                <Alert role="alert" severity="error" sx={{
                  mt: 2, borderRadius: 1, fontSize: 13,
                  bgcolor: 'rgba(150,40,40,0.14)', border: '1px solid rgba(220,90,90,0.4)',
                  '& .MuiAlert-message': { color: '#ffb4b4' }, '& .MuiAlert-icon': { color: '#ff8080' }
                }}>{error}</Alert>
              )}

              <Button type="submit" fullWidth disabled={busy} sx={CTA_BTN}>
                {busy ? `${STAGES[stage].label}...` : 'CREATE MY DIGITAL ID  →'}
              </Button>

              <Typography sx={{ textAlign: 'center', mt: 2.2, fontSize: 13.5, color: '#8b9cc0' }}>
                Already have an identity?{' '}
                <Link to="/login" style={{ color: '#5ecbff', fontWeight: 700, textDecoration: 'none' }}>Log in</Link>
              </Typography>

              {/* revealed credentials — real backend response only */}
              {result && (
                <Box sx={{
                  mt: 3, border: '1px solid rgba(52,211,153,0.35)', borderRadius: 1,
                  bgcolor: 'rgba(16,42,34,0.25)', px: 2.2, py: 2
                }} aria-live="polite">
                  <Typography sx={{
                    fontFamily: MONO, fontSize: 10, letterSpacing: '0.22em', color: '#34d399'
                  }}>
                    YOUR DIGITAL ID
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Typography sx={{
                      fontFamily: MONO, fontSize: 13, color: '#eef4ff', wordBreak: 'break-all', flex: 1
                    }}>
                      {result.did}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => copy(result.did, 'did')}
                      sx={{ fontFamily: MONO, fontSize: 10.5, color: '#5ecbff', minWidth: 0, px: 1.2 }}
                    >
                      {copied === 'did' ? 'COPIED ✓' : 'COPY ID'}
                    </Button>
                  </Box>
                  {result.temporaryPassword && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.4 }}>
                      <Typography sx={{ fontFamily: MONO, fontSize: 10.5, color: '#6f83a8', minWidth: 118 }}>
                        ONE-TIME PASSWORD
                      </Typography>
                      <Typography sx={{ fontFamily: MONO, fontSize: 12.5, color: '#ffd88a', wordBreak: 'break-all', flex: 1 }}>
                        {result.temporaryPassword}
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => copy(result.temporaryPassword, 'pw')}
                        sx={{ fontFamily: MONO, fontSize: 10.5, color: '#5ecbff', minWidth: 0, px: 1.2 }}
                      >
                        {copied === 'pw' ? 'COPIED ✓' : 'COPY'}
                      </Button>
                    </Box>
                  )}
                  <Typography sx={{ fontSize: 12, color: '#ffb4b4', mt: 1.8, lineHeight: 1.5 }}>
                    Save your Digital ID and one-time password securely. This information may be required to access your identity.
                  </Typography>
                </Box>
              )}

              {/* security footer */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1.2, sm: 2.2 }, mt: 3.4, pt: 2, borderTop: '1px solid rgba(90,120,180,0.14)' }}>
                {FOOTER_ITEMS.map((f) => (
                  <Typography key={f.label} sx={{ fontSize: 11.5, color: '#6f83a8', display: 'flex', alignItems: 'center', gap: 0.7 }}>
                    <span aria-hidden="true">{f.icon}</span> {f.label}
                  </Typography>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
