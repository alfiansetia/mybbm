import React, { useEffect, useMemo, useState } from 'react';
import { GasStation, CommunityReport, UserProfile, SubmitReportResult } from '../types';
import { StationMap } from '../components/StationMap';
import { ReputationBadge } from '../components/ReputationBadge';
import { StatusPill } from '../components/StatusPill';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { useUserLocation } from '../hooks/useUserLocation';
import { formatRupiah } from '../utils/format';
import { computeAggregatedStatus, reportCooldownLeftMs, reportKeyCooldownLeftMs, formatCooldown } from '../utils/reputation';

interface DetailSpbuViewProps {
  station: GasStation;
  /** Kabeh SPBU (komunitas + peta) — pin terdekat tetep tampil nang mini & fullscreen. */
  stations: GasStation[];
  userProfile: UserProfile;
  isGuest?: boolean;
  onRequireLogin?: () => void;
  onBack: () => void;
  onSelectStation: (stationId: string) => void;
  /** Counter dari App: berubah = buka sheet laporan otomatis (tombol "+ Lapor"). */
  reportSignal?: number;
  onSubmitReport: (stationId: string, newReport: Omit<CommunityReport, 'id' | 'timestamp'>) => Promise<SubmitReportResult>;
  onVoteReport: (stationId: string, reportId: string, voteType: 'up' | 'down') => void;
}

