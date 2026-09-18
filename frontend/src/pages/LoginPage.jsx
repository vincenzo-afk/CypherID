import { useRef, useState } from 'react';
import { Alert, Box, Button, Checkbox, Divider, FormControlLabel, GlobalStyles, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import IdentityCore from '../components/vault/IdentityCore.jsx';
import DataStreams from '../components/vault/DataStreams.jsx';
import VaultField from '../components/vault/VaultField.jsx';
import TelemetryBar from '../components/vault/TelemetryBar.jsx';

// Digital Identity Vault — cinematic login experience.
// Left 55%: identity-core visualization. Right 45%: integrated vault panel
// (darkened backdrop + hairline divider, NOT a floating glass card).
// Auth logic unchanged: useAuth().login → /wallet. No new dependencies.

const GLOBAL_CSS = `
@keyframes vaultPulseDot {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
@keyframes vaultBtnCheck {
  0% { transform: scaleX(0); opacity: 0; }
  40% { transform: scaleX(1); opacity: 1; }
  100% { transform: scaleX(1); opacity: 0; }
}
@keyframes vaultDataSweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
@keyframes vaultEnter {
  0% { opacity: 0; transform: translateY(14px); }
  100% { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .vault-btn-sweep, .vault-sweep-overlay { animation: none !important; display: none !important; }
  .vault-anim-in { animation: none !important; }
}
`;

const Stages = ['ESTABLISHING SECURE CHANNEL', 'VERIFYING IDENTITY PROOF', 'GRANTING VAULT ACCESS'];

// Remember-this-device: after one successful login with the box checked, the
// vault keeps the real credentials in localStorage (device-local only — never
// in the repo, never sent anywhere but the normal login request) and pre-fills
// both slots on every visit: the actual DID and the actual password (rendered
// masked). Unchecking + logging in forgets the device and slots start empty.
const REMEMBER_KEY = 'cypherid.vault.rememberedCredentials';

const loadRemembered = () => {
  try {
    const raw = window.localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.did === 'string' && typeof parsed.password === 'string'
      && parsed.did && parsed.password) {
      return parsed;
    }
  } catch {
    /* corrupted or unavailable storage — start empty */
  }
  return null;
};

const VAULT_BTN = {
  position: 'relative', overflow: 'hidden', mt: 3.2, py: 1.5, borderRadius: 1,
  fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', color: '#051018',
  background: 'linear-gradient(90deg, #4cc2ff 0%, #38a6ff 100%)',
  boxShadow: '0 6px 24px rgba(56,166,255,0.28)',
  '&:hover': { background: 'linear-gradient(90deg, #63ccff 0%, #4cb2ff 100%)', boxShadow: '0 8px 30px rgba(56,166,255,0.4)' },
  '&:disabled': { color: 'rgba(5,16,24,0.55)' },
  transition: 'box-shadow .2s'
};

