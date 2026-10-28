/** Util geografi terpusat: jarak haversine + fallback lokasi. */

export const DEFAULT_COORDS: [number, number] = [-6.2415, 106.848]; // Duren Tiga / Pancoran (fallback)

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Bulatkan jarak ke 1 desimal (min 0.1 km agar tidak 0). */
export function roundDistanceKm(km: number): number {
  if (!Number.isFinite(km)) return 0;
  return Math.max(0.1, Math.round(km * 10) / 10);
}

export function formatCoordLabel(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}
