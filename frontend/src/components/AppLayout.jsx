import { AppBar, Badge, Box, Button, Container, Toolbar, Typography } from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={0} sx={{ background: '#ffffff', color: '#111928', borderBottom: '1px solid #e5e7eb' }}>
        <Toolbar sx={{ gap: 0.5, flexWrap: 'wrap' }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 800, mr: 'auto' }}
            component={Link}
            to={user ? '/home' : '/'}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            CypherID
          </Typography>
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
              {pathname !== '/login' && <Button color="inherit" component={Link} to="/login">Log in</Button>}
              {pathname !== '/register' && (
                <Button variant="contained" component={Link} to="/register">Create my ID</Button>
              )}
            </>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ mt: 4, pb: 6 }}>{children}</Container>
    </Box>
  );
}
