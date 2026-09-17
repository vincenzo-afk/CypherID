import { useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, IconButton, InputAdornment, TextField, Typography
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LogoMark } from '../components/Logo.jsx';

// Inline SVG icons — dependency-free (no icon package).
const BulletCheck = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true">
    <circle cx="10" cy="10" r="9" fill="rgba(122,162,255,0.25)" />
    <path d="m6 10.2 2.6 2.6L14 7.4" stroke="#8fb0ff" strokeWidth="1.8" fill="none"
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const EyeIcon = ({ off }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
    <circle cx="12" cy="12" r="2.8" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);

// ---- Decorative aurora backdrop (pure CSS, no images) -----------------------
const AuroraBackdrop = () => (
  <Box aria-hidden="true" sx={{
    position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden',
    background: 'radial-gradient(1200px 800px at 15% -10%, #12234f 0%, transparent 60%), radial-gradient(1000px 700px at 110% 20%, #0d2a55 0%, transparent 55%), radial-gradient(900px 900px at 50% 120%, #101b3a 0%, transparent 60%), #070b16'
  }}>
    <Box sx={{ position: 'absolute', width: 460, height: 460, top: -140, left: '8%', borderRadius: '50%', filter: 'blur(90px)', opacity: 0.5, background: 'radial-gradient(circle, #2a63f6 0%, transparent 70%)' }} />
    <Box sx={{ position: 'absolute', width: 380, height: 380, bottom: -120, right: '6%', borderRadius: '50%', filter: 'blur(90px)', opacity: 0.4, background: 'radial-gradient(circle, #7a5cff 0%, transparent 70%)' }} />
    <Box sx={{ position: 'absolute', width: 300, height: 300, top: '35%', right: '22%', borderRadius: '50%', filter: 'blur(110px)', opacity: 0.3, background: 'radial-gradient(circle, #00d4ff 0%, transparent 70%)' }} />
    <Box sx={{
      position: 'absolute', inset: 0, opacity: 0.05,
      backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
      backgroundSize: '44px 44px'
    }} />
  </Box>
);

// Floating glass input — dark, borderless, glows on focus
function GlassField({ label, hint, type = 'text', value, onChange, autoComplete, required, endAdornment }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#aebbdd', mb: 0.8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</Typography>
      <TextField
        fullWidth
        type={type} value={value} onChange={onChange} autoComplete={autoComplete} required={required}
        variant="standard"
        InputProps={{
          disableUnderline: true,
          endAdornment,
          sx: {
            px: 2, py: 1.4, borderRadius: 2.5,
            bgcolor: 'rgba(255,255,255,0.055)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#f2f5fb',
            transition: 'border-color .2s, box-shadow .2s, background .2s',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
            '&:focus-within': { borderColor: '#4d7cff', boxShadow: '0 0 0 3px rgba(77,124,255,0.22)', bgcolor: 'rgba(255,255,255,0.09)' }
          }
        }}
        inputProps={{ sx: { color: '#f2f5fb', fontSize: 15 } }}
      />
      {hint && <Typography sx={{ fontSize: 12, color: '#7d8cae', mt: 0.7 }}>{hint}</Typography>}
    </Box>
  );
}