export const DetailSpbuView: React.FC<DetailSpbuViewProps> = ({
  station,
  stations,
  userProfile,
  isGuest = false,
  onRequireLogin,
  onBack,
  onSelectStation,
  reportSignal = 0,
  onSubmitReport,
  onVoteReport,
}) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedFuel, setSelectedFuel] = useState('Pertalite');
  const [selectedStatus, setSelectedStatus] = useState<'Tersedia' | 'Terbatas' | 'Kosong'>('Tersedia');
  const [selectedQueue, setSelectedQueue] = useState<'Sepi' | 'Sedang' | 'Panjang'>('Sepi');
  const [reportNote, setReportNote] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { coords: userCoords, accuracyM, status: locStatus, requestLocation } = useUserLocation(true);

  // Tombol "+ Lapor" (tanpa SPBU spesifik) = niat lapor langsung:
  // sheet kebuka otomatis begitu detail tampil.
  useEffect(() => {
    if (reportSignal > 0) setIsSheetOpen(true);
  }, [reportSignal]);

  // Cooldown anti-spam: detik berjalan selama sheet terbuka.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (!isSheetOpen) return;
    setNowTick(Date.now());
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isSheetOpen]);
  // Efektif = penalti global (yen ono) vs cooldown SPBU+BBM sing dipilih.
  // Ganti BBM = countdown ganti: BBM bedo iso langsung dilapor.
  const globalLeftMs = isGuest ? 0 : reportCooldownLeftMs(userProfile.cooldownUntilMs, nowTick);
  const keyLeftMs = isGuest
    ? 0
    : reportKeyCooldownLeftMs(userProfile.reportCooldowns, station.id, selectedFuel, nowTick);
  const cooldownLeftMs = Math.max(globalLeftMs, keyLeftMs);

  // Normalisasi: dokumen lama Firestore iso ora duwe array iki → crash = layar blank.
  const fuels = station.fuels ?? [];
  const reports = station.reports ?? [];

  // Active top community report
  const primaryReport = reports.length > 0 ? reports[0] : null;

  // Konsensus komunitas (PRD BR-2): bobot recency × trust pelapor × vote.
  // Inilah tempat reputasi pelapor benar-benar ngaruh ke status tampil.
  const consensus = useMemo(
    () => computeAggregatedStatus(reports),
    [reports]
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleVote = (voteType: 'up' | 'down') => {
    if (isGuest) {
      onRequireLogin?.();
      showToast('Masuk dulu untuk verifikasi info — bantu jaga akurasi data.');
      return;
    }
    if (!primaryReport) return;
    onVoteReport(station.id, primaryReport.id, voteType);
    if (voteType === 'up') {
      showToast('Terima kasih! Verifikasi Anda memperkuat akurasi data & reputasi pelapor.');
    } else {
      showToast('Tanggapan dicatat untuk penyesuaian bobot info ketersediaan.');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      onRequireLogin?.();
      return;
    }
    if (cooldownLeftMs > 0) {
      showToast(`Sabar — tunggu ${formatCooldown(cooldownLeftMs)} sebelum melapor lagi.`);
      return;
    }
    const res = await onSubmitReport(station.id, {
      stationId: station.id,
      fuelType: selectedFuel,
      status: selectedStatus,
      queueStatus: selectedQueue,
      notes: reportNote.trim() || '',
      reporterName: userProfile.name,
      reporterAvatar: userProfile.avatar,
      reporterTrustScore: userProfile.credibilityScore,
      isVerifiedReporter: userProfile.isVerified,
      minutesAgo: 1,
      // Mulai 0 vote — self-upvote otomatis adalah phantom vote (rule App).
      upvotes: 0,
      downvotes: 0,
    });
    if (!res.accepted) {
      showToast(
        res.retryInMs > 0
          ? `Sabar — tunggu ${formatCooldown(res.retryInMs)} sebelum melapor lagi.`
          : 'Laporan ditolak. Coba lagi.'
      );
      return;
    }

    setIsSheetOpen(false);
    setReportNote('');
    showToast(
      res.penalized
        ? 'Terkirim, tapi info terakhirmu di sini ditolak komunitas (−0,3 skor, jeda 15 mnt). Pastikan lihat langsung.'
        : 'Laporan berhasil dikirim! Reputasi Anda bertambah +15 poin.'
    );
  };

  const handleOpenGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}&query=${encodeURIComponent(
      station.name
    )}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col w-full pb-28 animate-in fade-in duration-200">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between pb-3 -mt-2">
        <button
          onClick={onBack}
          aria-label="Kembali"
          className="flex items-center gap-1.5 text-[#006194] text-xs font-bold hover:underline"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          <span>Kembali ke Daftar</span>
        </button>
        <span className="text-[11px] text-slate-500 font-medium">Detail SPBU & Stok</span>
      </div>

      {/* 1. Peta interaktif — pin SPBU terdekat + lokasi user, mini & fullscreen */}
      <div className="mb-4">
        <StationMap
          stations={stations}
          selectedStationId={station.id}
          onSelectStation={onSelectStation}
          userCoords={userCoords}
          accuracyM={accuracyM}
          locating={locStatus === 'loading'}
          onLocate={requestLocation}
          center={[station.lat, station.lng]}
          followUser={false}
          expandable
        />
      </div>

      {/* 2. Station Core Profile */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-sm mb-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              {station.badges?.map((b) => (
                <span
                  key={b}
                  className="px-2 py-0.5 rounded-full bg-red-50 text-[#ee2737] text-[10px] font-extrabold tracking-wide border border-red-100"
                >
                  {b}
                </span>
              ))}
              <span className="px-2 py-0.5 rounded-full bg-sky-50 text-[#004b73] text-[10px] font-bold border border-sky-100">
                {station.distanceKm} km dari lokasi
              </span>
            </div>
            <h2 className="text-[17px] font-extrabold text-slate-900 leading-tight font-headline">
              {station.name}
            </h2>
          </div>
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0 text-[#ee2737]">
            <span className="material-symbols-outlined text-[24px]">local_gas_station</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
          <span className="material-symbols-outlined text-[16px] text-slate-400">pin_drop</span>
          <span>{station.address}</span>
        </p>

        {/* Facility Badges Scroll Track */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
          {(station.facilities ?? []).map((fac) => (
            <span
              key={fac}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium shrink-0"
            >
              <span className="material-symbols-outlined text-[14px] text-[#006194]">check_circle</span>
              <span>{fac}</span>
            </span>
          ))}
        </div>
      </div>

      {/* 3. Queue Estimator Pulse Box */}
      <div className="bg-slate-100 rounded-xl p-3.5 mb-4 flex items-center justify-between gap-3 border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-[#d97706] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">hourglass_top</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#d97706]">
                Antrean {station.queueStatus}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] text-slate-500">
                {reports.length === 0 ? 'Belum ada laporan' : `Update ${station.lastReportMinutesAgo} mnt lalu`}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-800">
              {station.queueEstimateText}
            </p>
          </div>
        </div>
        <span className="material-symbols-outlined text-slate-400 text-[20px] shrink-0">info</span>
      </div>

      {/* 4. Real-Time Fuel Availability Board */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-headline">Papan Stok Bahan Bakar</h3>
            <p className="text-[11px] text-slate-500">Data terverifikasi komunitas motorist</p>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#006a63] bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
            <span className="material-symbols-outlined text-[13px]">bolt</span>
            <span>Real-time</span>
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {fuels.length === 0 && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 text-center flex flex-col items-center gap-1.5">
              <span className="material-symbols-outlined text-[28px] text-[#006194]">help_outline</span>
              <p className="text-xs font-bold text-slate-800">Stok SPBU ini belum ada datanya</p>
              <p className="text-[11px] text-slate-500">
                Lokasi dari peta OpenStreetMap. Ketuk "Kasih Info BBM" di bawah untuk jadi pelapor pertama.
              </p>
            </div>
          )}
          {fuels.map((fuel) => {
            const isKosong = fuel.status === 'Kosong';
            const isTerbatas = fuel.status === 'Terbatas';

            return (
              <div
                key={fuel.type}
                className={`bg-white rounded-xl p-3.5 shadow-sm border transition-all ${
                  isKosong
                    ? 'border-l-4 border-l-[#dc2626] border-slate-200'
                    : isTerbatas
                    ? 'border-l-4 border-l-[#d97706] border-slate-200'
                    : 'border-slate-200/90 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        isKosong
                          ? 'bg-[#dc2626] animate-ping'
                          : isTerbatas
                          ? 'bg-[#d97706]'
                          : 'bg-[#059669]'
                      }`}
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        {fuel.type}
                      </h4>
                      <span className="text-[10px] text-slate-500">{fuel.ronOrCn}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-base font-extrabold tabular-nums font-headline ${
                        isKosong ? 'text-slate-400 line-through' : 'text-slate-900'
                      }`}
                    >
                      {fuel.price > 0 ? (
                        <>
                          {formatRupiah(fuel.price)}
                          <span className="text-[10px] text-slate-400 font-normal">/L</span>
                        </>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">Harga blm ada</span>
                      )}
                    </div>
                    <StatusPill status={fuel.status} uppercase />
                  </div>
                </div>

                {/* Status footnote or alert */}
                {isKosong && (
                  <div className="bg-red-50/80 rounded-lg px-2.5 py-1.5 text-red-900 text-[11px] flex flex-col gap-0.5 mt-1 border border-red-200/50">
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1 text-[#dc2626]">
                        <span className="material-symbols-outlined text-[15px]">warning</span>
                        <span>{station.lastReportMinutesAgo} mnt lalu oleh {station.contributorsCount} orang</span>
                      </span>
                      <span className="text-[#dc2626]">Nosel Ditutup</span>
                    </div>
                    {fuel.notes && <p className="italic text-slate-600">"{fuel.notes}"</p>}
                  </div>
                )}

                {!isKosong && (
                  <div className="bg-slate-50 rounded-lg px-2.5 py-1 flex items-center justify-between text-slate-500 text-[10px]">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-[#059669]">
                        verified
                      </span>
                      <span>Update {fuel.lastUpdated}</span>
                    </span>
                    {fuel.notes && (
                      <span className="font-semibold text-[#006194]">{fuel.notes}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Live Community Note & Reputation Verification Card */}
      {primaryReport && (
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm mb-4">
          {/* Konsensus komunitas: status agregat berbobot */}
          {reports.length > 0 && (
            <div className="flex items-center justify-between bg-slate-900 text-white rounded-lg px-3 py-2 mb-2.5">
              <span className="text-[11px] font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-teal-300">groups</span>
                Konsensus: {consensus.dominantStatus}
              </span>
              <span className="text-[10px] font-semibold text-slate-300 tabular-nums">
                {consensus.summaryText} • yakin {consensus.confidence}%
              </span>
            </div>
          )}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="shrink-0 ring-2 ring-[#006194]/20 rounded-full">
                <ProfileAvatar
                  name={primaryReport.reporterName}
                  src={primaryReport.reporterAvatar}
                  size="sm"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-900">
                    {primaryReport.reporterName}
                  </span>
                  {primaryReport.isVerifiedReporter && (
                    <span className="material-symbols-outlined text-[15px] text-[#006194]" title="Terverifikasi">
                      verified
                    </span>
                  )}
                  <ReputationBadge credibilityScore={primaryReport.reporterTrustScore} size="xs" />
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  {primaryReport.fuelType} • Antrean {primaryReport.queueStatus}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-slate-400">{primaryReport.minutesAgo} mnt lalu</span>
          </div>

          <div className="bg-slate-50 rounded-lg p-2.5 mb-2.5 border border-slate-100">
            <p className="text-xs text-slate-800 leading-relaxed font-medium">
              "{primaryReport.notes}"
            </p>
          </div>

          {/* Feedback & Peer Verification Bar */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium">Apakah info ini akurat?</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleVote('up')}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all active:scale-95 border ${
                  primaryReport.userVoted === 'up'
                    ? 'bg-[#059669] text-white border-[#059669]'
                    : 'bg-emerald-50 text-[#059669] border-emerald-200 hover:bg-emerald-100'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  thumb_up
                </span>
                <span>{primaryReport.upvotes}</span>
              </button>

              <button
                onClick={() => handleVote('down')}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all active:scale-95 border ${
                  primaryReport.userVoted === 'down'
                    ? 'bg-[#dc2626] text-white border-[#dc2626]'
                    : 'bg-red-50 text-[#dc2626] border-red-200 hover:bg-red-100'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  thumb_down
                </span>
                <span>{primaryReport.downvotes}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Other Community Reports if any */}
      {reports.length > 1 && (
        <div className="flex flex-col gap-2 mb-4">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
            Laporan Komunitas Lainnya ({reports.length - 1})
          </span>
          {reports.slice(1).map((rep) => (
            <div key={rep.id} className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-900">{rep.reporterName}</span>
                  {rep.isVerifiedReporter && (
                    <span className="material-symbols-outlined text-[14px] text-[#006194]">verified</span>
                  )}
                  <ReputationBadge credibilityScore={rep.reporterTrustScore} size="xs" />
                </div>
                <span className="text-[10px] text-slate-400">{rep.minutesAgo} mnt lalu</span>
              </div>
              {rep.notes && <p className="text-xs text-slate-700 italic">"{rep.notes}"</p>}
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                <span>{rep.fuelType} • Antrean {rep.queueStatus}</span>
                <span className="flex items-center gap-1 font-semibold text-[#059669]">
                  <span className="material-symbols-outlined text-[13px]">thumb_up</span>
                  <span>{rep.upvotes}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md px-4 py-3 border-t border-slate-200 z-40 max-w-[480px] mx-auto flex flex-col gap-2 shadow-lg pb-safe">
        {isGuest && (
          <button
            onClick={onRequireLogin}
            type="button"
            className="w-full h-9 rounded-lg bg-sky-50 border border-sky-200 text-[#006194] text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">login</span>
            <span>Masuk untuk lapor stok & verifikasi info</span>
          </button>
        )}
        <div className="flex items-center gap-2.5">
        <button
          onClick={handleOpenGoogleMaps}
          className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#006194] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-98 border border-slate-200"
          type="button"
        >
          <span className="material-symbols-outlined text-[19px]">directions</span>
          <span>Buka Rute</span>
        </button>

        <button
          onClick={() => (isGuest ? onRequireLogin?.() : setIsSheetOpen(true))}
          className="flex-[1.4] h-11 rounded-xl bg-[#006194] hover:bg-[#007bb9] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-98"
          type="button"
        >
          <span className="material-symbols-outlined text-[19px]">campaign</span>
          <span>Kasih Info BBM</span>
        </button>
        </div>
      </div>

      {/* Bottom Sheet Modal for Community Reporting */}
      {isSheetOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex flex-col justify-end">
          <div
            className="w-full max-w-[480px] mx-auto bg-white rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-200"
          >
            {/* Drag Handle Bar */}
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3 shrink-0" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 font-headline">
                  Kasih Info Ketersediaan
                </h3>
                <p className="text-xs text-slate-500">
                  {station.name} • Bantu sesama pengendara
                </p>
              </div>
              <button
                onClick={() => setIsSheetOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex flex-col gap-3.5">
              {/* Jenis BBM Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Bahan Bakar
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Pertalite', 'Pertamax', 'Bio Solar'].map((fuelName) => (
                    <button
                      key={fuelName}
                      type="button"
                      onClick={() => setSelectedFuel(fuelName)}
                      className={`p-2 rounded-lg text-xs font-bold border transition-all text-center ${
                        selectedFuel === fuelName
                          ? 'bg-sky-100 text-[#004b73] border-[#006194]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {fuelName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Availability Triad */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kondisi Stok
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('Tersedia')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border transition-all ${
                      selectedStatus === 'Tersedia'
                        ? 'bg-[#059669] text-white border-[#059669] shadow-sm'
                        : 'bg-emerald-50 text-[#059669] border-emerald-200'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Tersedia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStatus('Terbatas')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border transition-all ${
                      selectedStatus === 'Terbatas'
                        ? 'bg-[#d97706] text-white border-[#d97706] shadow-sm'
                        : 'bg-amber-50 text-[#d97706] border-amber-200'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">timelapse</span>
                    <span>Terbatas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStatus('Kosong')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border transition-all ${
                      selectedStatus === 'Kosong'
                        ? 'bg-[#dc2626] text-white border-[#dc2626] shadow-sm'
                        : 'bg-red-50 text-[#dc2626] border-red-200'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">cancel</span>
                    <span>Kosong</span>
                  </button>
                </div>
              </div>

              {/* Queue Condition Triad */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kondisi Antrean POM
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Sepi', 'Sedang', 'Panjang'] as const).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setSelectedQueue(q)}
                      className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all ${
                        selectedQueue === q
                          ? 'bg-[#006a63] text-white border-[#006a63]'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {q === 'Sepi' ? 'Sepi (<3 mnt)' : q === 'Sedang' ? 'Sedang (6-10)' : 'Panjang (>15)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="rep-note">
                  Catatan Lapangan (Opsional)
                </label>
                <textarea
                  id="rep-note"
                  rows={2}
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder="Cth: Jalur motor dialihkan ke pulau 2, pembayaran QRIS lancar..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                />
              </div>

              {/* Reputation Reward Pill */}
              <div className="bg-sky-50 border border-sky-200 rounded-lg p-2.5 flex items-start gap-2">
                <span className="material-symbols-outlined text-[#006194] text-[20px] shrink-0">
                  military_tech
                </span>
                <p className="text-[11px] text-[#004b73] leading-relaxed">
                  Laporan Anda memberikan <strong>+15 Poin Reputasi</strong> Komunitas mybbm.
                  Cooldown 3 menit mung kanggo SPBU + BBM sing podo — BBM liyo iso langsung kirim.
                </p>
              </div>

              {/* Submit Button — dikunci selama cooldown */}
              <button
                type="submit"
                disabled={cooldownLeftMs > 0}
                className={`w-full h-11 rounded-lg text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 ${
                  cooldownLeftMs > 0
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-[#006194] hover:bg-[#007bb9] text-white active:scale-98'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {cooldownLeftMs > 0 ? 'timer' : 'send'}
                </span>
                <span>
                  {cooldownLeftMs > 0
                    ? `Tunggu ${formatCooldown(cooldownLeftMs)} sebelum melapor`
                    : 'Kirim Laporan Komunitas'}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 inset-x-4 max-w-[420px] mx-auto bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2.5 animate-in slide-in-from-top duration-200 border border-slate-700">
          <span className="material-symbols-outlined text-[#059669] text-[20px]">
            check_circle
          </span>
          <span className="text-xs font-medium flex-1">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
