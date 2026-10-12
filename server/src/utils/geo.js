import AppError from "./AppError.js";

/** Convert a user-facing { lat, lng } pair to GeoJSON's [longitude, latitude] order. */
export function toGeoPoint(input) {
  const lat = Number(input?.lat);
  const lng = Number(input?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new AppError("Location must include numeric lat and lng values", 400);
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new AppError("Location coordinates are outside valid latitude/longitude bounds", 400);
  }

  return { type: "Point", coordinates: [lng, lat] };
}

/** Great-circle distance. Coordinates are GeoJSON [longitude, latitude]. */
export function distanceKm(pointA, pointB) {
  const [lng1, lat1] = pointA.coordinates;
  const [lng2, lat2] = pointB.coordinates;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371.0088;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function toLatLng(point) {
  if (!point?.coordinates || point.coordinates.length !== 2) return null;
  return { lng: point.coordinates[0], lat: point.coordinates[1] };
}
