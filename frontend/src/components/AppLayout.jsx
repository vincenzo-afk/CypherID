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

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>CypherID</Typography>
          {user ? (
            <>
              <Button color="inherit" component={Link} to="/wallet">Wallet</Button>
              <Button color="inherit" component={Link} to="/assets">Assets</Button>
              <Button color="inherit" component={Link} to="/access-requests">Access</Button>
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
      <Container sx={{ mt: 3 }}>{children}</Container>
    </Box>
  );
}
