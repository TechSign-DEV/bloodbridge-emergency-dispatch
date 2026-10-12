import { ArrowLeft, ArrowRight, Hospital, LockKeyhole, Mail, MapPin, Phone } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import api, { getApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Feedback from '../components/Feedback.jsx';
import LocationInputs from '../components/LocationInputs.jsx';
import { WARANGAL_CENTER } from '../utils/geo.js';

export default function HospitalRegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', address: '', location: WARANGAL_CENTER });
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const { signIn, isAuthenticated, role } = useAuth(); const navigate = useNavigate();
  if (isAuthenticated) return <Navigate to={role === 'donor' ? '/donor/dashboard' : '/hospital/dashboard'} replace />;
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      const body = { ...form, location: { lat: Number(form.location.lat), lng: Number(form.location.lng) } };
      const { data } = await api.post('/auth/hospitals/register', body);
      signIn(data.data); navigate('/hospital/dashboard');
    } catch (err) { setError(getApiError(err)); }
    finally { setLoading(false); }
  };

  return <section className="page-wrap py-10 lg:py-14"><div className="mx-auto max-w-3xl"><Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-rose-700"><ArrowLeft size={15} /> Back to home</Link><div className="form-card"><div className="flex items-start gap-4 border-b border-slate-100 pb-6"><span className="auth-icon"><Hospital size={25} /></span><div><div className="eyebrow">HOSPITAL REGISTRATION</div><h1 className="mt-2 text-3xl font-black tracking-tight">Set up your hospital</h1><p className="mt-2 text-sm leading-6 text-slate-500">Create an account to post emergency requests and coordinate volunteer responses.</p></div></div>
      <Feedback type="error">{error}</Feedback>
      <form onSubmit={submit} className="mt-7 space-y-7"><div className="grid gap-5 md:grid-cols-2"><div><label className="field-label" htmlFor="name"><Hospital size={15} /> Hospital / organization name</label><input id="name" className="input" required minLength={2} maxLength={150} value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Your hospital name" /></div><div><label className="field-label" htmlFor="phone"><Phone size={15} /> Emergency contact number</label><input id="phone" className="input" type="tel" required minLength={7} maxLength={20} value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+91 98765 43210" /></div><div><label className="field-label" htmlFor="email"><Mail size={15} /> Official email</label><input id="email" className="input" type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="coordinator@hospital.org" /></div><div><label className="field-label" htmlFor="password"><LockKeyhole size={15} /> Password</label><input id="password" className="input" type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="At least 8 characters" /></div><div className="md:col-span-2"><label className="field-label" htmlFor="address"><MapPin size={15} /> Hospital address</label><input id="address" className="input" required minLength={5} maxLength={300} value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Street, area, city" /></div></div>
      <div className="border-t border-slate-100 pt-6"><LocationInputs value={form.location} onChange={(location) => update('location', location)} label="Hospital location" /></div>
      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-md text-xs leading-5 text-slate-500">This prototype does not verify hospital credentials. Use test data only until a verification workflow is implemented.</p><button className="btn btn-primary justify-center" disabled={loading}>{loading ? 'Creating account…' : 'Create hospital account'} {!loading && <ArrowRight size={17} />}</button></div></form>
      <p className="mt-6 text-center text-sm text-slate-500">Already registered? <Link className="font-bold text-rose-700 hover:underline" to="/hospital/login">Sign in</Link></p>
    </div></div></section>;
}
