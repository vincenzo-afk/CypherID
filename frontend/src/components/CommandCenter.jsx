import { AppBar, Badge, Box, IconButton, Menu, MenuItem, Toolbar, Tooltip, Typography } from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import Logo from './Logo.jsx';

const listOf = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.notifications)) return data.notifications;
  return [];
};

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

// CommandCenter — authenticated dashboard shell: near-black environment,
// slim technical navbar (logo + network status, section links, security
// status, avatar menu). Sections route to the existing app pages so the
// underlying routes/auth stay untouched.
const NAV = [
  { label: 'Overview', to: '/home' },
  { label: 'Identity', to: '/wallet' },
  { label: 'Files', to: '/assets' },
  { label: 'Access', to: '/access-requests' },
  { label: 'Active', to: '/active' },
  { label: 'Activity', to: '/audit' }
];

const ROLE_LABELS = {
  SUPER_ADMIN: 'Administrator',
  ORG_ADMIN: 'Org admin',
  SYSTEM_AUDITOR: 'Auditor',
  ORG_MEMBER: 'Member'
};

export default function CommandCenter({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [anchor, setAnchor] = useState(null);

  const { data } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => api.notifications().catch(() => []),
    enabled: Boolean(user),
    refetchInterval: 30000
  });
  const unread = listOf(data).filter((n) => !n.read).length;

  const displayName = user?.name || user?.kycData?.name || (user?.did || '').slice(0, 14) + '…';
  const role = (user?.roles || []).find((r) => ROLE_LABELS[r]) || 'Member';
  // Admin console entry — rendered ONLY for administrator roles. Normal users
  // never see it, and /admin remains role-guarded front and back regardless.
  const isAdmin = (user?.roles || []).some((r) => r === 'ORG_ADMIN' || r === 'SUPER_ADMIN');

  const onLogout = async () => {
    setAnchor(null);
    await logout();
    navigate('/login');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#05070D', color: '#e8eefb', display: 'flex', flexDirection: 'column' }}>
      {/* faint grid environment */}
      <Box aria-hidden="true" sx={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(rgba(70,110,180,0.13) 1px, transparent 1px)',
        backgroundSize: '44px 44px',
        maskImage: 'radial-gradient(120% 90% at 50% 0%, black 30%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(120% 90% at 50% 0%, black 30%, transparent 100%)'
      }} />

      <AppBar position="static" elevation={0} sx={{
        position: 'relative', zIndex: 2, background: 'rgba(7,11,22,0.72)',
        borderBottom: '1px solid rgba(90,120,180,0.16)', backdropFilter: 'blur(10px)', color: '#e8eefb'
      }}>
        <Toolbar sx={{ gap: 1, minHeight: { xs: 56, md: 62 } }}>
          {/* left: logo + network status */}
          <Box component={Link} to="/home" sx={{ mr: 2, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 1.6 }}>
            <Logo size={26} variant="light" wordSize={17} />
            <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', gap: '2px', borderLeft: '1px solid rgba(90,120,180,0.2)', pl: 1.6 }}>
              <Typography sx={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.2em', color: '#6f83a8' }}>
                IDENTITY NETWORK
              </Typography>
              <Typography sx={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', color: '#34d399', display: 'flex', alignItems: 'center', gap: 0.6 }}>
                <Box component="span" sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.7)' }} aria-hidden="true" />
                ONLINE
              </Typography>
            </Box>
          </Box>

          {/* center: section nav */}
          <Box sx={{ flex: 1, display: { xs: 'none', md: 'flex' }, gap: 0.5, justifyContent: 'center' }}>
            {NAV.map((n) => {
              const active = pathname === n.to;
              return (
                <Box
                  key={n.to}
                  component={Link}
                  to={n.to}
                  aria-current={active ? 'page' : undefined}
                  sx={{
                    px: 1.6, py: 0.7, borderRadius: 1, textDecoration: 'none', fontSize: 13.5,
                    fontWeight: active ? 700 : 500,
                    color: active ? '#5ecbff' : '#8b9cc0', position: 'relative',
                    '&:hover': { color: '#c6d5ef', bgcolor: 'rgba(40,90,160,0.10)' },
                    ...(active ? { bgcolor: 'rgba(40,90,160,0.14)' } : {})
                  }}
                >
                  {n.label}
                  {active && (
                    <Box sx={{ position: 'absolute', left: '20%', right: '20%', bottom: -1, height: 2, borderRadius: 2, background: 'linear-gradient(90deg, transparent, #38a6ff, transparent)' }} aria-hidden="true" />
                  )}
                </Box>
              );
            })}
          </Box>

          {/* admin console entry — admins only, never in the user menu */}
          {isAdmin && (
            <Box
              component={Link}
              to="/admin"
              aria-current={pathname === '/admin' ? 'page' : undefined}
              title="Administrator console"
              sx={{
                display: { xs: 'none', md: 'inline-flex' }, alignItems: 'center', gap: 0.8,
                px: 1.6, py: 0.7, borderRadius: 1, textDecoration: 'none', fontSize: 13.5,
                fontWeight: pathname === '/admin' ? 700 : 500,
                color: pathname === '/admin' ? '#c4b5fd' : '#9d8cff',
                border: '1px solid',
                borderColor: pathname === '/admin' ? 'rgba(157,140,255,0.65)' : 'rgba(157,140,255,0.28)',
                bgcolor: pathname === '/admin' ? 'rgba(157,140,255,0.12)' : 'transparent',
                '&:hover': { color: '#ddd6fe', borderColor: 'rgba(157,140,255,0.55)', bgcolor: 'rgba(157,140,255,0.08)' }
              }}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
                strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2.5 4.5 5.4v5.3c0 4.6 3.2 8.4 7.5 10.8 4.3-2.4 7.5-6.2 7.5-10.8V5.4L12 2.5Z" />
                <path d="M12 8.2v3.6" />
                <circle cx="12" cy="14.6" r="0.55" fill="currentColor" stroke="none" />
              </svg>
              Admin
            </Box>
          )}

          {/* right: notifications + security status + avatar */}
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 1.6 } }}>
            <Tooltip title="Notifications">
              <IconButton
                aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
                onClick={() => navigate('/notifications')}
                size="small"
                sx={{ color: '#8b9cc0', '&:hover': { color: '#c6d5ef' } }}
              >
                <Badge badgeContent={unread} color="primary">
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                  </svg>
                </Badge>
              </IconButton>
            </Tooltip>

            <Typography sx={{
              display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.7,
              fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.16em', color: '#34d399',
              border: '1px solid rgba(52,211,153,0.3)', borderRadius: 1, px: 1, py: 0.4, bgcolor: 'rgba(52,211,153,0.07)'
            }}>
              <Box component="span" sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#34d399' }} aria-hidden="true" />
              SECURE
            </Typography>

            <Box
              component="button"
              onClick={(e) => setAnchor(e.currentTarget)}
              aria-label="Account menu"
              aria-haspopup="menu"
              aria-expanded={Boolean(anchor)}
              data-testid="cc-avatar"
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.1, border: '1px solid rgba(90,120,180,0.2)',
                borderRadius: 1, px: 1, py: 0.5, bgcolor: 'rgba(10,16,30,0.6)', cursor: 'pointer', color: 'inherit',
                '&:hover': { borderColor: 'rgba(90,140,220,0.45)' }
              }}
            >
              <Box sx={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #1a56db, #38a6ff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: '#fff'
              }} aria-hidden="true">
                {(displayName || '?').trim().charAt(0).toUpperCase()}
              </Box>
              <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontSize: 13, fontWeight: 600, color: '#e8eefb', lineHeight: 1.1 }}>
                {displayName}
                <Typography component="span" sx={{ display: 'block', fontSize: 9.5, color: '#6f83a8', fontWeight: 500 }}>
                  {role}
                </Typography>
              </Typography>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ color: '#5d6f95' }}>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </Box>
            <Menu
              anchorEl={anchor}
              open={Boolean(anchor)}
              onClose={() => setAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{ paper: { sx: { bgcolor: '#0b1120', border: '1px solid rgba(90,120,180,0.25)', mt: 1, minWidth: 180 } } }}
            >
              {isAdmin && (
                <MenuItem component={Link} to="/admin" onClick={() => setAnchor(null)} sx={{ color: '#b8a8ff' }}>
                  Admin console
                </MenuItem>
              )}
              <MenuItem component={Link} to="/wallet" onClick={() => setAnchor(null)}>Profile</MenuItem>
              <MenuItem component={Link} to="/wallet" onClick={() => setAnchor(null)}>Security</MenuItem>
              <MenuItem component={Link} to="/notifications" onClick={() => setAnchor(null)}>Notifications</MenuItem>
              <MenuItem onClick={onLogout} sx={{ color: '#f87171' }}>Log out</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ position: 'relative', zIndex: 1, flex: 1, width: '100%' }}>
        {children}
      </Box>
    </Box>
  );
}
