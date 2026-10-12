import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { WARANGAL_CENTER } from '../utils/geo.js';

export default function LocationMap({ center = WARANGAL_CENTER, markers = [], zoom = 11, height = 240 }) {
  const validMarkers = markers.filter((m) => Number.isFinite(Number(m.lat)) && Number.isFinite(Number(m.lng)));
  const mapCenter = [Number(center?.lat ?? WARANGAL_CENTER.lat), Number(center?.lng ?? WARANGAL_CENTER.lng)];
  return <div className="map-frame" style={{ height }}>
    <MapContainer key={`${mapCenter[0]}-${mapCenter[1]}`} center={mapCenter} zoom={zoom} scrollWheelZoom={false} className="h-full w-full">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {validMarkers.map((marker, index) => <CircleMarker key={`${marker.label || 'pin'}-${index}`} center={[Number(marker.lat), Number(marker.lng)]} radius={8} pathOptions={{ color: marker.kind === 'donor' ? '#0f766e' : '#be123c', fillColor: marker.kind === 'donor' ? '#14b8a6' : '#f43f5e', fillOpacity: 0.9, weight: 3 }}>
        <Popup><strong>{marker.label || 'BloodBridge location'}</strong>{marker.description && <div>{marker.description}</div>}</Popup>
      </CircleMarker>)}
    </MapContainer>
  </div>;
}
