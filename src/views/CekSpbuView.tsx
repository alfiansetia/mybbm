import React, { useEffect, useMemo, useState } from 'react';
import { GasStation } from '../types';
import { StationMap } from '../components/StationMap';
import { BrandAvatar } from '../components/BrandAvatar';
import { getStationPinStatus } from '../utils/reputation';
import { formatRupiah } from '../utils/format';
import { useUserLocation } from '../hooks/useUserLocation';
import { haversineKm, roundDistanceKm } from '../utils/geo';
import { fetchMapStations, mergeCommunityWithMap, MapSource } from '../services/nearbyStations';
import { saveOsmStationsToDb } from '../services/dbService';

interface CekSpbuViewProps {
  stations: GasStation[];
  onSelectStation: (stationId: string) => void;
  onOpenReportModal: (stationId?: string) => void;
  /** Naikkan SPBU hasil peta (OSM) ke App agar bisa dibuka detailnya. */
  onNearbyUpdate?: (stations: GasStation[]) => void;
  /** True bila user login — syarat Firestore rules untuk menyimpan cache OSM. */
  canContribute?: boolean;
}

const OSM_CACHE_KEY = 'mybbm_map_cache';
const OSM_SYNCED_KEY = 'mybbm_osm_synced_ids';
const OSM_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 jam
const OSM_SYNC_MAX = 25; // batasi write per lokasi agar hemat kuota

