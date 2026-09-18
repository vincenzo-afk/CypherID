import { useRef, useState } from 'react';
import { Alert, Box, Button, GlobalStyles, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import VaultField from '../components/vault/VaultField.jsx';

// Administrator Access console — a dedicated, restrained entry point for
// organization admins. It deliberately does NOT look like the cinematic user
// vault: flat dark panel, thin borders, mono labels, no ambient streams.
//
// Security model (unchanged architecture, no second auth system):
//   1. Same useAuth().login() → /api/v1/auth/login → same token store.
//   2. After login, the roles ACTUALLY returned by /api/v1/auth/me decide the
//      outcome — only ORG_ADMIN / SUPER_ADMIN proceeds to /admin.
//   3. Any other identity is signed out immediately (token revoked via the
//      existing logout()) with an honest message.
//   4. Nothing here grants privileges: the backend gateway and every admin
//      endpoint still enforce authorization independently. Navigating to an
//      admin URL as a normal user yields nothing.
//
// Unlike the user path, credentials are never persisted on this page (no
// "remember this device").

const ADMIN_ROLES = ['ORG_ADMIN', 'SUPER_ADMIN'];
const STAGES = ['VERIFYING CREDENTIALS', 'CHECKING CLEARANCE', 'GRANTING ACCESS'];

const ShieldGlyph = ({ size = 15, color = '#5ecbff' }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color}
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2.5 4.5 5.4v5.3c0 4.6 3.2 8.4 7.5 10.8 4.3-2.4 7.5-6.2 7.5-10.8V5.4L12 2.5Z" />
    <path d="M12 8.2v3.6" />
    <circle cx="12" cy="14.6" r="0.55" fill={color} stroke="none" />
  </svg>
);

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

export default function AdminLoginPage() {
  const [did, setDid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const didRef = useRef(null);
  const pwRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (!did.trim()) { setError('Digital ID is required.'); didRef.current?.focus(); return; }
    if (!password) { setError('Password is required.'); pwRef.current?.focus(); return; }
    setBusy(true);
    setStage(0);
    const t1 = setTimeout(() => setStage(1), 520);
    const t2 = setTimeout(() => setStage(2), 1040);
    try {
      const me = await login(did.trim(), password);
      const roles = me?.roles || [];
      if (!ADMIN_ROLES.some((r) => roles.includes(r))) {
        // Not an administrator: end this session at once and say so plainly.
        await logout();
        setError('This identity does not hold administrator privileges. Use the standard sign-in instead.');
        setBusy(false);
        return;
      }
      navigate('/admin');
    } catch (err) {
      // Honest failure reasons — never blame the password for an outage.
      const status = err?.response?.status;
      if (status === 401) {
        setError('Authentication failed. Verify your digital ID and password.');
      } else if (status === 403) {
        setError('This identity cannot be authenticated — it may be revoked or suspended.');
      } else {
        setError(err?.friendlyMessage || 'The security console could not be reached. Please try again in a moment.');
      }
      setBusy(false);
    } finally {
      clearTimeout(t1); clearTimeout(t2);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh', bgcolor: '#05070D', color: '#e8eefb',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      px: 2, py: 6, position: 'relative', overflow: 'hidden'
    }}>
      {/* faint static engineering grid — no motion */}
      <Box aria-hidden="true" sx={{
        position: 'absolute', inset: 0, opacity: 0.32,
        backgroundImage: 'radial-gradient(rgba(70,110,180,0.15) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <Box sx={{ position: 'relative', width: '100%', maxWidth: 452 }}>
        {/* console kicker */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1.8, px: 0.4 }}>
          <ShieldGlyph />
          <Typography sx={{
            fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.3em', color: '#5ecbff', userSelect: 'none'
          }}>
            ADMINISTRATOR ACCESS
          </Typography>
        </Box>

        {/* console panel — flat, hairline border, no glass */}
        <Box sx={{
          border: '1px solid rgba(90,120,180,0.22)',
          bgcolor: 'rgba(8,12,22,0.88)',
          p: { xs: 2.8, sm: 4 }
        }}>
          <Typography sx={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.14em', color: '#eef4ff' }}>
            SECURITY CONSOLE
          </Typography>
          <Typography sx={{ mt: 1, color: '#8b9cc0', fontSize: 13.5, lineHeight: 1.55 }}>
            Restricted to identities holding administrator privileges. Access is
            verified against the identity ledger on every sign-in.
          </Typography>

          <Box component="form" onSubmit={submit} noValidate sx={{ mt: 3.4 }}>
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

            {error && (
              <Alert role="alert" severity="error" sx={{
                mt: 1, mb: 1, borderRadius: 1, fontSize: 13,
                bgcolor: 'rgba(150,40,40,0.14)', border: '1px solid rgba(220,90,90,0.4)',
                '& .MuiAlert-message': { color: '#ffb4b4' }, '& .MuiAlert-icon': { color: '#ff8080' }
              }}>{error}</Alert>
            )}

            {/* restrained technical submit — intentionally unlike the user vault button */}
            <Button type="submit" fullWidth disabled={busy} sx={{
              mt: 2.6, py: 1.4, borderRadius: 1, fontSize: 13, fontWeight: 700,
              letterSpacing: '0.12em', fontFamily: MONO,
              color: busy ? '#6f83a8' : '#9fd8ff',
              border: '1px solid rgba(80,160,255,0.42)',
              bgcolor: 'rgba(20,40,70,0.22)',
              '&:hover': { bgcolor: 'rgba(56,166,255,0.1)', borderColor: 'rgba(120,190,255,0.65)' },
              '&:disabled': { color: '#6f83a8', borderColor: 'rgba(80,160,255,0.2)' }
            }}>
              {busy ? `${STAGES[stage]}…` : 'AUTHENTICATE →'}
            </Button>
          </Box>

          <Box sx={{
            mt: 3.2, pt: 2.2, borderTop: '1px solid rgba(90,120,180,0.14)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap'
          }}>
            <Link to="/login" style={{
              color: '#6f83a8', fontSize: 12.5, textDecoration: 'none'
            }}>
              ← Return to user sign-in
            </Link>
            <Typography sx={{
              fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.18em', color: '#5d6f95', userSelect: 'none'
            }}>
              ROLE · VERIFIED SERVER-SIDE
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
