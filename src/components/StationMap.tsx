import React, { useCallback, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { GasStation } from '../types';
import { MapErrorBoundary } from './MapErrorBoundary';
import { DEFAULT_COORDS } from '../utils/geo';

interface StationMapProps {
  stations: GasStation[];
  selectedStationId?: string | null;
  onSelectStation: (stationId: string) => void;
  userCoords?: [number, number];
  accuracyM?: number | null;
  locating?: boolean;
  onLocate?: () => void;
}

// In-map custom control buttons using the official useMap hook
const MapControls: React.FC<{
  userCoords: [number, number];
  locating?: boolean;
  onLocate?: () => void;
}> = ({ userCoords, locating, onLocate }) => {
  const map = useMap();

  const handleCenterUser = useCallback(() => {
    // Minta posisi GPS terbaru dulu (jika disediakan), lalu pan ke posisi terakhir yang diketahui.
    onLocate?.();
    if (!map) return;
    map.panTo({ lat: userCoords[0], lng: userCoords[1] });
    map.setZoom(15);
  }, [map, userCoords, onLocate]);

  const handleZoomIn = useCallback(() => {
    if (!map) return;
    const currentZoom = map.getZoom() ?? 14;
    map.setZoom(currentZoom + 1);
  }, [map]);

  const handleZoomOut = useCallback(() => {
    if (!map) return;
    const currentZoom = map.getZoom() ?? 14;
    map.setZoom(currentZoom - 1);
  }, [map]);

  return (
    <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-20">
      <button
        onClick={handleCenterUser}
        title="Pusatkan ke Lokasi Saya"
        aria-label="Pusatkan Lokasi"
        type="button"
        className="w-9 h-9 rounded-lg bg-white/95 backdrop-blur-md text-[#006194] shadow-md flex items-center justify-center active:scale-95 transition-transform hover:bg-white disabled:opacity-60"
        disabled={locating}
      >
        <span
          className={`material-symbols-outlined text-[20px] ${locating ? 'animate-spin' : ''}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {locating ? 'progress_activity' : 'near_me'}
        </span>
      </button>
      <button
        onClick={handleZoomIn}
        title="Perbesar Peta"
        aria-label="Perbesar"
        type="button"
        className="w-9 h-9 rounded-lg bg-white/95 backdrop-blur-md text-slate-700 shadow-md flex items-center justify-center active:scale-95 transition-transform hover:bg-white text-lg font-bold"
      >
        +
      </button>
      <button
        onClick={handleZoomOut}
        title="Perkecil Peta"
        aria-label="Perkecil"
        type="button"
        className="w-9 h-9 rounded-lg bg-white/95 backdrop-blur-md text-slate-700 shadow-md flex items-center justify-center active:scale-95 transition-transform hover:bg-white text-lg font-bold"
      >
        -
      </button>
    </div>
  );
};

// Pan + zoom ke posisi user setiap kali GPS berubah signifikan,
// tapi berhenti mengganggu setelah user menggeser peta manual.
const RecenterOnLocate: React.FC<{ userCoords: [number, number] }> = ({ userCoords }) => {
  const map = useMap();
  const prev = React.useRef<string>('');
  const userMoved = React.useRef(false);

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('dragstart', () => {
      userMoved.current = true;
    });
    return () => listener.remove();
  }, [map]);

  useEffect(() => {
    if (!map || userMoved.current) return;
    const key = `${userCoords[0].toFixed(4)},${userCoords[1].toFixed(4)}`;
    if (prev.current === key) return;
    prev.current = key;
    map.panTo({ lat: userCoords[0], lng: userCoords[1] });
    map.setZoom(15);
  }, [map, userCoords]);
  return null;
};

export const StationMap: React.FC<StationMapProps> = ({
  stations,
  selectedStationId,
  onSelectStation,
  userCoords = DEFAULT_COORDS,
  accuracyM = null,
  locating = false,
  onLocate,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  // Map ID custom via env, fallback ke DEMO_MAP_ID bawaan Google untuk dev.
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

  return (
    <div className="relative w-full h-64 rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-slate-100">
      {apiKey ? (
        <MapErrorBoundary>
        <APIProvider apiKey={apiKey} libraries={['marker']}>
          <div className="w-full h-full relative" key="gmap-stable">
            <Map
              defaultCenter={{ lat: DEFAULT_COORDS[0], lng: DEFAULT_COORDS[1] }}
              defaultZoom={14}
              mapId={mapId}
              gestureHandling="greedy"
              disableDefaultUI={true}
              style={{ width: '100%', height: '100%' }}
            >
              <RecenterOnLocate userCoords={userCoords} />
              {/* User Location Pulse Marker */}
              <AdvancedMarker position={{ lat: userCoords[0], lng: userCoords[1] }} zIndex={50}>
                <div className="relative flex items-center justify-center" title={accuracyM ? `Akurasi ±${accuracyM} m` : 'Lokasi saya'}>
                  <div className="w-4 h-4 rounded-full bg-[#006194] border-2 border-white shadow-md animate-pulse" />
                  <div className="absolute w-8 h-8 rounded-full bg-[#006194]/25 pointer-events-none" />
                </div>
              </AdvancedMarker>

              {/* Station Markers with Status Visuals */}
              {stations.map((station) => {
                const hasEmpty = station.fuels.some(
                  (f) =>
                    f.status === 'Kosong' &&
                    (f.type.includes('Pertalite') || f.type.includes('Solar'))
                );
                const isLimited =
                  station.queueStatus === 'Sedang' ||
                  station.fuels.some((f) => f.status === 'Terbatas');
                const isMadura = station.brand === 'Toko Madura';
                const isUnknown = station.fuels.length === 0; // data peta, stok belum ada

                let bgClass = 'bg-[#059669]'; // green available
                let iconName = 'local_gas_station';

                if (isUnknown) {
                  bgClass = 'bg-slate-500';
                  iconName = 'local_gas_station';
                } else if (isMadura) {
                  bgClass = 'bg-[#894d00]';
                  iconName = 'storefront';
                } else if (hasEmpty) {
                  bgClass = 'bg-[#dc2626]';
                  iconName = 'block';
                } else if (isLimited) {
                  bgClass = 'bg-[#d97706]';
                  iconName = 'hourglass_top';
                }

                const isSelected = selectedStationId === station.id;

                return (
                  <AdvancedMarker
                    key={station.id}
                    position={{ lat: station.lat, lng: station.lng }}
                    onClick={() => onSelectStation(station.id)}
                    zIndex={isSelected ? 100 : 10}
                  >
                    <div
                      className={`cursor-pointer group relative flex flex-col items-center transition-transform hover:scale-110 ${
                        isSelected ? 'scale-110' : ''
                      }`}
                    >
                      <div className="px-2 py-0.5 rounded-full bg-white shadow-md flex items-center gap-1 mb-1 whitespace-nowrap border border-slate-200">
                        <span className={`w-2 h-2 rounded-full ${bgClass}`} />
                        <span className="text-[10px] font-bold text-slate-800">
                          {station.name.replace('SPBU Pertamina ', '').replace('SPBU ', '')} (
                          {station.distanceKm} km)
                        </span>
                      </div>
                      <div
                        className={`w-8 h-8 rounded-full ${bgClass} text-white flex items-center justify-center shadow-lg ring-2 ring-white`}
                      >
                        <span className="material-symbols-outlined text-[17px]">{iconName}</span>
                      </div>
                      <div className={`w-1.5 h-1.5 ${bgClass} rotate-45 -mt-1 shadow-sm`} />
                    </div>
                  </AdvancedMarker>
                );
              })}

              <MapControls userCoords={userCoords} locating={locating} onLocate={onLocate} />
            </Map>
          </div>
        </APIProvider>
        </MapErrorBoundary>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-slate-50">
          <span className="material-symbols-outlined text-[36px] text-slate-400 mb-1">map</span>
          <p className="text-xs font-semibold text-slate-700">Google Maps Platform siap digunakan</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            API key terdeteksi dari pengaturan studio.
          </p>
        </div>
      )}

      {/* Map Legend Bar Bottom Overlay */}
      <div className="absolute bottom-2 inset-x-2 bg-white/95 backdrop-blur-md rounded-lg px-3 py-1 flex items-center justify-around shadow-sm text-slate-700 z-20 border border-slate-200/80 text-[11px] font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
          <span>Tersedia</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#d97706]" />
          <span>Padat / Terbatas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]" />
          <span>Habis / Tutup</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
          <span>Belum ada data</span>
        </div>
      </div>
    </div>
  );
};
