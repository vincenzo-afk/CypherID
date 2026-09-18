import { useEffect, useState } from 'react';
import { AppBar, Badge, Box, Button, Container, Snackbar, Toolbar, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

const listOf = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.notifications)) return data.notifications;
  return [];
};

const isAdmin = (user) => (user?.roles || []).some((r) => String(r).includes('ADMIN'));

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [snack, setSnack] = useState('');
  const onLogout = async () => { await logout(); navigate('/login'); };

  // Global security-event toasts (viewers dispatch cypherid:toast on obscure).
  useEffect(() => {
    const onToast = (e) => setSnack(e?.detail || 'Security event detected.');
    window.addEventListener('cypherid:toast', onToast);
    return () => window.removeEventListener('cypherid:toast', onToast);
  }, []);

  const { data } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => api.notifications().catch(() => []),
    enabled: Boolean(user),
    refetchInterval: 30000
  });
  const unread = listOf(data).filter((n) => !n.read).length;

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>CypherID</Typography>
          {user ? (
            <>
              <Typography variant="caption" sx={{ mr: 2, opacity: 0.85 }} title={user.did}>
                {user.did ? `${user.did.slice(0, 20)}…` : ''} · {(user.roles || []).join(', ')}
              </Typography>
              <Button color="inherit" component={Link} to="/wallet">Wallet</Button>
              <Button color="inherit" component={Link} to="/assets">Assets</Button>
              <Button color="inherit" component={Link} to="/access-requests">Access</Button>
              <Button color="inherit" component={Link} to="/audit">Audit</Button>
              {isAdmin(user) && <Button color="inherit" component={Link} to="/admin">Admin</Button>}
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
      <Container sx={{ mt: 3 }}>{children}</Container>
      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={4000}
        onClose={() => setSnack('')}
        message={snack}
      />
    </Box>
  );
}
