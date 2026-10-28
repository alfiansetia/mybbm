import React from 'react';
import { GasStation } from '../types';
import { BrandAvatar } from '../components/BrandAvatar';
import { QueuePill, StatusDot } from '../components/StatusPill';

interface GuestBerandaViewProps {
  stations: GasStation[];
  onSelectStation: (stationId: string) => void;
  onNavigateTab: (tab: 'beranda' | 'cek-spbu' | 'catat-bbm' | 'statistik' | 'akun') => void;
  onLogin: () => void;
  /** User sudah login tapi belum punya kendaraan → CTA jadi "Tambah Kendaraan". */
  noVehicleMode?: boolean;
}

export const GuestBerandaView: React.FC<GuestBerandaViewProps> = ({
  stations,
  onSelectStation,
  onNavigateTab,
  onLogin,
  noVehicleMode = false,
}) => {
  const handleSecondaryCta = () => {
    if (noVehicleMode) onNavigateTab('akun');
    else onLogin();
  };
  return (
    <div className="flex flex-col w-full gap-5 pb-24 animate-in fade-in duration-150">
      {/* Hero — langsung kelihatan tanpa login */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#006194] via-[#007bb9] to-[#006a63] p-5 text-white shadow-lg shadow-[#006194]/20">
        <div className="relative z-10 flex flex-col gap-3">
          <span className="self-start text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
            {noVehicleMode ? 'Selangkah lagi' : 'Tanpa daftar dulu'}
          </span>
          <h1 className="text-[22px] font-extrabold leading-tight font-headline">
            Cek stok BBM SPBU di sekitarmu, live.
          </h1>
          <p className="text-[13px] text-sky-100 leading-snug">
            {noVehicleMode
              ? 'Tambahkan kendaraan pertamamu untuk mulai catat BBM, hitung konsumsi, dan kumpulkan reputasi.'
              : 'Lihat ketersediaan Pertalite, Pertamax, Solar & antrean POM dari laporan komunitas — gratis tanpa login.'}
          </p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onNavigateTab('cek-spbu')}
              className="flex-1 h-10 rounded-xl bg-white text-[#006194] text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.99] transition"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">local_gas_station</span>
              <span>Cek Stok Sekarang</span>
            </button>
            <button
              onClick={handleSecondaryCta}
              className="flex-1 h-10 rounded-xl bg-white/15 border border-white/40 text-white text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.99] transition"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">
                {noVehicleMode ? 'two_wheeler' : 'login'}
              </span>
              <span>{noVehicleMode ? 'Tambah Kendaraan' : 'Masuk / Daftar'}</span>
            </button>
          </div>
        </div>
        <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </section>

      {/* Fitur preview */}
      <section className="grid grid-cols-3 gap-2">
        {[
          { icon: 'local_gas_station', label: 'Stok Live', desc: 'Bebas dilihat', tab: 'cek-spbu' as const },
          { icon: 'edit_note', label: 'Catat BBM', desc: noVehicleMode ? 'Butuh kendaraan' : 'Perlu login', tab: 'catat-bbm' as const },
          { icon: 'bar_chart', label: 'Statistik', desc: noVehicleMode ? 'Butuh kendaraan' : 'Perlu login', tab: 'statistik' as const },
        ].map((f) => (
          <button
            key={f.label}
            onClick={() => onNavigateTab(f.tab)}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white shadow-sm border border-slate-200/80 active:scale-95 transition text-center"
            type="button"
          >
            <span className="material-symbols-outlined text-[22px] text-[#006194]">{f.icon}</span>
            <span className="text-[12px] font-bold text-slate-800">{f.label}</span>
            <span className="text-[10px] text-slate-500">{f.desc}</span>
          </button>
        ))}
      </section>

      {/* Radar SPBU — publik */}
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

        {stations.slice(1, 3).map((station) => (
          <div
            key={station.id}
            onClick={() => onSelectStation(station.id)}
            className="rounded-xl bg-white p-3.5 border border-slate-200/80 shadow-sm flex flex-col gap-2.5 cursor-pointer hover:border-sky-300 transition-all active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <BrandAvatar brand={station.brand} />
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
              <QueuePill status={station.queueStatus} label={station.queueEstimateText} />
            </div>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {station.fuels.slice(0, 3).map((f) => (
                <div
                  key={f.type}
                  className="rounded-lg bg-slate-50 p-1.5 flex flex-col items-center justify-center text-center border border-slate-100"
                >
                  <span className="text-[10px] text-slate-500 font-medium truncate w-full">{f.type}</span>
                  <StatusDot status={f.status} />
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
                <span>Detail</span>
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* CTA login untuk kontribusi */}
      <section className="rounded-xl bg-gradient-to-r from-sky-50 to-teal-50 border border-sky-200/80 p-4 flex flex-col gap-2.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-[#006194] text-white flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">
              {noVehicleMode ? 'two_wheeler' : 'group_add'}
            </span>
          </div>
          <div className="flex flex-col">
            <p className="text-[13px] font-bold text-slate-800">
              {noVehicleMode ? 'Lengkapi garasimu dulu' : 'Mau lapor stok / verifikasi info?'}
            </p>
            <p className="text-[11px] text-slate-600">
              {noVehicleMode
                ? 'Satu kendaraan cukup untuk buka semua fitur pencatatan.'
                : 'Masuk untuk kelola kendaraan, catat BBM, dan bantu POM.'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSecondaryCta}
          className="w-full h-10 rounded-xl bg-[#006194] hover:bg-[#007bb9] text-white text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.99] transition"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">
            {noVehicleMode ? 'add' : 'login'}
          </span>
          <span>{noVehicleMode ? 'Tambah Kendaraan Sekarang' : 'Masuk dengan Google'}</span>
        </button>
      </section>
    </div>
  );
};
