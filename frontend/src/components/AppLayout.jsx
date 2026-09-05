import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const onLogout = async () => { await logout(); navigate('/login'); };
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
