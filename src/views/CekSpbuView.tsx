import React, { useState } from 'react';
import { GasStation } from '../types';
import { StationMap } from '../components/StationMap';
import { getStationPinStatus } from '../utils/reputation';

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
}) => {
  const [selectedFilter, setSelectedFilter] = useState('Semua');
  const [radiusIndex, setRadiusIndex] = useState(1); // default 3 km
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStationId, setActiveStationId] = useState<string | null>(null);

  const radius = RADII[radiusIndex];

  // Filter stations based on search query, radius, and fuel filter
  const filteredStations = stations.filter((station) => {
    // Search query filter
    const matchesSearch =
      station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      station.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      station.brand.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Radius filter (distance in km)
    const maxRadius = parseInt(radius, 10);
    if (station.distanceKm > maxRadius) return false;

    // Fuel filter
    if (selectedFilter === 'Semua') return true;
    if (selectedFilter === 'Madura') return station.brand === 'Toko Madura';

    return station.fuels.some((f) =>
      f.type.toLowerCase().includes(selectedFilter.toLowerCase())
    );
  });

  const toggleRadius = () => {
    setRadiusIndex((prev) => (prev + 1) % RADII.length);
  };

  const handleOpenGoogleMaps = (station: GasStation) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}&query=${encodeURIComponent(
      station.name
    )}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col w-full gap-4 pb-8">
      {/* 1. Floating Live Monitor Ribbon */}
      <div className="flex items-center justify-between px-3.5 py-1.5 rounded-full bg-[#99efe5]/40 text-[#006f67] border border-[#006a63]/20 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]" />
          </span>
          <span className="text-xs font-semibold truncate">
            {filteredStations.length} SPBU aktif dipantau di sekitarmu
          </span>
        </div>
        <span className="text-[10px] bg-white/90 px-2 py-0.5 rounded-full font-bold shadow-xs">
          Realtime
        </span>
      </div>

      {/* 2. Search & Location Bar + Radius Picker */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center flex-1 min-w-0 px-2 gap-2">
            <span
              className="material-symbols-outlined text-[20px] text-[#006194] shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              my_location
            </span>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                Lokasi Kamu
              </span>
              <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                Duren Tiga, Pancoran, Jakarta Selatan
              </p>
            </div>
          </div>

          {/* Radius Selector Pill */}
          <button
            onClick={toggleRadius}
            title="Ubah Radius Pencarian"
            className="h-8 px-2.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#006194] text-xs font-bold flex items-center gap-1 shrink-0 transition-colors active:scale-95 border border-sky-200"
            type="button"
          >
            <span className="material-symbols-outlined text-[15px]">radar</span>
            <span>{radius}</span>
            <span className="material-symbols-outlined text-[15px] text-slate-400">expand_more</span>
          </button>
        </div>

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
              onClick={() => setSelectedFilter(f.key)}
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

      {/* 4. Interactive OpenStreetMap Canvas */}
      <StationMap
        stations={filteredStations}
        selectedStationId={activeStationId}
        onSelectStation={(id) => {
          setActiveStationId(id);
          onSelectStation(id);
        }}
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

      {/* 6. Gas Stations Cards Stack */}
      <div className="flex flex-col gap-3.5">
        {filteredStations.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-slate-200 shadow-sm flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-[40px] text-slate-300">search_off</span>
            <p className="text-sm font-bold text-slate-700">Tidak ada SPBU sesuai kriteria</p>
            <p className="text-xs text-slate-500">
              Coba perbesar radius ({radius}) atau pilih filter jenis BBM yang berbeda.
            </p>
            <button
              onClick={() => {
                setSelectedFilter('Semua');
                setSearchQuery('');
                setRadiusIndex(3); // 10 km
              }}
              className="mt-2 text-xs font-bold text-[#006194] bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-200"
              type="button"
            >
              Reset Filter & Radius 10 km
            </button>
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
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        station.brand === 'Pertamina'
                          ? 'bg-red-50 text-[#ee2737]'
                          : station.brand === 'Shell'
                          ? 'bg-amber-50 text-[#894d00]'
                          : station.brand === 'Toko Madura'
                          ? 'bg-amber-100 text-[#894d00]'
                          : 'bg-emerald-50 text-[#009900]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[24px]">
                        {isMadura ? 'storefront' : 'local_gas_station'}
                      </span>
                    </div>
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
                {targetFuel && (
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{targetFuel.type}</span>
                      <span className="text-[11px] text-slate-500">
                        Rp {targetFuel.price.toLocaleString('id-ID')}/L
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                      <span className="material-symbols-outlined text-[13px]">history</span>
                      <span>{station.lastReportMinutesAgo} mnt lalu • {station.verifiedCount} verifikasi</span>
                    </div>
                  </div>
                )}

                {/* Alternative fuel ready if primary is out */}
                {pertaliteFuel?.status === 'Kosong' && pertamaxFuel?.status === 'Tersedia' && (
                  <div className="flex items-center justify-between text-xs px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#059669]" />
                      <span className="text-slate-700 font-medium">Pertamax (RON 92) Ready</span>
                    </div>
                    <span className="text-slate-500 font-medium">
                      Rp {pertamaxFuel.price.toLocaleString('id-ID')}/L
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
