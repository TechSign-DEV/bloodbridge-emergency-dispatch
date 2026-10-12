export const WARANGAL_CENTER = { lat: 17.9689, lng: 79.5941 };

/** Convert API GeoJSON [longitude, latitude] into a {lat, lng} pair. */
export function fromGeoPoint(point) {
  const coordinates = point?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
  const [lng, lat] = coordinates;
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return null;
  return { lat: Number(lat), lng: Number(lng) };
}

export function locationValue(user) {
  return fromGeoPoint(user?.location) || WARANGAL_CENTER;
}

export function getBrowserCoordinates() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation is not supported by this browser.'));
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: Number(position.coords.latitude.toFixed(6)), lng: Number(position.coords.longitude.toFixed(6)) }),
      () => reject(new Error('Location permission was denied or the location is unavailable.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}

export function formatDate(date, options = { dateStyle: 'medium' }) {
  if (!date) return 'Not recorded';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? 'Not recorded' : new Intl.DateTimeFormat('en-IN', options).format(parsed);
}
