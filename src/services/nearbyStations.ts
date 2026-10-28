import { BrandType, GasStation } from '../types';
import { haversineKm } from '../utils/geo';
import { fetchGoogleNearbyFuel } from './googlePlaces';

export type MapSource = 'google' | 'osm';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const MAX_RESULTS = 40;

interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function detectBrand(tags: Record<string, string>): BrandType {
  const hay = `${tags.brand ?? ''} ${tags.name ?? ''} ${tags.operator ?? ''}`.toLowerCase();
  if (hay.includes('pertamina')) return 'Pertamina';
  if (hay.includes('shell')) return 'Shell';
  if (hay.includes('vivo')) return 'Vivo';
  if (/\bbp\b/.test(hay) || hay.includes('bp-akr') || hay.includes('bp akr')) return 'BP';
  if (hay.includes('madura') || hay.includes('pertamini')) return 'Toko Madura';
  return 'Lainnya';
}

function buildAddress(tags: Record<string, string>): string {
  const road = tags['addr:road'] || tags['addr:street'] || '';
  const number = tags['addr:housenumber'] || '';
  const area =
    tags['addr:suburb'] || tags['addr:village'] || tags['addr:city'] || tags['addr:regency'] || '';
  const composed = [road && number ? `${road} No. ${number}` : road, area]
    .filter(Boolean)
    .join(', ');
  if (composed) return composed;
  if (tags['addr:full']) return tags['addr:full'];
  return 'Sekitar lokasi GPS (alamat OSM kosong)';
}

function mapElementToStation(el: OsmElement): GasStation | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat === undefined || lon === undefined) return null;
  const tags = el.tags ?? {};
  const brand = detectBrand(tags);
  const name = tags.name || tags.brand || (brand !== 'Lainnya' ? `SPBU ${brand}` : 'SPBU (data peta)');

  return {
    id: `osm-${el.type}-${el.id}`,
    code: `OSM-${el.id}`,
    name,
    brand,
    address: buildAddress(tags),
    distanceKm: 0, // dihitung ulang live dari GPS di view
    lat,
    lng: lon,
    queueStatus: 'Sepi',
    queueEstimateText: 'Belum ada laporan antrean',
    queueMinutes: 0,
    facilities: [],
    badges: ['Data Peta OSM'],
    fuels: [], // jujur: OSM tidak tahu stok — diisi lewat laporan komunitas
    lastReportMinutesAgo: 0,
    contributorsCount: 0,
    verifiedCount: 0,
    notes: 'Lokasi dari OpenStreetMap. Stok & antrean belum ada — jadilah pelapor pertama.',
    reports: [],
  };
}

async function postOverpass(
  endpoint: string,
  ql: string,
  signal?: AbortSignal
): Promise<{ stations: GasStation[]; endpoint: string }> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: `data=${encodeURIComponent(ql)}`,
    signal,
  });
  if (!res.ok) throw new Error(`Overpass ${res.status} @ ${endpoint}`);
  const json = (await res.json()) as { elements?: OsmElement[] };
  const stations = (json.elements ?? [])
    .map(mapElementToStation)
    .filter((s): s is GasStation => s !== null);
  return { stations, endpoint };
}

/**
 * Ambil SPBU beneran di sekitar koordinat dari OpenStreetMap (Overpass API).
 * Gratis, tanpa API key. Gagal (rate-limit/offline) → throw agar caller fallback ke data komunitas.
 *
 * Kenapa kadang lambat: instance publik dipakai bareng sedunia + antre (queue),
 * server di EU (RTT besar dari Indonesia), dan query `way` butuh hitung geometri.
 * Mitigasi: race 3 mirror paralel (pemenang tercepat dipakai, sisanya di-abort),
 * radius fetch = radius tampilan (luas area ~ r², jadi 2x radius = 4x lebih lambat).
 */
export async function fetchNearbyFuelStations(
  lat: number,
  lng: number,
  radiusM: number,
  signal?: AbortSignal
): Promise<GasStation[]> {
  const ql = `[out:json][timeout:25];(node["amenity"="fuel"](around:${Math.round(
    radiusM
  )},${lat},${lng});way["amenity"="fuel"](around:${Math.round(
    radiusM
  )},${lat},${lng}););out center tags ${MAX_RESULTS};`;

  const started = performance.now();
  const controllers = OVERPASS_ENDPOINTS.map(() => new AbortController());
  const onUserAbort = () => controllers.forEach((c) => c.abort());
  signal?.addEventListener('abort', onUserAbort, { once: true });

  try {
    const winner = await Promise.any(
      OVERPASS_ENDPOINTS.map((endpoint, i) => postOverpass(endpoint, ql, controllers[i].signal))
    );
    const ms = Math.round(performance.now() - started);
    console.info(`[OSM] ${winner.stations.length} SPBU dalam ${ms} ms via ${winner.endpoint}`);
    return winner.stations;
  } catch {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    throw new Error('Semua mirror Overpass sibuk/gagal — coba lagi atau pakai data komunitas');
  } finally {
    controllers.forEach((c) => {
      try {
        c.abort();
      } catch {
        // abaikan
      }
    });
    signal?.removeEventListener('abort', onUserAbort);
  }
}

/**
 * Gabung data komunitas (kaya: stok/laporan) dengan data peta (Google/OSM, lokasi real).
 * Duplikat (< minSeparationKm) dimenangkan data komunitas.
 */
export function mergeCommunityWithMap(
  community: GasStation[],
  mapStations: GasStation[],
  minSeparationKm = 0.15
): GasStation[] {
  const merged = [...community];
  for (const o of mapStations) {
    const dupe = merged.some(
      (c) => haversineKm(c.lat, c.lng, o.lat, o.lng) < minSeparationKm
    );
    if (!dupe && !merged.some((c) => c.id === o.id)) merged.push(o);
  }
  return merged;
}

/** Alias lama — dipertahankan agar import lama tidak rusak. */
export const mergeCommunityWithOsm = mergeCommunityWithMap;

export interface FetchMapStationsOptions {
  lat: number;
  lng: number;
  radiusM: number;
  /** Kosong = langsung OSM. */
  placesApiKey?: string;
  signal?: AbortSignal;
}

/**
 * Deteksi SPBU terdekat sekali jalan: Google Places dulu (cepat),
 * gagal → OSM gratis. Dipakai App (bootstrap saat dibuka) dan CekSpbuView.
 */
export async function fetchMapStations(
  opts: FetchMapStationsOptions
): Promise<{ stations: GasStation[]; source: MapSource }> {
  const { lat, lng, radiusM, placesApiKey, signal } = opts;
  if (placesApiKey) {
    try {
      const stations = await fetchGoogleNearbyFuel(lat, lng, radiusM, placesApiKey, signal);
      return { stations, source: 'google' };
    } catch (err) {
      if (signal?.aborted) throw err;
      console.warn('[Places] gagal, fallback ke OSM:', err);
    }
  }
  const stations = await fetchNearbyFuelStations(lat, lng, radiusM, signal);
  return { stations, source: 'osm' };
}

/** Gabung dua list stasiun berdasar id (untuk menampung hasil dari banyak sumber). */
export function mergeStationsById(...lists: GasStation[][]): GasStation[] {
  const map = new Map<string, GasStation>();
  for (const list of lists) {
    for (const st of list) {
      if (!map.has(st.id)) map.set(st.id, st);
    }
  }
  return [...map.values()];
}
