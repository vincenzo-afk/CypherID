import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthGuard({ children, roles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p>Loading…</p>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles.length > 0 && !roles.some((r) => (user.roles || []).includes(r))) {
    return <Navigate to="/assets" replace />;
  }
  return children;
}
