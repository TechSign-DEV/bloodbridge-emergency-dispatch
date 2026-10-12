import { Activity, BellRing, Check, Clock3, HeartPulse, MapPin, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { getApiError } from '../api/client.js';
import Feedback from '../components/Feedback.jsx';
import LocationMap from '../components/LocationMap.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import useSocketEvents from '../hooks/useSocketEvents.js';
import { formatDate, locationValue } from '../utils/geo.js';

export default function DonorDashboard() {
  const [profile, setProfile] = useState(null); const [notifications, setNotifications] = useState([]); const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true); const [workingId, setWorkingId] = useState(''); const [feedback, setFeedback] = useState({ type: 'info', message: '' });
  const showMessage = (type, message) => setFeedback({ type, message });

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [profileRes, notificationsRes, historyRes] = await Promise.all([
        api.get('/donors/me'), api.get('/donors/notifications'), api.get('/donors/history'),
      ]);
      setProfile(profileRes.data.data.user);
      setNotifications(notificationsRes.data.data.notifications || []);
      setHistory(historyRes.data.data.history || []);
    } catch (error) { showMessage('error', getApiError(error)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useSocketEvents({
    'blood:request:new': (payload) => { showMessage('success', payload?.message || 'A new nearby request arrived. Review it below.'); refresh(true); },
    'blood:request:cancelled': () => { showMessage('info', 'A request you received has been cancelled.'); refresh(true); },
  });

  const pending = useMemo(() => notifications.filter((item) => item.status === 'pending'), [notifications]);
  const respond = async (notificationId, response) => {
    setWorkingId(notificationId); setFeedback({ type: 'info', message: '' });
    try {
      await api.patch(`/donors/notifications/${notificationId}/respond`, { response });
      showMessage('success', response === 'accepted' ? 'You accepted the request. The hospital has been notified.' : 'You declined the request.');
      await refresh(true);
    } catch (error) { showMessage('error', getApiError(error)); await refresh(true); }
    finally { setWorkingId(''); }
  };

  const toggleAvailability = async () => {
    if (!profile) return;
    try {
      const { data } = await api.patch('/donors/me/availability', { isAvailable: !profile.isAvailable });
      setProfile(data.data.user); showMessage('success', `You are now ${data.data.user.isAvailable ? 'available' : 'unavailable'} for requests.`);
    } catch (error) { showMessage('error', getApiError(error)); }
  };

  const location = locationValue(profile);
  return <section className="page-wrap py-8 lg:py-10">
    <div className="dashboard-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> DONOR WORKSPACE</div><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Good to have you here{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}.</h1><p className="mt-2 text-slate-500">Review local requests and choose when you are available to help.</p></div><button type="button" className="btn btn-secondary shrink-0" onClick={() => refresh()} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh</button></div>
    <Feedback type={feedback.type} onClose={() => setFeedback({ type: 'info', message: '' })}>{feedback.message}</Feedback>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="stat-card"><span className="stat-icon rose-bg"><BellRing size={20} /></span><p>Pending requests</p><strong>{pending.length}</strong><small>Waiting for your response</small></div>
      <div className="stat-card"><span className="stat-icon teal-bg"><Check size={20} /></span><p>Accepted requests</p><strong>{notifications.filter((i) => i.status === 'accepted').length}</strong><small>Visible in your history</small></div>
      <div className="stat-card"><span className="stat-icon amber-bg"><Activity size={20} /></span><p>Blood group</p><strong>{profile?.bloodGroup || '—'}</strong><small>Exact match only in this demo</small></div>
      <div className="stat-card"><span className="stat-icon slate-bg"><ShieldCheck size={20} /></span><p>Availability</p><strong className="text-2xl">{profile?.isAvailable ? 'Available' : 'Paused'}</strong><small>{profile?.isAvailable ? 'Eligible for matching' : 'Not included in searches'}</small></div>
    </div>

    <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_330px]">
      <div className="space-y-6">
        <section className="section-card"><div className="section-card-heading"><div><div className="eyebrow">ACTION REQUIRED</div><h2 className="mt-1 text-xl font-extrabold">Nearby blood requests <span className="count-pill">{pending.length}</span></h2></div><span className="live-indicator"><span /> Live updates</span></div>
          {loading ? <div className="empty-state"><RefreshCw className="animate-spin" size={22} /> Loading your requests…</div> : pending.length === 0 ? <div className="empty-state"><span className="empty-icon"><HeartPulse size={24} /></span><strong>You are all caught up</strong><p>New qualifying requests will appear here as soon as the backend dispatches them.</p></div> : <div className="space-y-4">{pending.map((notification) => {
            const request = notification.bloodRequest || {}; const hospital = request.hospital || {};
            return <article className="request-card" key={notification._id}><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="blood-type-large">{request.bloodGroupRequired || '—'}</div><div><h3 className="font-extrabold text-slate-900">{hospital.name || 'Hospital blood request'}</h3><p className="mt-1 text-sm text-slate-500">{request.unitsNeeded || 1} unit(s) needed · {formatDate(notification.createdAt)}</p></div></div><StatusBadge status={request.urgency || 'high'} /></div><div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-3"><div><span className="muted-label">Distance</span><b className="mt-1 block">{Number(notification.distanceKm || 0).toFixed(1)} km away</b></div><div><span className="muted-label">Search radius</span><b className="mt-1 block">{notification.radiusKm || '—'} km</b></div><div><span className="muted-label">Urgency</span><b className="mt-1 block capitalize">{request.urgency || 'High'}</b></div></div><p className="mt-3 text-sm leading-6 text-slate-500">{hospital.address || 'The hospital address was not provided.'} {hospital.phone ? `· ${hospital.phone}` : ''}</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><button type="button" className="btn btn-success flex-1 justify-center" disabled={workingId === notification._id || request.status === 'cancelled' || request.status === 'fulfilled'} onClick={() => respond(notification._id, 'accepted')}>{workingId === notification._id ? 'Saving…' : <><Check size={16} /> Accept request</>}</button><button type="button" className="btn btn-danger-ghost flex-1 justify-center" disabled={workingId === notification._id} onClick={() => respond(notification._id, 'rejected')}><X size={16} /> Decline</button></div>{(request.status === 'cancelled' || request.status === 'fulfilled') && <p className="mt-3 text-xs font-semibold text-amber-700">This request is no longer accepting responses.</p>}</article>;
          })}</div>}
        </section>
        <section className="section-card"><div className="section-card-heading"><div><div className="eyebrow">ACTIVITY LOG</div><h2 className="mt-1 text-xl font-extrabold">Response history</h2></div><span className="count-pill">{history.length}</span></div>
          {history.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No completed responses yet.</p> : <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Hospital</th><th>Blood group</th><th>Response</th><th>Date</th></tr></thead><tbody>{history.map((item) => <tr key={item._id}><td className="font-semibold">{item.bloodRequest?.hospital?.name || 'Hospital request'}</td><td>{item.bloodRequest?.bloodGroupRequired || '—'}</td><td><StatusBadge status={item.status} /></td><td>{formatDate(item.respondedAt || item.createdAt)}</td></tr>)}</tbody></table></div>}
        </section>
      </div>
      <aside className="space-y-5"><section className="section-card"><div className="section-card-heading"><div><div className="eyebrow">YOUR PROFILE</div><h2 className="mt-1 text-lg font-extrabold">Donor status</h2></div><span className="avatar-large"><HeartPulse size={23} /></span></div><div className="mt-5 space-y-4"><div className="profile-row"><span>Name</span><b>{profile?.name || '—'}</b></div><div className="profile-row"><span>Blood group</span><b>{profile?.bloodGroup || '—'}</b></div><div className="profile-row"><span>Last donated</span><b>{formatDate(profile?.lastDonatedAt)}</b></div><div className="profile-row"><span>Account phone</span><b>{profile?.phone || '—'}</b></div></div><div className="mt-5 rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between gap-4"><div><b className="block text-sm">Available for requests</b><p className="mt-1 text-xs leading-5 text-slate-500">Only turn this on when you are willing and eligible to respond.</p></div><button type="button" className={`toggle ${profile?.isAvailable ? 'toggle-on' : ''}`} aria-pressed={Boolean(profile?.isAvailable)} onClick={toggleAvailability}><span /></button></div></div></section>
      <section className="section-card"><div className="section-card-heading"><div><div className="eyebrow">LOCATION</div><h2 className="mt-1 text-lg font-extrabold">Your registered area</h2></div><MapPin size={18} className="text-teal-700" /></div><div className="mt-4"><LocationMap center={location} markers={[{ ...location, label: 'Your registered location', kind: 'donor' }]} zoom={12} height={205} /></div><p className="mt-3 text-xs leading-5 text-slate-500">{location.lat.toFixed(4)}, {location.lng.toFixed(4)} · Location editing is available through the API in this phase.</p></section>
      <div className="notice-card"><ShieldCheck size={18} /><p><strong>Stay safe.</strong> Responding to a request does not confirm medical eligibility. Follow the instructions of a licensed blood bank or clinician.</p></div></aside>
    </div>
  </section>;
}
