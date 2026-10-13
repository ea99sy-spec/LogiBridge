// Distance, speed and arrival estimates for truck tracking (shared by browser and server).
const rad = (d) => (d * Math.PI) / 180;
export function distanceKm(a, b) {
  const dLat = rad(b.lat - a.lat),
    dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
// A truck within this distance of a crossing gate is "at the crossing"; it has left beyond LEAVE_KM.
export const ZONE_KM = 4;
export const LEAVE_KM = 6;
// Roads are longer than straight lines; trucks average about 55 km/h on these routes.
const ROAD_FACTOR = 1.3,
  DEFAULT_KMH = 55;

// Average speed over the last two hours of positions (km/h), or null if unknown.
export function recentSpeed(track = []) {
  if (track.length < 2) return null;
  const last = track[track.length - 1],
    since = Date.parse(last.at) - 2 * 3600000;
  const points = track.filter((p) => Date.parse(p.at) >= since);
  if (points.length < 2) return null;
  let km = 0;
  for (let i = 1; i < points.length; i++) km += distanceKm(points[i - 1], points[i]);
  const hours = (Date.parse(last.at) - Date.parse(points[0].at)) / 3600000;
  return hours > 0.1 ? km / hours : null;
}
// Remaining road distance and estimated arrival time to a target point.
export function estimateArrival(position, target, track = []) {
  if (!position || !target) return null;
  const km = distanceKm(position, target) * ROAD_FACTOR;
  const speed = recentSpeed(track);
  const kmh = speed && speed > 10 ? Math.min(speed, 90) : DEFAULT_KMH;
  const from = Math.max(Date.parse(position.at || 0) || Date.now(), Date.now() - 6 * 3600000);
  return {
    km: Math.round(km),
    at: new Date(from + (km / kmh) * 3600000).toISOString(),
    kmh: Math.round(kmh),
  };
}
// Reads "36.2, 36.6", a Google Maps link (@lat,lng or q=lat,lng) or an OpenStreetMap link.
export function parsePoint(value) {
  const text = String(value || "");
  const m =
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/.exec(text) ||
    /[?&](?:q|query|ll|mlat)=(-?\d+(?:\.\d+)?)(?:,|%2C|&mlon=)\s*(-?\d+(?:\.\d+)?)/i.exec(text) ||
    /^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(text);
  if (!m) return null;
  const lat = Number(m[1]),
    lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}
// Waiting time to a 0–4 queue level (same scale as the crossing reports).
export function waitLevel(minutes) {
  return minutes < 30 ? 0 : minutes < 120 ? 1 : minutes < 360 ? 2 : minutes < 720 ? 3 : 4;
}
