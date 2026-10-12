import { Activity, AlertTriangle, ArrowRight, BellRing, CheckCircle2, ClipboardList, Hospital, MapPin, RefreshCw, Send, UsersRound, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { getApiError } from '../api/client.js';
import Feedback from '../components/Feedback.jsx';
import LocationInputs from '../components/LocationInputs.jsx';
import LocationMap from '../components/LocationMap.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import useSocketEvents from '../hooks/useSocketEvents.js';
import { formatDate, fromGeoPoint, locationValue } from '../utils/geo.js';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCY_LEVELS = ['low', 'medium', 'high', 'critical'];

export default function HospitalDashboard() {
  const [profile, setProfile] = useState(null); const [requests, setRequests] = useState([]); const [loading, setLoading] = useState(true); const [creating, setCreating] = useState(false); const [workingId, setWorkingId] = useState('');
  const [feedback, setFeedback] = useState({ type: 'info', message: '' });
  const [form, setForm] = useState({ bloodGroupRequired: 'O+', unitsNeeded: 1, urgency: 'critical', contactNumber: '', location: { lat: 17.9689, lng: 79.5941 } });
  const showMessage = (type, message) => setFeedback({ type, message });
  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const requestRes = await api.get('/requests/mine');
      const nextRequests = requestRes.data.data.requests || [];
      setRequests(nextRequests);
    } catch (error) { showMessage('error', getApiError(error)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem('bloodbridge_session') || 'null');
      if (session?.user) {
        setProfile(session.user);
        const coords = fromGeoPoint(session.user.location);
        if (coords) setForm((current) => ({ ...current, location: coords, contactNumber: session.user.phone || '' }));
      }
    } catch { /* malformed local session is handled by auth context */ }
  }, []);

  useSocketEvents({
    'blood:request:response': (payload) => { showMessage(payload?.response === 'accepted' ? 'success' : 'info', `${payload?.donor?.name || 'A donor'} ${payload?.response || 'responded'} to a request.`); refresh(true); },
    'blood:request:dispatch_updated': (payload) => { showMessage('success', `Dispatch updated: ${payload?.newlyNotifiedCount ?? 0} new donor alert(s), search radius ${payload?.matchedRadiusKm ?? '—'} km.`); refresh(true); },
    'blood:request:cancelled': () => { showMessage('info', 'Request cancellation was recorded.'); refresh(true); },
  });

  const stats = useMemo(() => ({
    open: requests.filter((r) => ['open', 'partially_fulfilled'].includes(r.status)).length,
    accepted: requests.reduce((sum, r) => sum + (r.acceptedDonors?.length || r.matches?.filter((m) => m.status === 'accepted').length || 0), 0),
    notified: requests.reduce((sum, r) => sum + (r.notifiedDonorCount || r.matches?.length || 0), 0),
    fulfilled: requests.filter((r) => r.status === 'fulfilled').length,
  }), [requests]);

  const createRequest = async (event) => {
    event.preventDefault(); setCreating(true); setFeedback({ type: 'info', message: '' });
    try {
      const body = { bloodGroupRequired: form.bloodGroupRequired, unitsNeeded: Number(form.unitsNeeded), urgency: form.urgency, contactNumber: form.contactNumber.trim() || profile?.phone, location: { lat: Number(form.location.lat), lng: Number(form.location.lng) } };
      const { data } = await api.post('/requests', body);
      const dispatch = data.data.dispatch;
      showMessage('success', `Emergency request created. ${dispatch?.newlyNotifiedCount ?? 0} donor(s) alerted within the ${dispatch?.matchedRadiusKm ?? 'selected'} km search radius.`);
      await refresh(true);
    } catch (error) { showMessage('error', getApiError(error)); }
    finally { setCreating(false); }
  };

  const retryDispatch = async (requestId) => {
    setWorkingId(requestId);
    try { const { data } = await api.post(`/requests/${requestId}/dispatch`); const summary = data.data.dispatch; showMessage('success', `Dispatch retry finished. ${summary?.newlyNotifiedCount ?? 0} new donor alerts sent; previous invites were not duplicated.`); await refresh(true); }
    catch (error) { showMessage('error', getApiError(error)); }
    finally { setWorkingId(''); }
  };

  const cancelRequest = async (requestId) => {
    if (!window.confirm('Cancel this request? Pending invitations will expire.')) return;
    setWorkingId(requestId);
    try { await api.patch(`/requests/${requestId}/cancel`); showMessage('success', 'Request cancelled and pending invitations expired.'); await refresh(true); }
    catch (error) { showMessage('error', getApiError(error)); }
    finally { setWorkingId(''); }
  };

  const hospitalLocation = profile ? locationValue(profile) : form.location;
  return <section className="page-wrap py-8 lg:py-10">
    <div className="dashboard-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> HOSPITAL WORKSPACE</div><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Emergency coordination</h1><p className="mt-2 text-slate-500">Create a blood request, dispatch to nearby donors and monitor responses live.</p></div><button type="button" className="btn btn-secondary shrink-0" onClick={() => refresh()} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh</button></div>
    <Feedback type={feedback.type} onClose={() => setFeedback({ type: 'info', message: '' })}>{feedback.message}</Feedback>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><div className="stat-card"><span className="stat-icon rose-bg"><ClipboardList size={20} /></span><p>Active requests</p><strong>{stats.open}</strong><small>Open or partially fulfilled</small></div><div className="stat-card"><span className="stat-icon teal-bg"><UsersRound size={20} /></span><p>Donors notified</p><strong>{stats.notified}</strong><small>Total request invitations</small></div><div className="stat-card"><span className="stat-icon amber-bg"><BellRing size={20} /></span><p>Donor acceptances</p><strong>{stats.accepted}</strong><small>Across all requests</small></div><div className="stat-card"><span className="stat-icon slate-bg"><CheckCircle2 size={20} /></span><p>Fulfilled</p><strong>{stats.fulfilled}</strong><small>Request status completed</small></div></div>
    <div className="mt-7 grid items-start gap-6 xl:grid-cols-[380px_1fr]">
      <aside className="space-y-5"><section className="section-card"><div className="section-card-heading"><div><div className="eyebrow">NEW DISPATCH</div><h2 className="mt-1 text-xl font-extrabold">Create blood request</h2></div><span className="auth-icon auth-icon-small"><Send size={18} /></span></div><p className="mt-2 text-sm leading-6 text-slate-500">The engine starts at 5 km and expands to 10 km then 20 km if additional eligible donors are needed.</p><form onSubmit={createRequest} className="mt-6 space-y-4"><div><label className="field-label" htmlFor="bloodGroupRequired">Blood group needed</label><select id="bloodGroupRequired" className="input" value={form.bloodGroupRequired} onChange={(e) => setForm({ ...form, bloodGroupRequired: e.target.value })}>{BLOOD_GROUPS.map((group) => <option key={group}>{group}</option>)}</select></div><div className="grid grid-cols-2 gap-3"><div><label className="field-label" htmlFor="unitsNeeded">Units needed</label><input id="unitsNeeded" className="input" type="number" min="1" max="100" step="1" required value={form.unitsNeeded} onChange={(e) => setForm({ ...form, unitsNeeded: e.target.value })} /></div><div><label className="field-label" htmlFor="urgency">Urgency level</label><select id="urgency" className="input" value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>{URGENCY_LEVELS.map((level) => <option key={level} value={level}>{level[0].toUpperCase() + level.slice(1)}</option>)}</select></div></div><div><label className="field-label" htmlFor="contactNumber">Contact number</label><input id="contactNumber" className="input" type="tel" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} placeholder={profile?.phone || 'Emergency contact number'} /></div><div className="border-t border-slate-100 pt-4"><LocationInputs value={form.location} onChange={(location) => setForm({ ...form, location })} label="Request location" /></div><button className="btn btn-primary w-full justify-center py-3" disabled={creating}>{creating ? 'Dispatching…' : 'Create & notify donors'} {!creating && <ArrowRight size={17} />}</button><p className="text-xs leading-5 text-slate-500">Exact blood-group matching is used for this demo. Blood compatibility and donor eligibility must be verified clinically.</p></form></section>
      <section className="section-card"><div className="section-card-heading"><div><div className="eyebrow">HOSPITAL LOCATION</div><h2 className="mt-1 text-lg font-extrabold">Dispatch origin</h2></div><MapPin size={18} className="text-rose-700" /></div><div className="mt-4"><LocationMap center={hospitalLocation} markers={[{ ...hospitalLocation, label: profile?.name || 'Hospital', description: profile?.address || '', kind: 'hospital' }]} zoom={12} height={205} /></div><p className="mt-3 text-xs leading-5 text-slate-500">Requests use the coordinates submitted in the form. Confirm that they match the hospital or collection location.</p></section>
      <div className="notice-card"><AlertTriangle size={18} /><p><strong>Prototype limitation.</strong> No blood inventory, hospital verification, donor identity check or clinical compatibility engine is implemented.</p></div></aside>
      <section className="section-card"><div className="section-card-heading"><div><div className="eyebrow">DISPATCH MONITOR</div><h2 className="mt-1 text-xl font-extrabold">Your emergency requests</h2></div><span className="count-pill">{requests.length} total</span></div>
        {loading ? <div className="empty-state"><RefreshCw className="animate-spin" size={22} /> Loading requests…</div> : requests.length === 0 ? <div className="empty-state"><span className="empty-icon"><Hospital size={24} /></span><strong>No requests yet</strong><p>Create your first emergency request using the form to begin geospatial dispatch.</p></div> : <div className="mt-5 space-y-5">{requests.map((request) => {
          const matches = request.matches || []; const accepted = matches.filter((m) => m.status === 'accepted'); const pending = matches.filter((m) => m.status === 'pending'); const coords = fromGeoPoint(request.location) || hospitalLocation;
          return <article className="hospital-request" key={request._id}><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="blood-type-large">{request.bloodGroupRequired}</div><div><h3 className="text-lg font-extrabold">{request.bloodGroupRequired} · {request.unitsNeeded} unit(s)</h3><p className="mt-1 text-sm text-slate-500">Created {formatDate(request.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</p></div></div><StatusBadge status={request.status} /></div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="mini-metric"><span>Urgency</span><b className="capitalize">{request.urgency}</b></div><div className="mini-metric"><span>Radius reached</span><b>{request.matchedRadiusKm || 5} km</b></div><div className="mini-metric"><span>Notified</span><b>{request.notifiedDonorCount ?? matches.length}</b></div><div className="mini-metric"><span>Accepted</span><b>{accepted.length || request.acceptedDonors?.length || 0}</b></div></div>
            <div className="mt-5"><div className="flex items-center justify-between gap-3"><h4 className="text-sm font-extrabold">Donor responses</h4><span className="text-xs text-slate-500">{pending.length} pending</span></div>{matches.length === 0 ? <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No matching donors were notified yet. Retry dispatch after confirming the request location and blood group.</p> : <div className="mt-3 overflow-x-auto"><table className="data-table"><thead><tr><th>Donor</th><th>Distance</th><th>Status</th><th>Contact</th></tr></thead><tbody>{matches.map((match) => <tr key={match.notificationId}><td><span className="font-semibold">{match.name}</span><small className="block text-slate-400">{match.bloodGroup}</small></td><td>{Number(match.distanceKm || 0).toFixed(1)} km</td><td><StatusBadge status={match.status} /></td><td>{match.status === 'accepted' && match.phone ? <a className="font-bold text-teal-700 hover:underline" href={`tel:${match.phone}`}>{match.phone}</a> : <span className="text-slate-400">After acceptance</span>}</td></tr>)}</tbody></table></div>}</div>
            <div className="mt-4 flex flex-wrap gap-2">{!['cancelled', 'fulfilled'].includes(request.status) && <button type="button" className="btn btn-secondary" onClick={() => retryDispatch(request._id)} disabled={workingId === request._id}><RefreshCw size={15} className={workingId === request._id ? 'animate-spin' : ''} /> Retry dispatch</button>}{!['cancelled', 'fulfilled'].includes(request.status) && <button type="button" className="btn btn-danger-ghost" onClick={() => cancelRequest(request._id)} disabled={workingId === request._id}><XCircle size={15} /> Cancel request</button>}</div>
          </article>;
        })}</div>}
        <div className="mt-6 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500"><Activity size={15} className="mt-0.5 shrink-0 text-teal-700" /> Live events update the list automatically. Use Refresh to reload saved database state after a reconnect.</div>
      </section>
    </div>
  </section>;
}
