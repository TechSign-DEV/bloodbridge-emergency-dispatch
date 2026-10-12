import { ArrowLeft, ArrowRight, HeartPulse, LockKeyhole, Mail, Phone, UserRound } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import api, { getApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Feedback from '../components/Feedback.jsx';
import LocationInputs from '../components/LocationInputs.jsx';
import { WARANGAL_CENTER } from '../utils/geo.js';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function DonorRegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', bloodGroup: 'O+', lastDonatedAt: '', location: WARANGAL_CENTER });
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const { signIn, isAuthenticated, role } = useAuth(); const navigate = useNavigate();
  if (isAuthenticated) return <Navigate to={role === 'donor' ? '/donor/dashboard' : '/hospital/dashboard'} replace />;
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      const body = { ...form, location: { lat: Number(form.location.lat), lng: Number(form.location.lng) }, lastDonatedAt: form.lastDonatedAt || null, isAvailable: true };
      const { data } = await api.post('/auth/donors/register', body);
      signIn(data.data); navigate('/donor/dashboard');
    } catch (err) { setError(getApiError(err)); }
    finally { setLoading(false); }
  };

  return <section className="page-wrap py-10 lg:py-14"><div className="mx-auto max-w-3xl"><Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-rose-700"><ArrowLeft size={15} /> Back to home</Link><div className="form-card"><div className="flex items-start gap-4 border-b border-slate-100 pb-6"><span className="auth-icon"><HeartPulse size={25} /></span><div><div className="eyebrow">DONOR REGISTRATION</div><h1 className="mt-2 text-3xl font-black tracking-tight">Become a donor</h1><p className="mt-2 text-sm leading-6 text-slate-500">Register as a voluntary donor so matching hospitals can send requests within your area.</p></div></div>
      <Feedback type="error">{error}</Feedback>
      <form onSubmit={submit} className="mt-7 space-y-7"><div className="grid gap-5 md:grid-cols-2"><div><label className="field-label" htmlFor="name"><UserRound size={15} /> Full name</label><input id="name" className="input" required minLength={2} maxLength={100} value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Your full name" /></div><div><label className="field-label" htmlFor="phone"><Phone size={15} /> Phone number</label><input id="phone" className="input" type="tel" required minLength={7} maxLength={20} value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+91 98765 43210" /></div><div><label className="field-label" htmlFor="email"><Mail size={15} /> Email address</label><input id="email" className="input" type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" /></div><div><label className="field-label" htmlFor="password"><LockKeyhole size={15} /> Password</label><input id="password" className="input" type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="At least 8 characters" /></div><div><label className="field-label" htmlFor="bloodGroup">Blood group</label><select id="bloodGroup" className="input" value={form.bloodGroup} onChange={(e) => update('bloodGroup', e.target.value)}>{BLOOD_GROUPS.map((group) => <option key={group}>{group}</option>)}</select></div><div><label className="field-label" htmlFor="lastDonatedAt">Last donated date <span className="font-normal text-slate-400">(optional)</span></label><input id="lastDonatedAt" className="input" type="date" max={new Date().toISOString().slice(0, 10)} value={form.lastDonatedAt} onChange={(e) => update('lastDonatedAt', e.target.value)} /><p className="helper-text mt-1">Donors who donated within the last 90 days are filtered out by this prototype.</p></div></div>
      <div className="border-t border-slate-100 pt-6"><LocationInputs value={form.location} onChange={(location) => update('location', location)} label="Your approximate location" /></div>
      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-md text-xs leading-5 text-slate-500">By registering, you agree to be contacted about relevant requests. This demo does not verify donor identity or clinical eligibility.</p><button className="btn btn-primary justify-center" disabled={loading}>{loading ? 'Creating account…' : 'Create donor account'} {!loading && <ArrowRight size={17} />}</button></div></form>
      <p className="mt-6 text-center text-sm text-slate-500">Already registered? <Link className="font-bold text-rose-700 hover:underline" to="/donor/login">Sign in</Link></p>
    </div></div></section>;
}