export default function LoginFormPage() {
  const [remembered] = useState(loadRemembered);
  const [did, setDid] = useState(remembered ? remembered.did : '');
  const [password, setPassword] = useState(remembered ? remembered.password : '');
  const [remember, setRemember] = useState(Boolean(remembered));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [sweep, setSweep] = useState(false);
  const [notice, setNotice] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const didRef = useRef(null);
  const pwRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setNotice('');
    if (!did.trim()) { setError('Digital ID is required.'); didRef.current?.focus(); return; }
    if (!password) { setError('Password is required.'); pwRef.current?.focus(); return; }
    setBusy(true);
    setStage(0);
    // staged security-check while the real request runs
    const t1 = setTimeout(() => setStage(1), 420);
    const t2 = setTimeout(() => setStage(2), 900);
    try {
      await login(did.trim(), password);
      // Remember-this-device: store/clear locally after a successful login.
      try {
        if (remember) {
          window.localStorage.setItem(REMEMBER_KEY, JSON.stringify({ did: did.trim(), password }));
        } else {
          window.localStorage.removeItem(REMEMBER_KEY);
        }
      } catch {
        /* storage unavailable — continue with the normal login flow */
      }
      setSweep(true); // encrypted-data transition
      setTimeout(() => navigate('/wallet'), 480);
    } catch (err) {
      // Honest failure reasons: wrong credentials vs backend/network outage —
      // the interceptor computes a friendlyMessage for every error shape.
      const status = err?.response?.status;
      if (status === 401) {
        setError('Authentication failed. Verify your digital ID and password.');
      } else if (status === 403) {
        setError('This identity cannot be authenticated — it may be revoked or suspended.');
      } else {
        setError(err?.friendlyMessage || 'The vault could not be reached. Please try again in a moment.');
      }
      setBusy(false);
    } finally {
      clearTimeout(t1); clearTimeout(t2);
    }
  };

  const notEnabled = (label) => {
    setNotice(`${label} is not enabled on this deployment — use your digital ID and password.`);
  };

  return (
    <Box>
      <GlobalStyles styles={GLOBAL_CSS} />
      <DataStreams />

      {/* encrypted-data success sweep */}
      {sweep && (
        <Box className="vault-sweep-overlay" aria-hidden="true" sx={{
          position: 'fixed', inset: 0, zIndex: 50, pointerEvents: 'none',
          background: 'linear-gradient(90deg, transparent 0%, rgba(56,166,255,0.16) 45%, rgba(5,7,13,0.98) 50%, rgba(56,166,255,0.16) 55%, transparent 100%)',
          animation: 'vaultDataSweep 0.55s ease-in forwards'
        }} />
      )}

      <Box sx={{
        position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex',
        flexDirection: { xs: 'column', md: 'row' }, color: '#e8eefb'
      }}>

        {/* ================= LEFT 55% — identity side ================= */}
        <Box sx={{
          flexBasis: { md: '55%' }, display: 'flex', flexDirection: 'column',
          px: { xs: 3, sm: 6, md: 8 }, pt: { xs: 4, md: 7 }, pb: { xs: 2, md: 6 },
          position: 'relative', overflow: 'hidden'
        }}>
          <Box className="vault-anim-in" sx={{ animation: 'vaultEnter .6s ease both' }}>
            <Typography sx={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 13, letterSpacing: '0.55em', color: '#5ecbff', userSelect: 'none'
            }}>
              CYPHERID
            </Typography>
            <Typography sx={{ fontSize: { xs: 34, md: 46 }, fontWeight: 800, lineHeight: 1.08, mt: 2.5, letterSpacing: '-0.02em' }}>
              Your identity.
              <Box component="span" sx={{ display: 'block', color: '#7da9e8' }}>Beyond passwords.</Box>
            </Typography>
            <Typography sx={{ mt: 2, color: '#8b9cc0', fontSize: 15.5, maxWidth: 430 }}>
              One cryptographic identity. One private vault. Complete control.
            </Typography>
          </Box>

          {/* identity core visualization */}
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', md: 'flex-start' }, my: { xs: 2, md: 0 } }}>
            <Box className="vault-anim-in" sx={{ animation: 'vaultEnter .8s ease .15s both', position: 'relative' }}>
              <IdentityCore size={400} />
              <Typography
                sx={{
                  position: 'absolute', left: '50%', bottom: 6, transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 1.1
                }}
              >
                <Box component="span" sx={{
                  width: 6, height: 6, borderRadius: '50%', bgcolor: '#34d399',
                  boxShadow: '0 0 8px rgba(52,211,153,0.7)', animation: 'vaultPulseDot 2.2s ease-in-out infinite'
                }} aria-hidden="true" />
                <Typography component="span" sx={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: 10, letterSpacing: '0.18em', color: '#6f83a8'
                }}>
                  IDENTITY NETWORK&nbsp;·&nbsp;<span style={{ color: '#34d399' }}>OPERATIONAL</span>
                </Typography>
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* hairline divider between halves */}
        <Box sx={{ display: { xs: 'none', md: 'block' }, width: '1px', my: 6, background: 'linear-gradient(180deg, transparent, rgba(90,140,220,0.35), transparent)' }} />

        {/* ================= RIGHT 45% — vault panel ================= */}
        <Box sx={{
          flexBasis: { md: '45%' }, display: 'flex', flexDirection: 'column',
          px: { xs: 3, sm: 6, md: 6 }, py: { xs: 3, md: 7 },
          bgcolor: 'rgba(6,9,17,0.55)', borderLeft: { md: '1px solid rgba(90,120,180,0.16)' },
          backdropFilter: 'blur(2px)'
        }}>
          <Box className="vault-anim-in" sx={{ animation: 'vaultEnter .6s ease .1s both', maxWidth: 460, width: '100%', mx: 'auto', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <Typography sx={{
              fontSize: 22, fontWeight: 800, letterSpacing: '0.12em', color: '#eef4ff'
            }}>
              ENTER YOUR VAULT
            </Typography>
            <Typography sx={{ mt: 1, color: '#8b9cc0', fontSize: 14 }}>
              Authenticate your digital identity to continue.
            </Typography>

            <Box component="form" onSubmit={submit} noValidate sx={{ mt: 4 }}>
              <VaultField
                name="did" label="DIGITAL ID" sublabel="DID:CYPHERID"
                mono
                value={did} onChange={(e) => setDid(e.target.value)}
                autoComplete="username" required inputRef={didRef}
              />
              <VaultField
                name="password" label="PASSWORD" sublabel="AES-256"
                type="password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" required inputRef={pwRef}
              />

              <FormControlLabel
                sx={{ mt: 0.4, mb: 0.5, '& .MuiTypography-root': { fontSize: 13, color: '#8b9cc0' } }}
                control={(
                  <Checkbox
                    size="small"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    sx={{ color: '#5d6f95', '&.Mui-checked': { color: '#38bdf8' }, p: 0.8 }}
                  />
                )}
                label="Remember this device"
              />

              {error && (
                <Alert role="alert" severity="error" sx={{
                  mt: 1, mb: 1, borderRadius: 1, fontSize: 13,
                  bgcolor: 'rgba(150,40,40,0.14)', border: '1px solid rgba(220,90,90,0.4)',
                  '& .MuiAlert-message': { color: '#ffb4b4' }, '& .MuiAlert-icon': { color: '#ff8080' }
                }}>{error}</Alert>
              )}
              {notice && (
                <Alert severity="info" sx={{
                  mt: 1, mb: 1, borderRadius: 1, fontSize: 13,
                  bgcolor: 'rgba(40,90,150,0.12)', border: '1px solid rgba(80,150,230,0.35)',
                  '& .MuiAlert-message': { color: '#b9d4f5' }, '& .MuiAlert-icon': { color: '#6fb1ff' }
                }}>{notice}</Alert>
              )}

              <Button type="submit" fullWidth disabled={busy} sx={VAULT_BTN}>
                {/* security-check sweep before submission state */}
                {busy && <Box className="vault-btn-sweep" aria-hidden="true" sx={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                  animation: 'vaultBtnCheck 1.1s ease-in-out infinite'
                }} />}
                {busy ? `${Stages[stage]}…` : 'ENTER SECURELY →'}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 1.6 }}>
                <Button
                  color="inherit" size="small"
                  onClick={() => notEnabled('Password recovery')}
                  sx={{ fontSize: 12.5, color: '#6f83a8', '&:hover': { color: '#9fc1e8', bgcolor: 'transparent' } }}
                >
                  Forgot password?
                </Button>
              </Box>

              <Divider sx={{ my: 3 }}>
                <Typography sx={{
                  px: 1.5, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: 9.5, letterSpacing: '0.22em', color: '#5d6f95'
                }}>
                  OR CONTINUE WITH
                </Typography>
              </Divider>

              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button
                  fullWidth variant="outlined"
                  onClick={() => notEnabled('Passkey authentication')}
                  sx={{
                    py: 1.1, borderRadius: 1, borderColor: 'rgba(90,130,200,0.35)', color: '#c6d5ef',
                    fontSize: 13, fontWeight: 600,
                    '&:hover': { borderColor: 'rgba(120,170,255,0.6)', bgcolor: 'rgba(40,90,160,0.08)' }
                  }}
                >
                  ⟢ Passkey
                </Button>
                <Button
                  fullWidth variant="outlined"
                  onClick={() => notEnabled('Biometric authentication')}
                  sx={{
                    py: 1.1, borderRadius: 1, borderColor: 'rgba(90,130,200,0.35)', color: '#c6d5ef',
                    fontSize: 13, fontWeight: 600,
                    '&:hover': { borderColor: 'rgba(120,170,255,0.6)', bgcolor: 'rgba(40,90,160,0.08)' }
                  }}
                >
                  ◉ Biometric
                </Button>
              </Box>

              <Typography sx={{ textAlign: 'center', mt: 3, fontSize: 13.5, color: '#8b9cc0' }}>
                New to CypherID?{' '}
                <Link to="/register" style={{ color: '#5ecbff', fontWeight: 700, textDecoration: 'none' }}>
                  Create your identity →
                </Link>
              </Typography>

              {/* Secondary administrator entry — navigation only; privileges are
                  decided entirely by backend authentication/authorization. */}
              <Box sx={{
                mt: 2.6, pt: 2, borderTop: '1px solid rgba(90,120,180,0.14)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 1.5, flexWrap: 'wrap'
              }}>
                <Typography sx={{ fontSize: 12.5, color: '#6f83a8' }}>
                  Administrator?
                </Typography>
                <Button
                  component={Link}
                  to="/admin/login"
                  size="small"
                  startIcon={(
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
                      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 2.5 4.5 5.4v5.3c0 4.6 3.2 8.4 7.5 10.8 4.3-2.4 7.5-6.2 7.5-10.8V5.4L12 2.5Z" />
                      <path d="M12 8.2v3.6" />
                      <circle cx="12" cy="14.6" r="0.55" fill="currentColor" stroke="none" />
                    </svg>
                  )}
                  sx={{
                    py: 0.7, px: 1.6, borderRadius: 1, fontSize: 11, fontWeight: 700,
                    letterSpacing: '0.12em', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    color: '#8fa3c8', border: '1px solid rgba(90,120,180,0.3)', bgcolor: 'transparent',
                    '&:hover': {
                      color: '#b9d4f5', borderColor: 'rgba(120,160,230,0.55)',
                      bgcolor: 'rgba(40,90,160,0.07)'
                    }
                  }}
                >
                  ADMIN SIGN IN →
                </Button>
              </Box>

              <TelemetryBar />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
