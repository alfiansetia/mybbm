import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_COORDS, formatCoordLabel } from '../utils/geo';

export type LocationStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseUserLocationResult {
  coords: [number, number];
  accuracyM: number | null;
  label: string;
  status: LocationStatus;
  error: string | null;
  isFallback: boolean;
  requestLocation: () => void;
}

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 12000,
  maximumAge: 30000,
};

const LAST_LOCATION_KEY = 'mybbm_last_location';
const FALLBACK_LABEL = 'Duren Tiga, Pancoran, Jakarta Selatan';

interface CachedLocation {
  coords: [number, number];
  accuracyM: number | null;
  label: string;
}

/** Cache global + persisten: pindah halaman / reload tidak mengulang GPS dari nol. */
let globalCache: CachedLocation | null = null;

function loadPersistedLocation(): CachedLocation | null {
  if (globalCache) return globalCache;
  try {
    const raw = localStorage.getItem(LAST_LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedLocation;
    if (
      Array.isArray(parsed.coords) &&
      Number.isFinite(parsed.coords[0]) &&
      Number.isFinite(parsed.coords[1])
    ) {
      globalCache = parsed;
      return parsed;
    }
  } catch {
    // abaikan — pakai default
  }
  return null;
}

function persistLocation(entry: CachedLocation) {
  globalCache = entry;
  try {
    localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(entry));
  } catch {
    // storage penuh — cache memori tetap jalan
  }
}

/** Reverse-geocode gratis tanpa API key (BigDataCloud client). Gagal = fallback koordinat. */
async function reverseGeocodeLabel(lat: number, lng: number): Promise<string | null> {
  try {
    const url =
      `https://api.bigdatacloud.net/data/reverse-geocode-client` +
      `?latitude=${lat}&longitude=${lng}&localityLanguage=id`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const city =
      data.city || data.locality || data.principalSubdivision || '';
    const district =
      data.localityInfo?.administrative?.find((a: { order?: number; name?: string }) => a.order === 4)?.name ||
      data.localityInfo?.administrative?.find((a: { order?: number; name?: string }) => a.order === 3)?.name ||
      '';
    const parts = [district, city].filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
    if (data.plusCode) return data.plusCode as string;
    return null;
  } catch {
    return null;
  }
}

export function useUserLocation(autoRequest = true): UseUserLocationResult {
  // Mulai dari titik terakhir (bukan default) agar kembali dari detail langsung ke titik semula.
  const [coords, setCoords] = useState<[number, number]>(
    () => loadPersistedLocation()?.coords ?? DEFAULT_COORDS
  );
  const [accuracyM, setAccuracyM] = useState<number | null>(
    () => loadPersistedLocation()?.accuracyM ?? null
  );
  const [label, setLabel] = useState(
    () => loadPersistedLocation()?.label ?? FALLBACK_LABEL
  );
  const [status, setStatus] = useState<LocationStatus>(() =>
    loadPersistedLocation() ? 'success' : 'idle'
  );
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const labelFetchedFor = useRef<string>('');
  const explicitReq = useRef(false);

  const applyPosition = useCallback(async (pos: GeolocationPosition) => {
    explicitReq.current = false;
    const next: [number, number] = [pos.coords.latitude, pos.coords.longitude];
    const nextAccuracy = Math.round(pos.coords.accuracy ?? 0) || null;
    setCoords(next);
    setAccuracyM(nextAccuracy);
    setStatus('success');
    setError(null);

    const key = `${next[0].toFixed(3)},${next[1].toFixed(3)}`;
    // Simpan titik + label terakhir agar remount/reload langsung ke sini (refresh GPS diam-diam).
    persistLocation({
      coords: next,
      accuracyM: nextAccuracy,
      label: labelFetchedFor.current === key && globalCache ? globalCache.label : formatCoordLabel(next[0], next[1]),
    });
    if (labelFetchedFor.current === key) return;
    labelFetchedFor.current = key;

    // Optimistic: tampilkan koordinat dulu, lalu perkaya dengan nama daerah.
    setLabel((prev) =>
      prev === FALLBACK_LABEL ? formatCoordLabel(next[0], next[1]) : prev
    );
    const name = await reverseGeocodeLabel(next[0], next[1]);
    if (name) {
      setLabel(name);
      persistLocation({ coords: next, accuracyM: nextAccuracy, label: name });
    } else {
      setLabel(formatCoordLabel(next[0], next[1]));
    }
  }, []);

  const applyError = useCallback((err: GeolocationPositionError | Error) => {
    // Punya titik cache → pertahankan (refresh gagal diam-diam, tidak ada lompatan/error),
    // kecuali request eksplisit dari ketukan user (error wajib terlihat).
    const isExplicit = explicitReq.current;
    explicitReq.current = false;
    if (globalCache && !isExplicit) return;
    setStatus('error');
    if (err instanceof Error) {
      setError(err.message);
      return;
    }
    switch (err.code) {
      case err.PERMISSION_DENIED:
        setError('Izin lokasi ditolak. Aktifkan izin lokasi di browser lalu coba lagi.');
        break;
      case err.POSITION_UNAVAILABLE:
        setError('Posisi tidak tersedia. Pastikan GPS aktif.');
        break;
      case err.TIMEOUT:
        setError('Mencari lokasi kehabisan waktu — coba lagi di area terbuka.');
        break;
      default:
        setError('Gagal mendapatkan lokasi.');
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('error');
      setError('Browser tidak mendukung geolocation.');
      return;
    }
    explicitReq.current = true;
    setStatus((prev) => (prev === 'success' ? prev : 'loading'));
    // Jika sudah success, tetap refresh diam-diam (tanpa spinner penuh).
    if (status === 'success') {
      navigator.geolocation.getCurrentPosition(
        (pos) => void applyPosition(pos),
        (err) => applyError(err),
        GEO_OPTIONS
      );
      return;
    }
    setStatus('loading');
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => void applyPosition(pos),
      (err) => applyError(err),
      GEO_OPTIONS
    );
  }, [applyError, applyPosition, status]);

  // Auto-request sekali saat mount + live update via watchPosition.
  // Ada cache = refresh diam-diam (tanpa spinner/lompatan); tanpa cache = loading penuh.
  useEffect(() => {
    if (!autoRequest) return;
    if (!('geolocation' in navigator)) {
      if (!globalCache) {
        setStatus('error');
        setError('Browser tidak mendukung geolocation.');
      }
      return;
    }
    if (!globalCache) setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => void applyPosition(pos),
      (err) => applyError(err),
      GEO_OPTIONS
    );
    try {
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => void applyPosition(pos),
        () => {},
        { ...GEO_OPTIONS, timeout: 30000 }
      );
    } catch {
      // watchPosition opsional — abaikan bila gagal.
    }
    return () => {
      if (watchId.current !== null) {
        try {
          navigator.geolocation.clearWatch(watchId.current);
        } catch {
          // abaikan
        }
        watchId.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    coords,
    accuracyM,
    label,
    status,
    error,
    isFallback: status !== 'success',
    requestLocation,
  };
}
