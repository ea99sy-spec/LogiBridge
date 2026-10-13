// Optional GPS coordinates sent from a phone browser (driver link or carrier workspace).
export function readPosition(body) {
  if (body.lat === undefined && body.lng === undefined) return null;
  const lat = Number(body.lat),
    lng = Number(body.lng),
    accuracy = body.accuracy === undefined ? null : Number(body.accuracy);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    throw new Error("Invalid location");
  return {
    lat: Math.round(lat * 1e5) / 1e5,
    lng: Math.round(lng * 1e5) / 1e5,
    accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? Math.round(accuracy) : null,
  };
}
export function requirePosition(body) {
  const position = readPosition(body || {});
  if (!position) throw new Error("Invalid location");
  return position;
}
