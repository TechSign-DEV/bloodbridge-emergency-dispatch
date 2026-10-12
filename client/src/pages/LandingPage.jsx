import { ArrowRight, Activity, Clock3, Crosshair, Heart, HeartPulse, Hospital, MapPin, ShieldCheck, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  { icon: Crosshair, title: 'Location-aware matching', text: 'The backend scans 5 km, then 10 km and 20 km using MongoDB geospatial queries.' },
  { icon: Clock3, title: 'Real-time donor alerts', text: 'Qualified nearby donors receive live dashboard notifications through Socket.IO.' },
  { icon: ShieldCheck, title: 'Avoid duplicate broadcasts', text: 'Each donor is invited once per request, while responses remain visible to the hospital.' },
];

export default function LandingPage() {
  return <>
    <section className="hero-wrap">
      <div className="page-wrap grid items-center gap-12 py-14 lg:grid-cols-[1.08fr_.92fr] lg:py-20">
        <div className="relative z-10">
          <div className="eyebrow"><span className="eyebrow-dot" /> GEO-PROXIMITY EMERGENCY DISPATCH</div>
          <h1 className="hero-title mt-6">When every<br /><span>minute matters.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">BloodBridge helps hospitals reach eligible voluntary blood donors nearby — with a location-based matching engine and real-time response tracking.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/donor/register" className="btn btn-primary btn-lg">Become a donor <ArrowRight size={18} /></Link>
            <Link to="/hospital/register" className="btn btn-secondary btn-lg"><Hospital size={18} /> Hospital portal</Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-slate-500">
            <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-teal-700" /> Role-based accounts</span>
            <span className="flex items-center gap-2"><Activity size={16} className="text-teal-700" /> Live status updates</span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-orbit hero-orbit-one" /><div className="hero-orbit hero-orbit-two" />
          <div className="hero-heart"><HeartPulse size={94} strokeWidth={1.5} /></div>
          <div className="floating-card floating-card-top"><span className="floating-icon green"><UsersRound size={18} /></span><div><b>Nearby donors</b><small>Radius expands automatically</small></div><span className="live-dot" /></div>
          <div className="floating-card floating-card-bottom"><span className="floating-icon rose"><MapPin size={18} /></span><div><b>Live dispatch</b><small>5 km · 10 km · 20 km</small></div><span className="pill-live">ACTIVE</span></div>
          <div className="map-spark map-spark-one" /><div className="map-spark map-spark-two" /><div className="map-spark map-spark-three" />
          <div className="hero-caption"><Heart size={14} fill="currentColor" /> Connecting help to those who need it</div>
        </div>
      </div>
    </section>
    <section className="page-wrap -mt-1 pb-5">
      <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3 sm:p-7">
        <div className="trust-item"><span className="trust-icon"><MapPin size={22} /></span><div><b>Geo-aware by design</b><p>MongoDB 2dsphere index and radius search</p></div></div>
        <div className="trust-item"><span className="trust-icon"><Activity size={22} /></span><div><b>Real-time coordination</b><p>Donor responses update hospital dashboards</p></div></div>
        <div className="trust-item"><span className="trust-icon"><HeartPulse size={22} /></span><div><b>Built for the prototype</b><p>MERN stack with two secure account roles</p></div></div>
      </div>
    </section>
    <section className="page-wrap py-16 lg:py-24">
      <div className="mx-auto max-w-2xl text-center"><div className="eyebrow justify-center">HOW BLOODBRIDGE WORKS</div><h2 className="section-title mt-4">A shorter path from request to response.</h2><p className="mt-4 text-slate-500">The application handles location-based discovery and coordination. Clinical eligibility and blood compatibility still require professional validation.</p></div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">{features.map(({ icon: Icon, title, text }, index) => <article className="feature-card" key={title}><div className="flex items-center justify-between"><span className="feature-icon"><Icon size={22} /></span><span className="feature-step">0{index + 1}</span></div><h3 className="mt-6 text-lg font-extrabold">{title}</h3><p className="mt-2 leading-7 text-slate-500">{text}</p></article>)}</div>
    </section>
    <section className="page-wrap pb-16"><div className="cta-panel"><div><div className="eyebrow eyebrow-light">START WITH YOUR ROLE</div><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">One network. Two ways to help.</h2><p className="mt-3 max-w-2xl leading-7 text-rose-50/80">Donors can respond to requests; hospitals can create emergency requests and track responses from one place.</p></div><div className="flex flex-col gap-3 sm:flex-row"><Link to="/donor/login" className="btn btn-white">Donor sign in <ArrowRight size={17} /></Link><Link to="/hospital/login" className="btn btn-outline-white">Hospital sign in</Link></div></div></section>
    <div className="page-wrap pb-10"><p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"><strong>Important:</strong>  Do not use it as the sole route for obtaining blood. Contact a licensed blood bank or emergency service and verify eligibility with qualified professionals.</p></div>
  </>;
}
