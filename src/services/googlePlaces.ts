import { BrandType, GasStation } from '../types';

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchNearby';
const SEARCH_TEXT_URL = 'https://places.googleapis.com/v1/places:searchText';
// Field Essentials saja (nama, alamat, koordinat, status buka) — paling murah.
const FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.location,places.businessStatus';

interface PlacesApiPlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  businessStatus?: string;
}

function sanitizeId(raw: string): string {
  const clean = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100);
  return clean || `unknown-${Date.now()}`;
}

function detectBrand(name: string): BrandType {
  const hay = name.toLowerCase();
  if (hay.includes('pertamina')) return 'Pertamina';
  if (hay.includes('shell')) return 'Shell';
  if (hay.includes('vivo')) return 'Vivo';
  if (/\bbp\b/.test(hay) || hay.includes('bp-akr') || hay.includes('bp akr')) return 'BP';
  if (hay.includes('madura') || hay.includes('pertamini')) return 'Toko Madura';
  return 'Lainnya';
}

/**
 * Cari SPBU beneran via Google Places API (New) — searchNearby.
 * Key dikirim dari browser (pastikan HTTP-referrer restriction terpasang).
 * Gagal (kuota/key/403) → throw agar caller fallback ke OSM.
 */
export async function fetchGoogleNearbyFuel(
  lat: number,
  lng: number,
  radiusM: number,
  apiKey: string,
  signal?: AbortSignal
): Promise<GasStation[]> {
  const started = performance.now();
  const res = await fetch(PLACES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: ['gas_station'],
      maxResultCount: 20,
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lng }, radius: Math.round(radiusM) },
      },
    }),
    signal,
  });
  if (!res.ok) throw new Error(`Places ${res.status}`);
  const json = (await res.json()) as { places?: PlacesApiPlace[] };
  const stations = mapPlacesToStations(json.places);
  const ms = Math.round(performance.now() - started);
  console.info(`[Places] ${stations.length} SPBU dalam ${ms} ms`);
  return stations;
}

function mapPlacesToStations(places: PlacesApiPlace[] | undefined): GasStation[] {
  const stations: GasStation[] = [];
  for (const p of places ?? []) {
    const plat = p.location?.latitude;
    const plng = p.location?.longitude;
    if (plat === undefined || plng === undefined) continue;
    if (p.businessStatus === 'CLOSED_PERMANENTLY') continue;
    const name = p.displayName?.text || 'SPBU (Google Places)';
    const brand = detectBrand(name);
    stations.push({
      id: `gplaces-${sanitizeId(p.id ?? `${plat},${plng}`)}`,
      code: 'GPLACES',
      name,
      brand,
      address: p.formattedAddress || 'Alamat dari Google Places',
      distanceKm: 0, // dihitung ulang live dari GPS di view
      lat: plat,
      lng: plng,
      queueStatus: 'Sepi',
      queueEstimateText: 'Belum ada laporan antrean',
      queueMinutes: 0,
      facilities: [],
      badges: ['Data Google Places'],
      fuels: [], // jujur: Google tidak tahu stok — diisi lewat laporan komunitas
      lastReportMinutesAgo: 0,
      contributorsCount: 0,
      verifiedCount: 0,
      notes: 'Lokasi dari Google Places. Stok & antrean belum ada — jadilah pelapor pertama.',
      reports: [],
    });
  }
  return stations;
}

/**
 * Cari SPBU via teks (ketikan user) — Places API (New) searchText.
 * Dipakai modal "Pilih SPBU" agar query tidak cuma filter cache lokal.
 * locationBias = lingkaran 20 km dari GPS agar relevan, tapi tetap bisa
 * menemukan SPBU di luar radius bootstrap 5 km.
 */
export async function fetchGoogleTextSearchFuel(
  query: string,
  lat: number,
  lng: number,
  apiKey: string,
  signal?: AbortSignal
): Promise<GasStation[]> {
  const q = query.trim();
  if (q.length < 3 || !apiKey) return [];
  const started = performance.now();
  const res = await fetch(SEARCH_TEXT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: q.includes('spbu') || q.toLowerCase().includes('shell')
        ? q
        : `SPBU ${q}`,
      includedType: 'gas_station',
      maxResultCount: 10,
      locationBias: {
        circle: { center: { latitude: lat, longitude: lng }, radius: 20000 },
      },
      languageCode: 'id',
      regionCode: 'ID',
    }),
    signal,
  });
  if (!res.ok) throw new Error(`PlacesText ${res.status}`);
  const json = (await res.json()) as { places?: PlacesApiPlace[] };
  const stations = mapPlacesToStations(json.places);
  const ms = Math.round(performance.now() - started);
  console.info(`[PlacesText] "${q}" → ${stations.length} SPBU dalam ${ms} ms`);
  return stations;
}