// Login — premium dark "aurora glass" look:
// deep-space backdrop with glowing orbs, floating glass card, gradient CTA.
export default function LoginFormPage() {
  const [did, setDid] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try { await login(did.trim(), password); navigate('/wallet'); }
    catch { setError('Login failed. Check your digital ID and password.'); }
    finally { setBusy(false); }
  };

  return (
    <Box>
      <AuroraBackdrop />
      <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 1040, mx: 'auto', py: { xs: 2, md: 5 } }}>
        <Box sx={{ display: 'flex', gap: { xs: 3, md: 5 }, alignItems: 'stretch', flexDirection: { xs: 'column', md: 'row' } }}>

          {/* Brand story column */}
          <Box sx={{ flex: '1 1 46%', color: '#eef2fb', display: 'flex', flexDirection: 'column', py: { md: 3 }, pl: { md: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.6 }}>
              <LogoMark size={46} />
              <Typography sx={{ fontWeight: 800, fontSize: 24, color: '#fff', letterSpacing: '-0.02em' }}>
                Cypher<span style={{ color: '#7aa2ff' }}>ID</span>
              </Typography>
            </Box>

            <Typography sx={{ fontWeight: 800, fontSize: { xs: 30, md: 38 }, lineHeight: 1.12, mt: 4 }}>
              Your identity.
              <Box component="span" sx={{ display: 'block', background: 'linear-gradient(90deg, #7aa2ff, #00d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Your control.
              </Box>
            </Typography>
            <Typography sx={{ color: '#9fb0d6', mt: 1.5, fontSize: 15.5, maxWidth: 420 }}>
              One cryptographic identity for everything you own — locked to you alone, provable to anyone, forever.
            </Typography>

            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                ['Unforgeable identity', 'Key-backed DID, minted on a tamper-proof ledger'],
                ['Total file sovereignty', 'Encrypted, watermarked, and traceable to every viewer'],
                ['Auditable by design', 'Every grant, transfer and burn — permanent proof']
              ].map(([t, d]) => (
                <Box component="li" key={t} sx={{ display: 'flex', gap: 1.4, alignItems: 'flex-start' }}>
                  <BulletCheck />
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: '#e8edf9' }}>{t}</Typography>
                    <Typography sx={{ fontSize: 13, color: '#8d9cc2' }}>{d}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            <Box sx={{ mt: 'auto', pt: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#0e9f6e', boxShadow: '0 0 10px #0e9f6e' }} />
              <Typography sx={{ fontSize: 12.5, color: '#8d9cc2' }}>Network live · Blockchain-verified</Typography>
            </Box>
          </Box>

          {/* Glass auth card */}
          <Box
            component="form"
            onSubmit={submit}
            sx={{
              flex: '1 1 54%', maxWidth: 480, alignSelf: { md: 'center' }, width: '100%',
              borderRadius: 5, p: { xs: 3, sm: 5 },
              background: 'linear-gradient(160deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.035) 100%)',
              border: '1px solid rgba(255,255,255,0.14)',
              boxShadow: '0 30px 80px rgba(2,6,23,0.55), inset 0 1px 0 rgba(255,255,255,0.12)',
              backdropFilter: 'blur(18px)'
            }}
          >
            <Typography sx={{ fontWeight: 800, fontSize: 26, color: '#fff' }}>Welcome back</Typography>
            <Typography sx={{ color: '#9fb0d6', mt: 0.5, fontSize: 14.5 }}>
              Log in with your digital ID and password.
            </Typography>

            <Box sx={{ mt: 3.5 }}>
              <GlassField
                label="Digital ID"
                hint="Always starts with did:cypherid: — e.g. did:cypherid:admin:root"
                value={did} onChange={(e) => setDid(e.target.value)}
                autoComplete="username" required
              />
              <GlassField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" required
                endAdornment={(
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((v) => !v)} edge="end" size="small" sx={{ color: '#8fa3c8' }}
                    >
                      <EyeIcon off={showPassword} />
                    </IconButton>
                  </InputAdornment>
                )}
              />
            </Box>

            {error && (
              <Alert severity="error" sx={{
                mt: 1, mb: 1, borderRadius: 2,
                bgcolor: 'rgba(200,30,30,0.12)', border: '1px solid rgba(200,30,30,0.45)',
                '& .MuiAlert-message': { color: '#ffb4b4' }, '& .MuiAlert-icon': { color: '#ff7a7a' }
              }}>{error}</Alert>
            )}

            <Button
              type="submit" fullWidth disabled={busy}
              sx={{
                mt: 2.5, py: 1.5, borderRadius: 2.5, fontSize: 15.5, fontWeight: 700,
                color: '#fff', textTransform: 'none',
                background: 'linear-gradient(90deg, #2a63f6 0%, #4d7cff 50%, #7a5cff 100%)',
                boxShadow: '0 10px 30px rgba(42,99,246,0.45)',
                '&:hover': { boxShadow: '0 14px 40px rgba(42,99,246,0.6)', transform: 'translateY(-1px)' },
                transition: 'all .2s',
                '&:disabled': { color: 'rgba(255,255,255,0.7)' }
              }}
              startIcon={busy ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {busy ? 'Logging in…' : 'Log in securely'}
            </Button>

            <Typography sx={{ mt: 2.5, textAlign: 'center', color: '#9fb0d6', fontSize: 14 }}>
              No account yet?{' '}
              <Link to="/register" style={{ color: '#7aa2ff', fontWeight: 700, textDecoration: 'none' }}>Create my ID</Link>
            </Typography>

            <Box sx={{ mt: 3.5, pt: 2.5, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'center' }}>
              <Typography sx={{ fontSize: 12, color: '#6d7ea6', letterSpacing: '0.06em' }}>
                SECURED BY FABRIC BLOCKCHAIN · AES-256 · DID:CYPHERID
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
