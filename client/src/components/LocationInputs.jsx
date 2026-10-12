import { MapPin, Navigation } from 'lucide-react';
import { useState } from 'react';
import { getBrowserCoordinates } from '../utils/geo.js';
import Feedback from './Feedback.jsx';

export default function LocationInputs({ value, onChange, required = true, label = 'Location coordinates' }) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  const handleCurrentLocation = async () => {
    setLocating(true);
    setError('');
    try { onChange(await getBrowserCoordinates()); }
    catch (err) { setError(err.message || 'Unable to get your location.'); }
    finally { setLocating(false); }
  };

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><label className="field-label"><MapPin size={15} />{label}</label><button type="button" onClick={handleCurrentLocation} disabled={locating} className="text-link"><Navigation size={14} />{locating ? 'Finding location…' : 'Use my current location'}</button></div>
    <div className="grid grid-cols-2 gap-3">
      <div><label className="field-label" htmlFor="latitude">Latitude</label><input id="latitude" type="number" step="any" min="-90" max="90" required={required} value={value.lat ?? ''} onChange={(e) => onChange({ ...value, lat: e.target.value })} placeholder="17.9689" className="input" /></div>
      <div><label className="field-label" htmlFor="longitude">Longitude</label><input id="longitude" type="number" step="any" min="-180" max="180" required={required} value={value.lng ?? ''} onChange={(e) => onChange({ ...value, lng: e.target.value })} placeholder="79.5941" className="input" /></div>
    </div>
    <p className="helper-text">Coordinates are used to find nearby donors. You may enter a location manually if browser location is unavailable.</p>
    <Feedback type="error">{error}</Feedback>
  </div>;
}
