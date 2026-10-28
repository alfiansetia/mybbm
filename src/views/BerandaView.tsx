import React, { useMemo } from 'react';
import { Vehicle, FuelLog, GasStation } from '../types';
import { ServiceAlertBanner } from '../components/ServiceAlertBanner';
import { ServiceTracker } from '../utils/serviceTracker';

interface BerandaViewProps {
  activeVehicle: Vehicle;
  logs: FuelLog[];
  stations: GasStation[];
  onNavigateTab: (tab: 'beranda' | 'cek-spbu' | 'catat-bbm' | 'statistik' | 'akun', mode?: 'scan' | 'manual') => void;
  onSelectStation: (stationId: string) => void;
  onOpenReportModal: (stationId?: string) => void;
  onExportData: () => void;
  onChangeVehicle: () => void;
  onDeleteLog?: (logId: string) => void;
}

export const BerandaView: React.FC<BerandaViewProps> = ({
  activeVehicle,
  logs,
  stations,
  onNavigateTab,
  onSelectStation,
  onOpenReportModal,
  onExportData,
  onChangeVehicle,
}) => {
  // Filter logs for active vehicle
  const vehicleLogs = logs.filter((l) => l.vehicleId === activeVehicle.id);

  // Calculate remaining distance until next service using ServiceTracker utility
  const serviceStatus = useMemo(() => {
    let savedBaseline: number | null = null;
    try {
      const saved = localStorage.getItem(`mybbm_last_service_${activeVehicle.id}`);
      if (saved) savedBaseline = parseInt(saved, 10);
    } catch {
      // ignore
    }
    return ServiceTracker.evaluateServiceStatus(activeVehicle, logs, savedBaseline);
  }, [activeVehicle, logs]);

  // Calculate monthly stats (for current month October 2026 or latest 30 days)
  const totalSpent = vehicleLogs.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalLiters = vehicleLogs.reduce((acc, curr) => acc + curr.liters, 0);
  const totalDistance = vehicleLogs.reduce((acc, curr) => acc + (curr.distanceKm || 0), 0);
  const averageCostPerKm = totalDistance > 0 ? Math.round(totalSpent / totalDistance) : 206;

  // Format currency
  const formatRupiah = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

  return (
    <div className="flex flex-col w-full gap-5">
      {/* 1. Active Vehicle Identity Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#006194] via-[#007bb9] to-[#006a63] p-4 text-white shadow-lg shadow-[#006194]/20">
        <div className="relative z-10 flex flex-col gap-3">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0 backdrop-blur-md">
                <span className="material-symbols-outlined text-white text-[22px]">
                  {activeVehicle.type === 'motor' ? 'two_wheeler' : 'directions_car'}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-[17px] truncate font-headline">{activeVehicle.name}</span>
                  <span className="material-symbols-outlined text-[15px] text-sky-200" title="Terhubung">
                    verified
                  </span>
                </div>
                <span className="text-[11px] text-sky-200 tracking-wider">
                  {activeVehicle.plateNumber} • {activeVehicle.year}
                </span>
              </div>
            </div>
            <button
              onClick={onChangeVehicle}
              className="flex items-center gap-1 bg-white/20 hover:bg-white/30 active:scale-95 transition px-3 py-1 rounded-full text-white backdrop-blur-md text-xs font-semibold"
              type="button"
            >
              <span>Ganti</span>
              <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
            </button>
          </div>

          {/* Efficiency & Odo Highlight Grid */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="rounded-xl bg-white/10 backdrop-blur-md p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-sky-200 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">speed</span>
                  Odometer Terkini
                </span>
                {serviceStatus.isWarning && (
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-2xs ${
                      serviceStatus.isUrgent
                        ? 'bg-amber-400 text-amber-950 animate-pulse'
                        : 'bg-amber-300 text-amber-950'
                    }`}
                    title={`Peringatan Servis: Tersisa ${serviceStatus.remainingKm.toLocaleString('id-ID')} km lagi`}
                  >
                    <span className="material-symbols-outlined text-[11px]">warning</span>
                    {serviceStatus.remainingKm <= 0
                      ? 'Lewat'
                      : `< ${serviceStatus.remainingKm.toLocaleString('id-ID')} km`}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-[22px] tracking-tight font-extrabold tabular-nums">
                  {serviceStatus.currentMileage.toLocaleString('id-ID')}
                </span>
                <span className="text-xs text-sky-200">km</span>
              </div>
              {serviceStatus.isWarning && (
                <div className="text-[10px] text-amber-200 font-semibold flex items-center gap-1 pt-0.5 border-t border-white/10 mt-1">
                  <span className="material-symbols-outlined text-[12px]">build</span>
                  <span>Target {serviceStatus.nextServiceMileage.toLocaleString('id-ID')} km</span>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-white/10 backdrop-blur-md p-2.5 flex flex-col justify-between">
              <span className="text-[11px] text-teal-200 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">eco</span>
                Efisiensi Rata-rata
              </span>
              <div className="flex items-center justify-between mt-0.5">
                <div className="flex items-baseline gap-1">
                  <span className="text-[20px] font-extrabold tabular-nums">
                    {activeVehicle.averageKmL}
                  </span>
                  <span className="text-[10px] text-teal-100">km/L</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#059669] text-white font-bold">
                  Irit Banget
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </section>

      {/* 2. Periodic Service & Maintenance Alert Banner */}
      <ServiceAlertBanner
        vehicle={activeVehicle}
        logs={logs}
        serviceStatus={serviceStatus}
        onNavigateToStats={() => onNavigateTab('statistik')}
      />

      {/* 3. Quick Action Bento Bar */}
      <section className="grid grid-cols-4 gap-2">
        <button
          onClick={() => onNavigateTab('catat-bbm', 'manual')}
          className="group flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-white shadow-sm hover:shadow border border-slate-200/80 active:scale-95 transition text-center"
          type="button"
        >
          <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-[#006194] group-hover:bg-[#006194] group-hover:text-white transition">
            <span className="material-symbols-outlined text-[20px]">edit_note</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-700">Catat Manual</span>
        </button>

        <button
          onClick={() => onNavigateTab('catat-bbm', 'scan')}
          className="group flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-white shadow-sm hover:shadow border border-slate-200/80 active:scale-95 transition text-center relative"
          type="button"
        >
          <div className="absolute -top-1 right-1.5 bg-[#ee2737] text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full shadow-xs">
            AI
          </div>
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-[#006a63] group-hover:bg-[#006a63] group-hover:text-white transition">
            <span className="material-symbols-outlined text-[20px]">document_scanner</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-700">Scan Struk</span>
        </button>

        <button
          onClick={() => onNavigateTab('cek-spbu')}
          className="group flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-white shadow-sm hover:shadow border border-slate-200/80 active:scale-95 transition text-center"
          type="button"
        >
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-[#894d00] group-hover:bg-[#894d00] group-hover:text-white transition">
            <span className="material-symbols-outlined text-[20px]">local_gas_station</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-700">Cek Stok</span>
        </button>

        <button
          onClick={onExportData}
          className="group flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-white shadow-sm hover:shadow border border-slate-200/80 active:scale-95 transition text-center"
          type="button"
        >
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-sky-600 group-hover:text-white transition">
            <span className="material-symbols-outlined text-[20px]">ios_share</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-700">Export Data</span>
        </button>
      </section>

      {/* 3. Monthly Summary Section */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#006194] text-[19px]">calendar_month</span>
            <h2 className="text-[16px] font-bold text-slate-800 font-headline">Ringkasan Bulan Ini</h2>
          </div>
          <span className="text-[11px] text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-full font-medium">
            1–18 Okt 2026
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Total Biaya */}
          <div className="flex flex-col p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-sm">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#006194] shrink-0" />
              Pengeluaran
            </span>
            <span className="text-[14px] font-bold text-slate-900 mt-1 truncate tabular-nums">
              {formatRupiah(totalSpent)}
            </span>
            <span className="text-[10px] text-[#059669] font-medium mt-0.5">↓ 12% vs lalu</span>
          </div>

          {/* Total Konsumsi */}
          <div className="flex flex-col p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-sm">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#006a63] shrink-0" />
              Konsumsi
            </span>
            <span className="text-[14px] font-bold text-slate-900 mt-1 truncate tabular-nums">
              {totalLiters.toFixed(1)} L
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">{vehicleLogs.length}x isi bensin</span>
          </div>

          {/* Cost per km */}
          <div className="flex flex-col p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-sm">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#894d00] shrink-0" />
              Biaya/km
            </span>
            <span className="text-[14px] font-bold text-slate-900 mt-1 truncate tabular-nums">
              Rp {averageCostPerKm}
            </span>
            <span className="text-[10px] text-[#059669] font-semibold mt-0.5">Sangat Hemat</span>
          </div>
        </div>
      </section>

      {/* 4. Radar SPBU & Stok Live (Preview Cards) */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#059669]" />
            </span>
            <h2 className="text-[16px] font-bold text-slate-800 font-headline">Radar SPBU & Stok Live</h2>
          </div>
          <button
            onClick={() => onNavigateTab('cek-spbu')}
            className="text-[12px] text-[#006194] font-semibold flex items-center hover:underline"
            type="button"
          >
            <span>Semua SPBU</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        {/* Featured Station 1: SPBU Pertamina MT Haryono */}
        {stations.slice(1, 3).map((station) => (
          <div
            key={station.id}
            onClick={() => onSelectStation(station.id)}
            className="rounded-xl bg-white p-3.5 border border-slate-200/80 shadow-sm flex flex-col gap-2.5 cursor-pointer hover:border-sky-300 transition-all active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-[14px] ${
                    station.brand === 'Pertamina'
                      ? 'bg-red-50 text-[#ee2737]'
                      : station.brand === 'Shell'
                      ? 'bg-amber-100 text-[#894d00]'
                      : 'bg-teal-50 text-[#006a63]'
                  }`}
                >
                  {station.brand === 'Pertamina' ? 'P' : station.brand === 'Shell' ? 'S' : 'B'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[14px] font-bold text-slate-900 truncate font-headline">
                    {station.name}
                  </span>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <span className="truncate">{station.address.split(',')[0]}</span>
                    <span>•</span>
                    <span className="font-bold text-[#006194] tabular-nums">{station.distanceKm} km</span>
                  </span>
                </div>
              </div>

              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                  station.queueStatus === 'Sepi'
                    ? 'bg-emerald-50 text-[#059669]'
                    : station.queueStatus === 'Sedang'
                    ? 'bg-amber-50 text-[#d97706]'
                    : 'bg-red-50 text-[#dc2626]'
                }`}
              >
                {station.queueEstimateText}
              </span>
            </div>

            {/* Live Stock Grid */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {station.fuels.slice(0, 3).map((f) => (
                <div
                  key={f.type}
                  className="rounded-lg bg-slate-50 p-1.5 flex flex-col items-center justify-center text-center border border-slate-100"
                >
                  <span className="text-[10px] text-slate-500 font-medium truncate w-full">{f.type}</span>
                  <span
                    className={`text-[11px] font-bold flex items-center gap-1 mt-0.5 ${
                      f.status === 'Tersedia'
                        ? 'text-[#059669]'
                        : f.status === 'Terbatas'
                        ? 'text-[#d97706]'
                        : 'text-[#dc2626]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        f.status === 'Tersedia'
                          ? 'bg-[#059669]'
                          : f.status === 'Terbatas'
                          ? 'bg-[#d97706]'
                          : 'bg-[#dc2626]'
                      }`}
                    />
                    {f.status === 'Tersedia' ? 'Ready' : f.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-slate-500 pt-1 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-[#006a63]">verified_user</span>
                <span>Lapor {station.lastReportMinutesAgo} mnt lalu • {station.contributorsCount} kontributor</span>
              </span>
              <span className="text-[#006194] font-bold flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[14px]">navigation</span>
                <span>Rute</span>
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* 5. Community Contribution Prompt / Micro Delight */}
      <section className="rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/80 p-3.5 text-[#006f67] flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[#006a63] text-white flex items-center justify-center shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[20px]">campaign</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold leading-tight truncate">Lagi di POM Bensin?</span>
            <span className="text-[11px] text-slate-600 truncate">
              Bantu pengendara lain dengan lapor stok & antrean.
            </span>
          </div>
        </div>
        <button
          onClick={() => onOpenReportModal()}
          className="px-3 py-1.5 rounded-lg bg-[#006a63] hover:bg-[#00504a] text-white text-xs font-bold active:scale-95 transition shrink-0 shadow-xs"
          type="button"
        >
          Lapor
        </button>
      </section>

      {/* 6. Recent Fill-up Logs (Riwayat Pengisian) */}
      <section className="flex flex-col gap-2.5 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#006194] text-[19px]">receipt_long</span>
            <h2 className="text-[16px] font-bold text-slate-800 font-headline">Riwayat Pengisian BBM</h2>
          </div>
          <button
            onClick={() => onNavigateTab('statistik')}
            className="text-[12px] text-[#006194] font-semibold hover:underline"
            type="button"
          >
            Lihat Semua
          </button>
        </div>

        {vehicleLogs.slice(0, 3).map((log) => (
          <div
            key={log.id}
            className="rounded-xl bg-white p-3.5 border border-slate-200/80 shadow-sm flex flex-col gap-2"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    log.stationBrand === 'Pertamina'
                      ? 'bg-[#ee2737]'
                      : log.stationBrand === 'Shell'
                      ? 'bg-[#ffd200]'
                      : 'bg-[#005baa]'
                  }`}
                />
                <span className="text-[14px] text-slate-900 font-bold truncate">{log.stationName}</span>
              </div>
              <span className="text-[11px] text-slate-500">{log.displayDate}</span>
            </div>

            <div className="flex items-center justify-between mt-0.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[18px] font-extrabold text-slate-900 tabular-nums font-headline">
                  {formatRupiah(log.totalAmount)}
                </span>
                <span className="text-xs text-slate-500">
                  • {log.fuelType} {log.liters} L
                </span>
              </div>
              {log.calculatedKmL && (
                <span className="px-2 py-0.5 rounded-md bg-teal-50 text-[#006a63] text-xs font-bold border border-teal-200">
                  {log.calculatedKmL} km/L
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-slate-500 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                  {log.isFullTank ? 'Full Tank' : 'Parsial'}
                </span>
                {log.distanceKm && (
                  <span className="flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[13px]">speed</span>
                    <span>
                      {log.odometer.toLocaleString('id-ID')} km (+{log.distanceKm} km)
                    </span>
                  </span>
                )}
              </div>
              {log.costPerKm && (
                <span className="text-[#006a63] font-semibold">Rp {log.costPerKm}/km</span>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};
