import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DonorRegisterPage from './pages/DonorRegisterPage.jsx';
import HospitalRegisterPage from './pages/HospitalRegisterPage.jsx';
import DonorDashboard from './pages/DonorDashboard.jsx';
import HospitalDashboard from './pages/HospitalDashboard.jsx';
import { useAuth } from './context/AuthContext.jsx';

function DashboardRedirect() {
  const { role, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <Navigate to={role === 'donor' ? '/donor/dashboard' : '/hospital/dashboard'} replace />;
}

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/donor/register" element={<DonorRegisterPage />} />
        <Route path="/hospital/register" element={<HospitalRegisterPage />} />
        <Route path="/donor/login" element={<LoginPage role="donor" />} />
        <Route path="/hospital/login" element={<LoginPage role="hospital" />} />
        <Route path="/dashboard" element={<DashboardRedirect />} />
        <Route element={<ProtectedRoute role="donor" />}>
          <Route path="/donor/dashboard" element={<DonorDashboard />} />
        </Route>
        <Route element={<ProtectedRoute role="hospital" />}>
          <Route path="/hospital/dashboard" element={<HospitalDashboard />} />
        </Route>
        <Route path="*" element={<main className="page-wrap py-20 text-center"><h1 className="text-3xl font-black">Page not found</h1><a className="btn btn-primary mt-5 inline-flex" href="/">Back to home</a></main>} />
      </Routes>
    </AppShell>
  );
}
