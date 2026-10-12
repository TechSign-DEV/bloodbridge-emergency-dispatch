import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ role }) {
  const { isAuthenticated, role: currentRole } = useAuth();
  if (!isAuthenticated) return <Navigate to={`/${role}/login`} replace />;
  if (currentRole !== role) return <Navigate to={currentRole === 'donor' ? '/donor/dashboard' : '/hospital/dashboard'} replace />;
  return <Outlet />;
}
