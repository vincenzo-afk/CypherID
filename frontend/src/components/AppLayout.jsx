import { AppBar, Badge, Box, Button, Container, Toolbar } from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import Logo from './Logo.jsx';

const listOf = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.notifications)) return data.notifications;
  return [];
};

// Plain-language navigation: non-technical labels so any visitor
// understands where to go. Technical route paths stay unchanged.
export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const onLogout = async () => { await logout(); navigate('/login'); };

  const { data } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => api.notifications().catch(() => []),
    enabled: Boolean(user),
    refetchInterval: 30000
  });
  const unread = listOf(data).filter((n) => !n.read).length;
  const isAdmin = (user?.roles || []).some((r) => r === 'ORG_ADMIN' || r === 'SUPER_ADMIN' || r === 'ADMIN');
  // Hide the nav link for the page you are already on, so there is exactly one
  // "Log in" / "Create my ID" button in the DOM at a time.
  const { pathname } = useLocation();
  // Auth pages use a premium dark hero; give the bar a matching dark-glass look there.
  const isAuthPage = pathname === '/login' || pathname === '/register';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          position: 'relative', zIndex: 2,
          ...(isAuthPage
            ? {
                background: 'rgba(7,11,22,0.55)', color: '#eef2fb',
                borderBottom: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)'
              }
            : { background: '#ffffff', color: '#111928', borderBottom: '1px solid #e5e7eb' })
        }}
      >
        <Toolbar sx={{ gap: 0.5, flexWrap: 'wrap' }}>
          <Box
            component={Link}
            to={user ? '/home' : '/'}
            sx={{ mr: 'auto', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', py: 0.5 }}
          >
            <Logo size={30} variant={isAuthPage ? 'light' : 'full'} wordSize={20} />
          </Box>
          {user ? (
            <>
              <Button color="inherit" component={Link} to="/home">Home</Button>
              <Button color="inherit" component={Link} to="/wallet">My ID</Button>
              <Button color="inherit" component={Link} to="/assets">My files</Button>
              <Button color="inherit" component={Link} to="/access-requests">Sharing</Button>
              {isAdmin && (
                <Button variant="contained" size="small" component={Link} to="/admin">Admin</Button>
              )}
              <Button color="inherit" component={Link} to="/audit">Activity</Button>
              <Button color="inherit" component={Link} to="/notifications">
                <Badge badgeContent={unread} color="error" max={99}>
                  Alerts
                </Badge>
              </Button>
              <Button color="inherit" onClick={onLogout}>Log out</Button>
            </>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/home">What is CypherID?</Button>
              {pathname !== '/login' && (
                <Button color="inherit" component={Link} to="/login" sx={isAuthPage ? { color: '#c9d6f2' } : undefined}>Log in</Button>
              )}
              {pathname !== '/register' && (
                <Button
                  variant="contained" component={Link} to="/register"
                  sx={isAuthPage
                    ? {
                        background: 'linear-gradient(90deg, #2a63f6, #7a5cff)',
                        boxShadow: '0 6px 20px rgba(42,99,246,0.4)',
                        '&:hover': { boxShadow: '0 8px 26px rgba(42,99,246,0.55)' }
                      }
                    : undefined
                  }
                >Create my ID</Button>
              )}
            </>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ mt: 4, pb: 6 }}>{children}</Container>
    </Box>
  );
}
