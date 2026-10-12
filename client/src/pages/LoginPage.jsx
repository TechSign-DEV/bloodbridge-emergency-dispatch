import { ArrowLeft, ArrowRight, HeartPulse, Hospital, LockKeyhole, Mail } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import api, { getApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Feedback from '../components/Feedback.jsx';

export default function LoginPage({ role }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, isAuthenticated, role: currentRole } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) return <Navigate to={currentRole === 'donor' ? '/donor/dashboard' : '/hospital/dashboard'} replace />;
  const isDonor = role === 'donor';

  const submit = async (event) => {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      const endpoint = isDonor ? '/auth/donors/login' : '/auth/hospitals/login';
      const { data } = await api.post(endpoint, form);
      signIn(data.data);
      navigate(isDonor ? '/donor/dashboard' : '/hospital/dashboard');
    } catch (err) { setError(getApiError(err)); }
    finally { setLoading(false); }
  };

  return <section className="auth-layout page-wrap py-12 lg:py-16">
    <div className="auth-side hidden lg:flex"><div className="auth-side-content"><span className="brand-mark brand-mark-xl"><HeartPulse size={32} /></span><div className="eyebrow eyebrow-light mt-7">BLOODBRIDGE NETWORK</div><h1 className="mt-4 text-4xl font-black leading-tight">A timely response<br />can change everything.</h1><p className="mt-4 leading-7 text-rose-50/80">Securely access your BloodBridge workspace to coordinate or respond to blood requests.</p><div className="mt-10 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4"><span className="rounded-xl bg-white/15 p-3"><Hospital size={22} /></span><div><b className="block">{isDonor ? 'Volunteer donor workspace' : 'Hospital coordination workspace'}</b><span className="text-sm text-rose-50/75">Private, role-based access</span></div></div></div></div>
    <div className="auth-form-panel"><Link to="/" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-rose-700"><ArrowLeft size={15} /> Back to home</Link><span className="auth-icon">{isDonor ? <HeartPulse size={24} /> : <Hospital size={24} />}</span><div className="eyebrow mt-5">{isDonor ? 'DONOR PORTAL' : 'HOSPITAL PORTAL'}</div><h2 className="mt-2 text-3xl font-black tracking-tight">Welcome back</h2><p className="mt-2 text-sm leading-6 text-slate-500">Sign in to continue to your {isDonor ? 'donor dashboard' : 'hospital dashboard'}.</p>
      <Feedback type="error" >{error}</Feedback>
      <form className="mt-7 space-y-5" onSubmit={submit}><div><label className="field-label" htmlFor="email"><Mail size={15} /> Email address</label><input className="input" id="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></div><div><label className="field-label" htmlFor="password"><LockKeyhole size={15} /> Password</label><input className="input" id="password" type="password" autoComplete="current-password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" /></div><button className="btn btn-primary w-full justify-center py-3" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'} {!loading && <ArrowRight size={17} />}</button></form>
      <p className="mt-7 text-center text-sm text-slate-500">New to BloodBridge? <Link className="font-bold text-rose-700 hover:underline" to={isDonor ? '/donor/register' : '/hospital/register'}>Create an account</Link></p>
      <div className="mt-6 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500"><LockKeyhole size={14} className="mt-0.5 shrink-0" /> Demo access only. Never use real patient details or share your credentials in a public environment.</div>
    </div>
  </section>;
}
