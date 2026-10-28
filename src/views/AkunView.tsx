import React, { useState } from 'react';
import { Vehicle, UserProfile } from '../types';
import { getReputationTier, REPUTATION_TIERS } from '../utils/reputation';
import { ReputationBadge } from '../components/ReputationBadge';
import { VehicleIcon } from '../components/VehicleIcon';
import { Modal } from '../components/Modal';
import { Toast } from '../components/Toast';
import { formatKm } from '../utils/format';

interface AkunViewProps {
  userProfile: UserProfile;
  vehicles: Vehicle[];
  activeVehicleId: string | null;
  currentUser?: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null } | null;
  onLoginGoogle?: () => void;
  onLogoutGoogle?: () => void;
  onSelectVehicle: (id: string) => void;
  onAddVehicle: (newVehicle: Omit<Vehicle, 'id'>) => void;
  onResetData: () => void;
}

export const AkunView: React.FC<AkunViewProps> = ({
  userProfile,
  vehicles,
  activeVehicleId,
  currentUser,
  onLoginGoogle,
  onLogoutGoogle,
  onSelectVehicle,
  onAddVehicle,
  onResetData,
}) => {
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [newVehName, setNewVehName] = useState('');
  const [newVehType, setNewVehType] = useState<'motor' | 'mobil'>('motor');
  const [newVehBrand, setNewVehBrand] = useState('Honda');
  const [newVehModel, setNewVehModel] = useState('');
  const [newVehYear, setNewVehYear] = useState(2024);
  const [newVehPlate, setNewVehPlate] = useState('');
  const [newVehFuel, setNewVehFuel] = useState('Pertalite');
  const [newVehOdo, setNewVehOdo] = useState(1000);

  const tier = getReputationTier(userProfile.credibilityScore);

  const handleSubmitNewVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehName) return;

    onAddVehicle({
      name: newVehName,
      type: newVehType,
      brand: newVehBrand,
      model: newVehModel || newVehName,
      year: Number(newVehYear) || 2024,
      plateNumber: newVehPlate || 'B 1234 XYZ',
      primaryFuel: newVehFuel,
      currentOdo: Number(newVehOdo) || 0,
      averageKmL: newVehType === 'motor' ? 45.0 : 13.5,
    });

    setIsAddVehicleOpen(false);
    setNewVehName('');
    setNewVehPlate('');
    setNewVehModel('');
  };

  return (
    <div className="flex flex-col w-full gap-4 pb-28 animate-in fade-in duration-150">
      {/* 1. Profile Header Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full ring-3 ring-[#006194]/20 overflow-hidden shrink-0 bg-slate-200">
            <img
              src={userProfile.avatar}
              alt={userProfile.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-slate-900 truncate font-headline">
                {userProfile.name}
              </h2>
              {userProfile.isVerified && (
                <span className="material-symbols-outlined text-[17px] text-[#006194]" title="Akun Terverifikasi">
                  verified
                </span>
              )}
              <ReputationBadge credibilityScore={userProfile.credibilityScore} size="sm" />
            </div>
            <p className="text-xs text-slate-500 truncate mt-0.5">{userProfile.email}</p>
            <div className="flex items-center gap-2 mt-2">
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Google Terhubung
                  </span>
                  {onLogoutGoogle && (
                    <button
                      type="button"
                      onClick={onLogoutGoogle}
                      className="text-[11px] font-bold text-slate-500 hover:text-red-600 underline"
                    >
                      Keluar
                    </button>
                  )}
                </div>
              ) : (
                onLoginGoogle && (
                  <button
                    type="button"
                    onClick={onLoginGoogle}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 px-2.5 py-1 rounded-lg shadow-2xs transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                      />
                    </svg>
                    <span>Masuk dengan Google</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Reputation Score & Contributor Metrics */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold block">Skor Reputasi</span>
            <span className="text-base font-extrabold text-slate-900 tabular-nums">
              {userProfile.credibilityScore}
            </span>
          </div>
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold block">Poin Komunitas</span>
            <span className="text-base font-extrabold text-[#006194] tabular-nums">
              +{userProfile.reputationPoints}
            </span>
          </div>
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold block">Laporan Terkirim</span>
            <span className="text-base font-extrabold text-[#059669] tabular-nums">
              {userProfile.totalReports}
            </span>
          </div>
        </div>

        {/* Reputation Explainer Banner */}
        <div className="bg-sky-50 border border-sky-100 rounded-lg p-2.5 flex items-start gap-2 text-xs text-[#004b73]">
          <span className="material-symbols-outlined text-[18px] text-[#006194] shrink-0 mt-0.5">
            info
          </span>
          <p className="text-[11px] leading-relaxed">
            <strong>Cara Kerja Reputasi:</strong> Setiap laporan yang diverifikasi benar (👍) oleh motorist lain akan meningkatkan Skor Kredibilitasmu. Laporan dari pelapor bereputasi tinggi memiliki bobot lebih besar dalam menentukan status live SPBU!
          </p>
        </div>
      </div>

      {/* 2. Vehicle Fleet Management */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[19px] text-[#006194]">garage</span>
            <h3 className="text-sm font-bold text-slate-900 font-headline">Garasi Kendaraan ({vehicles.length})</h3>
          </div>
          <button
            onClick={() => setIsAddVehicleOpen(true)}
            className="text-xs font-bold text-[#006194] bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 flex items-center gap-1 hover:bg-sky-100"
            type="button"
          >
            <span className="material-symbols-outlined text-[15px]">add</span>
            <span>Tambah</span>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {vehicles.map((v) => {
            const isActive = v.id === activeVehicleId;
            return (
              <div
                key={v.id}
                onClick={() => onSelectVehicle(v.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  isActive
                    ? 'bg-sky-50/80 border-[#006194] ring-2 ring-[#006194]/20 shadow-xs'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-[#006194] text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    <VehicleIcon type={v.type} className="text-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-900 truncate">{v.name}</p>
                      {isActive && (
                        <span className="bg-[#006194] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                          Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {v.plateNumber} • Odo: {formatKm(v.currentOdo)} • {v.averageKmL} km/L
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs">
                  {isActive ? (
                    <span className="material-symbols-outlined text-[20px] text-[#006194]">
                      check_circle
                    </span>
                  ) : (
                    <span className="text-slate-400 font-semibold text-[11px] hover:text-[#006194]">
                      Pilih
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Reputation Tiers Ladder */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2.5">
        <h3 className="text-sm font-bold text-slate-900 font-headline">Jenjang Reputasi Pelapor</h3>
        <div className="space-y-2">
          {REPUTATION_TIERS.map((t) => (
            <div
              key={t.label}
              className={`p-2.5 rounded-xl flex items-center justify-between text-xs border transition-all ${
                tier.label === t.label
                  ? 'bg-sky-50/80 border-[#006194] shadow-xs ring-1 ring-[#006194]/20'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <ReputationBadge credibilityScore={t.minScore} size="sm" showScore={false} />
                <span className="font-semibold text-slate-800">{t.label}</span>
                {tier.label === t.label && (
                  <span className="bg-[#006194] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                    Level Kamu
                  </span>
                )}
              </div>
              <span className="text-[11px] font-extrabold text-slate-700 tabular-nums">
                Skor ≥ {t.minScore} ★
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Tentang Aplikasi & Reset */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-900 font-headline">Tentang Aplikasi</h3>

        <div className="flex items-center justify-between text-xs text-slate-700 py-1 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#006194]">info</span>
            <span className="font-semibold">Versi aplikasi</span>
          </div>
          <span className="text-slate-500 text-[11px] font-bold">mybbm 1.0</span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-700 py-1 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#006194]">lock</span>
            <span className="font-semibold">Data tersimpan aman di akunmu</span>
          </div>
          <span className="text-[#059669] font-bold text-[11px]">Aktif</span>
        </div>

        {/* Reset Data Pribadi */}
        <div className="pt-1">
          <button
            onClick={() => setIsResetModalOpen(true)}
            className="w-full text-xs text-red-600 hover:text-red-700 bg-red-50/80 hover:bg-red-100/80 border border-red-200 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            <span>Hapus Data Saya</span>
          </button>
          <p className="text-[10px] text-slate-400 text-center mt-1">
            Menghapus kendaraan, riwayat BBM, dan statistik akunmu. Data SPBU publik tidak ikut terhapus.
          </p>
        </div>
      </div>

      {/* Modal Tambah Kendaraan */}
      {isAddVehicleOpen && (
        <Modal
          icon="two_wheeler"
          title="Tambah Kendaraan Baru"
          subtitle="Lengkapi data kendaraanmu"
          onClose={() => setIsAddVehicleOpen(false)}
        >
          <form onSubmit={handleSubmitNewVehicle} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Jenis Kendaraan</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewVehType('motor')}
                    className={`p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border ${
                      newVehType === 'motor' ? 'bg-[#006194] text-white border-[#006194]' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">two_wheeler</span>
                    <span>Sepeda Motor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewVehType('mobil')}
                    className={`p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border ${
                      newVehType === 'mobil' ? 'bg-[#006194] text-white border-[#006194]' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">directions_car</span>
                    <span>Mobil</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nama Kendaraan</label>
                <input
                  type="text"
                  required
                  placeholder="Cth: Yamaha NMAX 155 atau Honda Brio"
                  value={newVehName}
                  onChange={(e) => setNewVehName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nomor Polisi</label>
                  <input
                    type="text"
                    placeholder="Cth: B 3456 ABC"
                    value={newVehPlate}
                    onChange={(e) => setNewVehPlate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tahun</label>
                  <input
                    type="number"
                    value={newVehYear}
                    onChange={(e) => setNewVehYear(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Odometer Awal (km)</label>
                  <input
                    type="number"
                    value={newVehOdo}
                    onChange={(e) => setNewVehOdo(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">BBM Utama</label>
                  <select
                    value={newVehFuel}
                    onChange={(e) => setNewVehFuel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                  >
                    <option value="Pertalite">Pertalite (RON 90)</option>
                    <option value="Pertamax">Pertamax (RON 92)</option>
                    <option value="Bio Solar">Bio Solar</option>
                    <option value="Shell Super">Shell Super</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddVehicleOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-[#006194] text-white text-xs font-bold shadow"
                >
                  Simpan Kendaraan
                </button>
              </div>
          </form>
        </Modal>
      )}

      {/* Modal Konfirmasi Reset Data Pribadi */}
      {isResetModalOpen && (
        <Modal
          icon="restart_alt"
          iconBg="bg-red-100"
          iconColor="text-red-600"
          title="Reset Data Saya?"
          subtitle="Tindakan ini menghapus permanen data akunmu"
          onClose={() => setIsResetModalOpen(false)}
        >
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5 mb-4">
              <p className="font-semibold text-slate-800">Data yang akan dihapus dari akun ini:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
                <li>Semua kendaraan di garasi</li>
                <li>Seluruh riwayat log pengisian BBM</li>
                <li>Statistik reputasi & laporan (kembali ke awal)</li>
              </ul>
              <p className="text-[11px] text-slate-500">
                Data SPBU publik & laporan komunitas tidak ikut terhapus.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetData();
                  setIsResetModalOpen(false);
                  setToastMessage('Data akun berhasil direset.');
                  setTimeout(() => setToastMessage(null), 3000);
                }}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                Ya, Reset Sekarang
              </button>
            </div>
        </Modal>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && <Toast message={toastMessage} />}
    </div>
  );
};
