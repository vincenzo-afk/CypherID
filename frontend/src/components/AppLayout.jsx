import { AppBar, Badge, Box, Button, Container, Toolbar, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

const listOf = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.notifications)) return data.notifications;
  return [];
};

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

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'radial-gradient(1200px 500px at 15% -5%, rgba(124,156,255,0.16), transparent 60%), radial-gradient(900px 420px at 90% 0%, rgba(34,211,238,0.12), transparent 55%), #0a0e1a'
    }}>
      <AppBar position="static" elevation={0} sx={{ background: 'rgba(10,14,26,0.82)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(124,156,255,0.22)' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800, letterSpacing: 0.5 }}>
            Cypher<span style={{ color: '#22d3ee' }}>ID</span>
          </Typography>
          {user ? (
            <>
              <Button color="inherit" component={Link} to="/wallet">Wallet</Button>
              <Button color="inherit" component={Link} to="/assets">Assets</Button>
              <Button color="inherit" component={Link} to="/access-requests">Access</Button>
              {isAdmin && (
                <Button color="secondary" variant="outlined" size="small" sx={{ ml: 1 }} component={Link} to="/admin">Admin</Button>
              )}
              <Button color="inherit" component={Link} to="/audit">Audit</Button>
              <Button color="inherit" component={Link} to="/notifications">
                <Badge badgeContent={unread} color="error" max={99}>
                  Notifications
                </Badge>
              </Button>
              <Button color="inherit" onClick={onLogout}>Logout</Button>
            </>
          ) : (
            <Button color="inherit" component={Link} to="/login">Login</Button>
          )}
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 3, pb: 5 }}>{children}</Container>
    </Box>
  );
}