function readMapCache(source: MapSource, cacheKey: string): GasStation[] | null {
  try {
    const raw = localStorage.getItem(OSM_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, { ts: number; stations: GasStation[] }>;
    const entry = parsed[`${source}|${cacheKey}`];
    if (!entry || Date.now() - entry.ts > OSM_CACHE_TTL_MS) return null;
    return entry.stations;
  } catch {
    return null;
  }
}

function writeMapCache(source: MapSource, cacheKey: string, stations: GasStation[]) {
  try {
    const raw = localStorage.getItem(OSM_CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, { ts: number; stations: GasStation[] }>) : {};
    parsed[`${source}|${cacheKey}`] = { ts: Date.now(), stations };
    // Batasi 20 sel cache agar tidak membengkak
    const keys = Object.keys(parsed);
    if (keys.length > 20) {
      const oldest = keys.sort((a, b) => parsed[a].ts - parsed[b].ts)[0];
      delete parsed[oldest];
    }
    localStorage.setItem(OSM_CACHE_KEY, JSON.stringify(parsed));
  } catch {
    // storage penuh — abaikan, fetch ulang lain waktu
  }
}

function loadSyncedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(OSM_SYNCED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

interface CekSpbuViewProps {
  stations: GasStation[];
  onSelectStation: (stationId: string) => void;
  onOpenReportModal: (stationId?: string) => void;
  /** Naikkan SPBU hasil peta (OSM) ke App agar bisa dibuka detailnya. */
  onNearbyUpdate?: (stations: GasStation[]) => void;
}

interface CekSpbuViewProps {
  stations: GasStation[];
  onSelectStation: (stationId: string) => void;
  onOpenReportModal: (stationId?: string) => void;
}

const FUEL_FILTERS = [
  { label: 'Semua', key: 'Semua', colorDot: 'bg-slate-400' },
  { label: 'Pertalite (RON 90)', key: 'Pertalite', colorDot: 'bg-[#ee2737]' },
  { label: 'Pertamax (RON 92)', key: 'Pertamax', colorDot: 'bg-[#005baa]' },
  { label: 'Bio Solar', key: 'Solar', colorDot: 'bg-slate-600' },
  { label: 'Shell Super', key: 'Shell Super', colorDot: 'bg-[#ffd200]' },
  { label: 'Toko Madura', key: 'Madura', colorDot: 'bg-[#894d00]' },
];

const RADII = ['1 km', '3 km', '5 km', '10 km'];

export const CekSpbuView: React.FC<CekSpbuViewProps> = ({
  stations,
  onSelectStation,
  onOpenReportModal,
  onNearbyUpdate,
  canContribute = false,
}) => {
  const [selectedFilter, setSelectedFilter] = useState('Semua');
  const [radiusIndex, setRadiusIndex] = useState(1); // default 3 km
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStationId, setActiveStationId] = useState<string | null>(null);
  const [showAllOutsideRadius, setShowAllOutsideRadius] = useState(false);
  const [showUnknownStock, setShowUnknownStock] = useState(false);
  const [osmStations, setOsmStations] = useState<GasStation[]>([]);
  const [osmStatus, setOsmStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [mapSource, setMapSource] = useState<MapSource>('google');
  const [osmSync, setOsmSync] = useState<{ phase: 'idle' | 'saving' | 'done'; saved: number }>({ phase: 'idle', saved: 0 });
  const syncedIds = React.useRef<Set<string> | null>(null);
  const { coords: userCoords, accuracyM, label: locationLabel, status: locStatus, error: locError, isFallback, requestLocation } =
    useUserLocation(true);

  const radius = RADII[radiusIndex];
  const locating = locStatus === 'loading';

  // Ambil SPBU beneran di sekitar GPS: Google Places dulu (cepat), gagal → OSM (gratis).
  // Strategi stale-while-revalidate: tampilkan cache lokal dulu, fetch segar di background.
  useEffect(() => {
    if (locStatus !== 'success') return;
    const maxRadius = parseInt(RADII[radiusIndex], 10);
    // Fetch = radius tampilan persis (luas area ~ r²; 2x radius = 4x data = jauh lebih lambat).
    const fetchRadiusM = Math.min(10000, Math.max(1000, maxRadius * 1000));
    const cacheKey = `${userCoords[0].toFixed(3)},${userCoords[1].toFixed(3)},r${maxRadius}`;
    const apiKey =
      import.meta.env.VITE_GOOGLE_PLACES_API_KEY ||
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
      '';

    const googleCached = readMapCache('google', cacheKey);
    const osmCached = readMapCache('osm', cacheKey);
    const initial = googleCached?.length ? { src: 'google' as MapSource, list: googleCached }
      : osmCached?.length ? { src: 'osm' as MapSource, list: osmCached }
      : null;
    const hadCache = !!initial;
    if (initial) {
      setOsmStations(initial.list);
      setMapSource(initial.src);
      setOsmStatus('success');
    } else {
      setOsmStatus('loading');
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetchMapStations({
        lat: userCoords[0],
        lng: userCoords[1],
        radiusM: fetchRadiusM,
        placesApiKey: apiKey || undefined,
        signal: ctrl.signal,
      })
        .then(({ stations: list, source }) => {
          if (ctrl.signal.aborted) return;
          setOsmStations(list);
          setMapSource(source);
          setOsmStatus('success');
          writeMapCache(source, cacheKey, list);
        })
        .catch((err) => {
          if (ctrl.signal.aborted) return;
          console.warn('[Peta] fetch SPBU gagal, pakai data komunitas:', err);
          // Cache basi tetap lebih baik daripada kosong.
          if (!hadCache) setOsmStatus('error');
        });
    }, hadCache ? 1500 : 600);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locStatus, radiusIndex, `${userCoords[0].toFixed(3)},${userCoords[1].toFixed(3)}`]);

  // Simpan SPBU peta yang baru ke Firestore di background (hanya saat login,
  // sesuai rules). User lain langsung menerimanya via snapshot — tanpa fetch ulang.
  useEffect(() => {
    if (!canContribute || osmStations.length === 0) return;
    if (syncedIds.current === null) syncedIds.current = loadSyncedIds();
    const communityIds = new Set(stations.map((s) => s.id));
    const candidates = osmStations.filter(
      (s) =>
        (s.id.startsWith('osm-') || s.id.startsWith('gplaces-')) &&
        !communityIds.has(s.id) &&
        !syncedIds.current!.has(s.id)
    );
    if (candidates.length === 0) return;
    const batch = candidates.slice(0, OSM_SYNC_MAX);
    setOsmSync({ phase: 'saving', saved: 0 });
    let cancelled = false;
    saveOsmStationsToDb(batch)
      .then(({ savedIds }) => {
        if (cancelled) return;
        if (syncedIds.current === null) syncedIds.current = new Set();
        savedIds.forEach((id) => syncedIds.current!.add(id));
        try {
          localStorage.setItem(OSM_SYNCED_KEY, JSON.stringify([...syncedIds.current].slice(-500)));
        } catch {
          // abaikan
        }
        setOsmSync({ phase: 'done', saved: savedIds.length });
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('[OSM] sync ke Firestore gagal:', err);
          setOsmSync({ phase: 'idle', saved: 0 });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [osmStations, canContribute]);

  // Naikkan hasil OSM ke App agar kartu OSM bisa dibuka detail + dilaporkan.
  useEffect(() => {
    onNearbyUpdate?.(osmStations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [osmStations]);

  // Gabung komunitas + peta (duplikat <150 m dimenangkan data komunitas).
  const mergedStations = useMemo(
    () => mergeCommunityWithMap(stations, osmStations),
    [stations, osmStations]
  );

  // Hitung jarak live dari GPS — bukan jarak dummy bawaan seed.
  const stationsWithLiveDistance = useMemo<GasStation[]>(
    () =>
      mergedStations
        .map((s) => ({
          ...s,
          distanceKm: roundDistanceKm(haversineKm(userCoords[0], userCoords[1], s.lat, s.lng)),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm),
    [mergedStations, userCoords]
  );

  // Filter dasar (search + fuel) — dipakai untuk marker peta agar pin tidak hilang
  // hanya karena radius kekecilan / posisi GPS jauh dari data seed.
  // Catatan jujur: Google Places/OSM tidak menyediakan info jenis BBM per SPBU,
  // jadi SPBU peta (stok belum diketahui) disembunyikan saat filter BBM spesifik —
  // kecuali user mengaktifkan showUnknownStock secara eksplisit.
  const matchesSearchFuel = (station: GasStation, includeUnknownStock: boolean) => {
    const matchesSearch =
      station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      station.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      station.brand.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedFilter === 'Semua') return true;
    if (selectedFilter === 'Madura') return station.brand === 'Toko Madura';

    if (station.fuels.length === 0) return includeUnknownStock;

    return station.fuels.some((f) =>
      f.type.toLowerCase().includes(selectedFilter.toLowerCase())
    );
  };

  const baseFiltered = stationsWithLiveDistance.filter((s) => matchesSearchFuel(s, showUnknownStock));
  // SPBU peta yang disembunyikan filter BBM karena stoknya belum diketahui
  const hiddenUnknownStock = selectedFilter !== 'Semua' && selectedFilter !== 'Madura' && !showUnknownStock
    ? stationsWithLiveDistance.filter((s) => matchesSearchFuel(s, true) && !matchesSearchFuel(s, false)).length
    : 0;

  // Filter radius — hanya untuk daftar "Terdekat", bukan untuk pin peta.
  const maxRadius = parseInt(radius, 10);
  const filteredStations = (
    showAllOutsideRadius ? baseFiltered : baseFiltered.filter((s) => s.distanceKm <= maxRadius)
  );
  const hiddenByRadius = baseFiltered.length - filteredStations.length;
  const nearestOutside = baseFiltered[0] ?? null;

  const toggleRadius = () => {
    setShowAllOutsideRadius(false);
    setRadiusIndex((prev) => (prev + 1) % RADII.length);
  };

  const handleOpenGoogleMaps = (station: GasStation) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}&query=${encodeURIComponent(
      station.name
    )}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col w-full gap-4 pb-28">
      {/* 1. Floating Live Monitor Ribbon */}
      <div className="flex items-center justify-between px-3.5 py-1.5 rounded-full bg-[#99efe5]/40 text-[#006f67] border border-[#006a63]/20 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]" />
          </span>
          <span className="text-xs font-semibold truncate">
            {filteredStations.length} SPBU aktif dipantau di sekitarmu
            {osmStatus === 'loading'
              ? ' • mencari SPBU peta…'
              : osmStations.length > 0
              ? ` • ${osmStations.length} dari ${mapSource === 'google' ? 'Google' : 'OSM'}`
              : ''}
          </span>
        </div>
        <span className="text-[10px] bg-white/90 px-2 py-0.5 rounded-full font-bold shadow-xs">
          {osmStatus === 'success' && osmStations.length > 0
            ? `${mapSource === 'google' ? 'Google' : 'OSM'} + Komunitas`
            : 'Realtime'}
        </span>
      </div>
      {osmStatus === 'error' && (
        <p className="text-[11px] text-slate-500 -mt-2 px-1">
          SPBU peta (Google + OSM) gagal dimuat — menampilkan data komunitas. Ketuk lokasi untuk coba lagi.
        </p>
      )}
      {osmSync.phase === 'saving' && (
        <p className="text-[11px] text-slate-500 -mt-2 px-1 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
          Menyimpan SPBU baru ke database…
        </p>
      )}
      {osmSync.phase === 'done' && osmSync.saved > 0 && (
        <p className="text-[11px] text-[#006f67] -mt-2 px-1">
          {osmSync.saved} SPBU baru tersimpan — pengguna lain langsung melihatnya tanpa loading.
        </p>
      )}

      {/* 2. Search & Location Bar + Radius Picker */}
      <div className="flex flex-col gap-2">
        <button
          onClick={requestLocation}
          title={isFallback ? 'Ketuk untuk aktifkan lokasi GPS' : 'Ketuk untuk refresh lokasi GPS'}
          type="button"
          className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-slate-200/90 shadow-sm text-left active:scale-[0.99] transition-transform w-full"
        >
          <div className="flex items-center flex-1 min-w-0 px-2 gap-2">
            <span
              className={`material-symbols-outlined text-[20px] shrink-0 ${locating ? 'animate-spin text-[#006194]' : isFallback ? 'text-slate-400' : 'text-[#006194]'}`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {locating ? 'progress_activity' : 'my_location'}
            </span>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none flex items-center gap-1">
                Lokasi Kamu
                {isFallback && locStatus !== 'loading' && (
                  <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-px rounded-full normal-case tracking-normal">
                    {locStatus === 'error' ? 'GPS mati — ketuk' : 'Mencari GPS…'}
                  </span>
                )}
              </span>
              <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                {locating && isFallback ? 'Mencari lokasi GPS…' : locationLabel}
              </p>
              {locError ? (
                <p className="text-[10px] text-red-500 truncate mt-0.5">{locError}</p>
              ) : accuracyM ? (
                <p className="text-[10px] text-slate-400 mt-0.5">Akurasi ±{accuracyM} m</p>
              ) : null}
            </div>
          </div>

          {/* Radius Selector Pill */}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              toggleRadius();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                toggleRadius();
              }
            }}
            title="Ubah Radius Pencarian"
            className="h-8 px-2.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#006194] text-xs font-bold flex items-center gap-1 shrink-0 transition-colors active:scale-95 border border-sky-200 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">radar</span>
            <span>{radius}</span>
            <span className="material-symbols-outlined text-[15px] text-slate-400">expand_more</span>
          </span>
        </button>

        {/* Quick Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama SPBU, jalan, atau brand..."
            className="w-full h-10 pl-9 pr-8 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006194] shadow-xs"
          />
          <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[18px] text-slate-400">
            search
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Horizontal Filter Chips (Fuel Type) */}
      <div className="overflow-x-auto -mx-4 px-4 py-1 flex items-center gap-2 no-scrollbar">
        {FUEL_FILTERS.map((f) => {
          const isActive = selectedFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => {
                setSelectedFilter(f.key);
                setShowUnknownStock(false);
              }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs ${
                isActive
                  ? 'bg-[#006194] text-white shadow-sm ring-2 ring-[#006194]/30'
                  : 'bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50'
              }`}
              type="button"
            >
              <span className={`w-2 h-2 rounded-full ${f.colorDot}`} />
              <span>{f.label}</span>
              {isActive && (
                <span className="material-symbols-outlined text-[14px]">check</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Hint: SPBU peta disembunyikan filter BBM (Google/OSM tak menyediakan info stok) */}
      {hiddenUnknownStock > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2 -mt-1">
          <p className="text-[11px] text-slate-600 font-medium">
            {hiddenUnknownStock} SPBU peta disembunyikan — stoknya belum diketahui.
          </p>
          <button
            onClick={() => setShowUnknownStock(true)}
            className="shrink-0 text-[11px] font-bold text-[#006194] bg-white px-2.5 py-1 rounded-lg border border-sky-200"
            type="button"
          >
            Tetap tampilkan
          </button>
        </div>
      )}

      {/* 4. Interactive OpenStreetMap Canvas */}
      <StationMap        stations={baseFiltered}
        selectedStationId={activeStationId}
        onSelectStation={(id) => {
          setActiveStationId(id);
          onSelectStation(id);
        }}
        userCoords={userCoords}
        accuracyM={accuracyM}
        locating={locating}
        onLocate={requestLocation}
      />

      {/* 5. Station Cards Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-bold text-slate-800 font-headline">Daftar SPBU Terdekat</h2>
          <span className="text-[11px] bg-sky-100 text-[#004b73] px-2 py-0.5 rounded-full font-bold">
            {filteredStations.length} Pilihan
          </span>
        </div>
        <span className="text-xs text-slate-500 font-medium">Radius {radius}</span>
      </div>

      {/* Info: ada SPBU tapi di luar radius — umum bila GPS jauh dari data seed Jakarta */}
      {hiddenByRadius > 0 && !showAllOutsideRadius && nearestOutside && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
          <p className="text-[11px] text-amber-800 font-medium">
            {hiddenByRadius} SPBU di luar radius {radius} (terdekat {nearestOutside.distanceKm} km).
          </p>
          <button
            onClick={() => setShowAllOutsideRadius(true)}
            className="shrink-0 text-[11px] font-bold text-[#006194] bg-white px-2.5 py-1 rounded-lg border border-sky-200"
            type="button"
          >
            Tampilkan semua
          </button>
        </div>
      )}

      {/* 6. Gas Stations Cards Stack */}
      <div className="flex flex-col gap-3.5">
        {filteredStations.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-slate-200 shadow-sm flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-[40px] text-slate-300">search_off</span>
            <p className="text-sm font-bold text-slate-700">Tidak ada SPBU sesuai kriteria</p>
            <p className="text-xs text-slate-500">
              {baseFiltered.length === 0 ? (
                <>Tidak cocok dengan pencarian / filter BBM. Coba kata kunci atau BBM lain.</>
              ) : (
                <>Semua {baseFiltered.length} SPBU di luar radius {radius}
                {nearestOutside ? <> (terdekat {nearestOutside.distanceKm} km)</> : null}.</>
              )}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {baseFiltered.length > 0 && (
                <button
                  onClick={() => setShowAllOutsideRadius(true)}
                  className="text-xs font-bold text-white bg-[#006194] px-3 py-1.5 rounded-lg"
                  type="button"
                >
                  Tampilkan {baseFiltered.length} terdekat
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedFilter('Semua');
                  setSearchQuery('');
                  setShowAllOutsideRadius(false);
                  setRadiusIndex(3); // 10 km
                }}
                className="text-xs font-bold text-[#006194] bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-200"
                type="button"
              >
                Reset Filter & Radius 10 km
              </button>
            </div>
          </div>
        ) : (
          filteredStations.map((station) => {
            const pinStatus = getStationPinStatus(station, selectedFilter);
            const isMadura = station.brand === 'Toko Madura';

            // Find relevant fuel to highlight
            const targetFuel =
              selectedFilter !== 'Semua' && selectedFilter !== 'Madura'
                ? station.fuels.find((f) => f.type.toLowerCase().includes(selectedFilter.toLowerCase()))
                : station.fuels[0];

            const pertaliteFuel = station.fuels.find((f) => f.type.toLowerCase().includes('pertalite'));
            const pertamaxFuel = station.fuels.find((f) => f.type.toLowerCase().includes('pertamax'));

            return (
              <div
                key={station.id}
                className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-sm flex flex-col gap-2.5 transition-all hover:shadow-md"
              >
                {/* Station Top Info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-2.5 min-w-0">
                    <BrandAvatar brand={station.brand} size="lg" />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1">
                        <h3 className="text-sm font-bold text-slate-900 truncate font-headline">
                          {station.name}
                        </h3>
                        {isMadura && (
                          <span className="material-symbols-outlined text-[15px] text-[#059669]" title="Terverifikasi">
                            verified
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {station.address} ({station.distanceKm} km)
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                      pinStatus.color === 'green'
                        ? 'bg-emerald-50 text-[#059669] border border-emerald-200'
                        : pinStatus.color === 'amber'
                        ? 'bg-amber-50 text-[#d97706] border border-amber-200'
                        : pinStatus.color === 'red'
                        ? 'bg-red-50 text-[#dc2626] border border-red-200'
                        : pinStatus.color === 'gray'
                        ? 'bg-slate-100 text-slate-500 border border-slate-300'
                        : 'bg-amber-100 text-[#894d00] border border-amber-300'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        pinStatus.color === 'green'
                          ? 'bg-[#059669]'
                          : pinStatus.color === 'amber'
                          ? 'bg-[#d97706]'
                          : pinStatus.color === 'red'
                          ? 'bg-[#dc2626]'
                          : pinStatus.color === 'gray'
                          ? 'bg-slate-400'
                          : 'bg-[#894d00]'
                      }`}
                    />
                    {pinStatus.label.toUpperCase()}
                  </span>
                </div>

                {/* Depleted Alert Callout if Pertalite or Solar is empty */}
                {pertaliteFuel && pertaliteFuel.status === 'Kosong' && (
                  <div className="bg-red-50 border border-red-200/80 rounded-lg p-2 flex items-center justify-between text-red-800">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="material-symbols-outlined text-[16px] text-[#dc2626] shrink-0">
                        info
                      </span>
                      <span className="text-xs font-semibold truncate">
                        {pertaliteFuel.notes || `Pertalite kosong sejak ${station.lastReportMinutesAgo} mnt lalu`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Primary Fuel status snippet */}
                {targetFuel ? (
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{targetFuel.type}</span>
                      <span className="text-[11px] text-slate-500">
                        {formatRupiah(targetFuel.price)}/L
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                      <span className="material-symbols-outlined text-[13px]">history</span>
                      <span>{station.lastReportMinutesAgo} mnt lalu • {station.verifiedCount} verifikasi</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => onSelectStation(station.id)}
                    type="button"
                    className="bg-sky-50 border border-sky-200 rounded-lg p-2 flex items-center justify-between text-left active:scale-[0.99] transition-transform w-full"
                  >
                    <span className="text-xs font-semibold text-[#004b73]">
                      Stok belum ada laporan — jadilah pelapor pertama
                    </span>
                    <span className="material-symbols-outlined text-[16px] text-[#006194]">chevron_right</span>
                  </button>
                )}

                {/* Alternative fuel ready if primary is out */}
                {pertaliteFuel?.status === 'Kosong' && pertamaxFuel?.status === 'Tersedia' && (
                  <div className="flex items-center justify-between text-xs px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#059669]" />
                      <span className="text-slate-700 font-medium">Pertamax (RON 92) Ready</span>
                    </div>
                    <span className="text-slate-500 font-medium">
                      {formatRupiah(pertamaxFuel.price)}/L
                    </span>
                  </div>
                )}

                {/* Madura Note */}
                {isMadura && (
                  <div className="flex items-center gap-1 text-slate-500 text-xs">
                    <span className="material-symbols-outlined text-[15px] text-[#006a63]">
                      local_shipping
                    </span>
                    <span className="truncate">Pertamini digital & eceran terverifikasi warga sekitar</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => onSelectStation(station.id)}
                    className="h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#006194] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[17px]">rate_review</span>
                    <span>Detail & Lapor</span>
                  </button>

                  <button
                    onClick={() => handleOpenGoogleMaps(station)}
                    className="h-9 rounded-lg bg-[#006194] hover:bg-[#007bb9] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[17px]">directions</span>
                    <span>Buka Rute</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 7. Crowdsource Contribution Prompt Card */}
      <div className="rounded-xl bg-gradient-to-r from-sky-50 via-teal-50 to-emerald-50 border border-sky-200/80 p-3.5 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-[#006194] text-white flex items-center justify-center shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[20px]">group_add</span>
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-xs font-bold text-slate-800">Sedang di SPBU sekarang?</p>
            <p className="text-[11px] text-slate-600">Bantu 1.4k pengendara lain dengan lapor stok.</p>
          </div>
        </div>
        <button
          onClick={() => onOpenReportModal()}
          className="shrink-0 px-3.5 py-2 rounded-lg bg-[#006194] hover:bg-[#007bb9] text-white text-xs font-bold shadow-sm active:scale-95 transition-transform"
          type="button"
        >
          + Lapor
        </button>
      </div>
    </div>
  );
};
