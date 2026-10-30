import React, { useState, useEffect, useMemo } from 'react';
import { Vehicle, FuelLog } from '../types';
import { ServiceTracker, ServiceCalculationResult, readServiceBaseline, writeServiceBaseline } from '../utils/serviceTracker';
import { Modal } from './Modal';
import { Toast } from './Toast';
import { formatKm } from '../utils/format';

interface ServiceAlertBannerProps {
  vehicle: Vehicle;
  logs: FuelLog[];
  onNavigateToStats: () => void;
  serviceStatus?: ServiceCalculationResult;
  /** Dipanggil bar user konfirmasi servis — parent wajib hitung ulang status. */
  onServiced?: () => void;
}

export const ServiceAlertBanner: React.FC<ServiceAlertBannerProps> = ({
  vehicle,
  logs,
  onNavigateToStats,
  serviceStatus,
  onServiced,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [lastServiceOdo, setLastServiceOdo] = useState<number | null>(() =>
    readServiceBaseline(vehicle.id)
  );

  // Keep in sync when vehicle changes
  useEffect(() => {
    setLastServiceOdo(readServiceBaseline(vehicle.id));
    setIsDismissed(false);
  }, [vehicle.id]);

  // Periodic service calculations via ServiceTracker utility
  const status: ServiceCalculationResult = useMemo(() => {
    if (serviceStatus) return serviceStatus;
    return ServiceTracker.evaluateServiceStatus(vehicle, logs, lastServiceOdo);
  }, [vehicle, logs, lastServiceOdo, serviceStatus]);

  const {
    currentMileage: currentOdometer,
    serviceInterval,
    nextServiceMileage: nextServiceOdo,
    remainingKm: kmRemaining,
    progressPercentage: progressPercent,
    avgDailyKm,
    estimatedDaysLeft,
    isOverdue,
    isUrgent,
    isWarning,
    checklist: checklistItems,
  } = status;

  const handleMarkAsServiced = () => {
    writeServiceBaseline(vehicle.id, currentOdometer);
    setLastServiceOdo(currentOdometer);
    setShowConfirmModal(false);
    // Kabari parent ben status dihitung ulang (baseline nang localStorage dudu state).
    onServiced?.();
    setToastMessage('Jadwal servis berhasil diperbarui! Interval berikutnya telah direset.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const showFullBanner = isOverdue || isUrgent || isWarning;

  // Dismiss = ilang tenan. Balekke nganggo tombol cilik alus nang ngisor.
  if (isDismissed) {
    return (
      <>
        {toastMessage && <Toast message={toastMessage} tone="success" position="top" />}
        <button
          type="button"
          onClick={() => setIsDismissed(false)}
          className="w-full text-center text-[11px] text-slate-400 hover:text-[#006194] font-semibold py-1 active:scale-[0.99] transition"
        >
          Tampilkan pengingat servis ({isOverdue ? 'terlewati' : `sisa ${formatKm(kmRemaining)}`})
        </button>
      </>
    );
  }

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && <Toast message={toastMessage} tone="success" position="top" />}

      {!showFullBanner ? (
        /* Kondisi normal (sisa > 500 km): kartu ramping sebaris, ora menuhi layar. */
        <div className="flex items-center gap-2.5 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm text-xs">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#059669] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">oil_barrel</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 truncate">
              Kondisi Prima <span className="font-normal text-slate-500">• sisa {formatKm(kmRemaining)}</span>
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              Servis berikutnya {formatKm(nextServiceOdo)} • estimasi ~{estimatedDaysLeft} hari
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToStats}
            aria-label="Detail servis"
            title="Detail servis"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#006194] hover:bg-sky-50 shrink-0 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            aria-label="Tandai sudah servis"
            title="Tandai sudah servis"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#059669] hover:bg-emerald-50 shrink-0 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            aria-label="Sembunyikan pengingat"
            title="Sembunyikan"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-500 hover:bg-slate-100 shrink-0 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      ) : (
      /* Main Service Alert Banner Card */
      <section
        className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-200 shadow-sm ${
          isOverdue
            ? 'bg-gradient-to-br from-red-50 via-rose-50 to-red-100/70 border-red-200/90 shadow-red-500/5'
            : isUrgent
            ? 'bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/70 border-amber-200/90 shadow-amber-500/5'
            : isWarning
            ? 'bg-gradient-to-br from-sky-50 via-teal-50 to-sky-100/60 border-sky-200/80'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="relative z-10 flex flex-col gap-3">
          {/* Top Header: Badge, Title & Close */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                  isOverdue
                    ? 'bg-red-600 text-white animate-pulse'
                    : isUrgent
                    ? 'bg-[#894d00] text-white'
                    : isWarning
                    ? 'bg-[#006194] text-white'
                    : 'bg-teal-600 text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isOverdue ? 'emergency' : isUrgent ? 'build_circle' : 'oil_barrel'}
                </span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-[14px] text-slate-900 font-headline leading-tight">
                    {isOverdue
                      ? 'Jadwal Servis Berkala Terlewati!'
                      : isUrgent
                      ? 'Perhatian: Servis Berkala Mendekat!'
                      : isWarning
                      ? 'Pengingat Jadwal Servis'
                      : 'Kondisi Servis Berkala'}
                  </h3>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isOverdue
                        ? 'bg-red-600 text-white'
                        : isUrgent
                        ? 'bg-[#894d00] text-white'
                        : isWarning
                        ? 'bg-[#006194] text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {isOverdue
                      ? `Lewat ${Math.abs(kmRemaining)} km`
                      : `Sisa ${formatKm(kmRemaining)}`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                  {isOverdue ? (
                    <>
                      Odometer telah melampaui target servis{' '}
                      <strong className="text-red-700">{formatKm(nextServiceOdo)}</strong>.
                      Segera jadwalkan ganti oli demi menjaga efisiensi mesin.
                    </>
                  ) : (
                    <>
                      Berdasarkan data log BBM, sisa jarak tempuh tinggal{' '}
                      <strong className="text-slate-900 font-bold">{formatKm(kmRemaining)}</strong> lagi
                      menuju target{' '}
                      <strong className="text-slate-900">{formatKm(nextServiceOdo)}</strong>.
                    </>
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              aria-label="Tutup notifikasi"
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors shrink-0"
              title="Sembunyikan sementara"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Progress Bar & Mileage Detail */}
          <div className="bg-white/80 backdrop-blur-xs rounded-xl p-3 border border-slate-200/70 shadow-2xs flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-slate-400">speed</span>
                Odometer: <strong className="text-slate-900">{formatKm(currentOdometer)}</strong>
              </span>
              <span className="text-slate-600 font-medium">
                Target: <strong className="text-slate-900">{formatKm(nextServiceOdo)}</strong>
              </span>
            </div>

            {/* Visual Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverdue
                    ? 'bg-red-600'
                    : isUrgent
                    ? 'bg-gradient-to-r from-amber-500 to-[#894d00]'
                    : isWarning
                    ? 'bg-gradient-to-r from-sky-500 to-[#006194]'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, progressPercent))}%` }}
              />
            </div>

            {/* Bottom Meta Tags: Days estimation & Interval */}
            <div className="flex items-center justify-between pt-0.5 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-amber-600">calendar_clock</span>
                <span>
                  {isOverdue
                    ? 'Segera bawa ke bengkel'
                    : `Estimasi ~${estimatedDaysLeft} hari lagi (rata-rata ${avgDailyKm} km/hari)`}
                </span>
              </span>
              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">
                Siklus {formatKm(serviceInterval)}
              </span>
            </div>
          </div>

          {/* Action Button Row */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={onNavigateToStats}
              className="flex-1 h-9 rounded-xl bg-white border border-slate-300/80 hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5 active:scale-98 transition"
            >
              <span className="material-symbols-outlined text-[16px] text-[#006194]">insights</span>
              <span>Detail Servis</span>
            </button>

            <button
              type="button"
              onClick={() => setShowChecklistModal(true)}
              className="px-3 h-9 rounded-xl bg-white border border-slate-300/80 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs flex items-center justify-center gap-1 active:scale-98 transition"
              title="Lihat daftar komponen yang perlu diperiksa"
            >
              <span className="material-symbols-outlined text-[16px] text-slate-500">checklist</span>
              <span className="hidden sm:inline">Daftar Item</span>
            </button>

            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className={`px-3.5 h-9 rounded-xl text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 active:scale-98 transition ${
                isOverdue
                  ? 'bg-red-600 hover:bg-red-700'
                  : isUrgent
                  ? 'bg-[#894d00] hover:bg-[#703f00]'
                  : 'bg-[#006194] hover:bg-[#004e77]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              <span>Sudah Servis</span>
            </button>
          </div>
        </div>

        {/* Subtle decorative glow */}
        <div
          className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-40 ${
            isOverdue ? 'bg-red-400' : isUrgent ? 'bg-amber-400' : 'bg-sky-400'
          }`}
        />
      </section>
      )}

      {/* Modal 1: Service Checklist Drawer */}
      {showChecklistModal && (
        <Modal
          icon="checklist_rtl"
          iconBg="bg-teal-100"
          iconColor="text-[#006a63]"
          title={`Checklist Servis ${vehicle.name}`}
          subtitle={`Target ${formatKm(nextServiceOdo)} (${vehicle.type === 'motor' ? 'Motor' : 'Mobil'})`}
          onClose={() => setShowChecklistModal(false)}
          position="sheet"
        >
          <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">

            <p className="text-xs text-slate-600 leading-relaxed">
              Berikut poin perawatan berkala yang dianjurkan oleh pabrikan pada interval{' '}
              <strong>{formatKm(serviceInterval)}</strong> untuk menjaga efisiensi konsumsi BBM:
            </p>

            <div className="flex flex-col gap-2">
              {checklistItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/60"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[18px] text-teal-600 shrink-0 mt-0.5">
                      task_alt
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-900">{item.name}</span>
                      <span className="text-[11px] text-slate-500 leading-tight">{item.desc}</span>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                      item.priority === 'Kritis'
                        ? 'bg-red-100 text-red-700'
                        : item.priority === 'Penting'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.priority}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowChecklistModal(false)}
                className="w-full h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal 2: Confirm Mark as Serviced */}
      {showConfirmModal && (
        <Modal
          icon="verified"
          iconBg="bg-emerald-100"
          iconColor="text-[#059669]"
          title="Tandai Sudah Selesai Servis?"
          subtitle={`${vehicle.name} (${vehicle.plateNumber})`}
          onClose={() => setShowConfirmModal(false)}
          position="sheet"
        >
          <div className="flex flex-col gap-4">

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-700 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Odometer Terkini:</span>
                <span className="font-bold text-slate-900">{formatKm(currentOdometer)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Jadwal Servis Berikutnya:</span>
                <span className="font-bold text-[#006194]">
                  {formatKm(currentOdometer + serviceInterval)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/80">
                Odometer saat ini ({formatKm(currentOdometer)}) akan dicatat sebagai patokan
                servis terakhir, dan peringatan akan muncul kembali saat mendekati siklus servis berikutnya.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleMarkAsServiced}
                className="flex-1 h-10 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>Konfirmasi Selesai</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
