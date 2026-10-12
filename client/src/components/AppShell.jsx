import { HeartPulse, LogOut, LayoutDashboard, UserRound, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AppShell({ children }) {
  const { isAuthenticated, role, user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-slate-900">
      <div className="top-strip"><span><ShieldCheck size={14} /> Volunteer coordination prototype · Not an emergency dispatch service</span><span className="hidden sm:inline">Every minute matters</span></div>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <nav className="page-wrap flex h-[76px] items-center justify-between gap-5" aria-label="Main navigation">
          <Link to="/" className="flex items-center gap-3" aria-label="BloodBridge home">
            <span className="brand-mark"><HeartPulse size={24} strokeWidth={2.6} /></span>
            <span><strong className="block text-[20px] font-black tracking-tight">BloodBridge<span className="text-rose-600">.</span></strong><small className="block -mt-1 text-[10px] font-bold uppercase tracking-[.19em] text-slate-400">Emergency donor network</small></span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? <>
              <div className="hidden items-center gap-2 rounded-full bg-slate-50 px-3 py-2 sm:flex"><span className="avatar-mini"><UserRound size={15} /></span><span className="max-w-36 truncate text-sm font-semibold">{user?.name}</span><span className="role-chip">{role}</span></div>
              <Link to={role === 'donor' ? '/donor/dashboard' : '/hospital/dashboard'} className="btn btn-soft"><LayoutDashboard size={16} /><span className="hidden sm:inline">Dashboard</span></Link>
              <button type="button" onClick={handleSignOut} className="icon-btn" title="Sign out" aria-label="Sign out"><LogOut size={18} /></button>
            </> : <>
              <Link to="/donor/login" className="nav-link hidden sm:inline-flex">Donor login</Link>
              <Link to="/hospital/login" className="nav-link hidden sm:inline-flex">Hospital login</Link>
              <Link to="/donor/register" className="btn btn-primary"><HeartPulse size={16} /> Become a donor</Link>
            </>}
          </div>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="mt-20 border-t border-slate-200 bg-white">
        <div className="page-wrap flex flex-col gap-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-700"><span className="brand-mark brand-mark-sm"><HeartPulse size={17} /></span>BloodBridge</div>
          <p>
            {/* Educational project prototype.  */}
            Eligibility and blood compatibility must be confirmed by qualified professionals.</p>
          <span>© {new Date().getFullYear()} BloodBridge</span>
        </div>
      </footer>
    </div>
  );
}
