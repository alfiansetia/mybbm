import React, { useMemo, useState } from 'react';
import { GasStation } from '../types';
import { Modal } from './Modal';
import { BrandAvatar } from './BrandAvatar';
import { StationMap } from './StationMap';
import { useUserLocation } from '../hooks/useUserLocation';
import { haversineKm, roundDistanceKm } from '../utils/geo';

interface StationPickerSheetProps {
  stations: GasStation[];
  onPick: (station: GasStation) => void;
  onClose: () => void;
}

/** Picker SPBU: peta terdekat + daftar searchable. Ganti default dummy. */
export const StationPickerSheet: React.FC<StationPickerSheetProps> = ({
  stations,
  onPick,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const { coords: userCoords } = useUserLocation(true);

  const sorted = useMemo(() => {
    const q = query.toLowerCase();
    return stations
      .map((s) => ({
        ...s,
        distanceKm: roundDistanceKm(haversineKm(userCoords[0], userCoords[1], s.lat, s.lng)),
      }))
      .filter(
        (s) =>
          !q ||
          s.name.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q) ||
          s.brand.toLowerCase().includes(q)
      )
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 30);
  }, [stations, query, userCoords]);

  return (
    <Modal
      icon="local_gas_station"
      title="Pilih SPBU"
      subtitle="Terdekat dari lokasimu"
      onClose={onClose}
      position="sheet"
    >
      <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
        <div className="h-44 shrink-0 [&>div]:h-full">
          <StationMap
            stations={sorted}
            onSelectStation={(id) => {
              const st = sorted.find((s) => s.id === id);
              if (st) onPick(st);
            }}
            userCoords={userCoords}
          />
        </div>

        <div className="relative shrink-0">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama / jalan / brand…"
            className="w-full h-10 pl-9 pr-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006194]"
          />
          <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[18px] text-slate-400">
            search
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {sorted.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-4">
              Tidak ada SPBU cocok. Ketik manual di kolom lokasi.
            </p>
          )}
          {sorted.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onPick(s)}
              className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#006194] active:scale-[0.99] transition-all text-left"
            >
              <BrandAvatar brand={s.brand} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{s.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{s.address}</p>
              </div>
              <span className="text-[11px] font-bold text-[#006194] tabular-nums shrink-0">
                {s.distanceKm} km
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};
