import React, { useState } from 'react';
import { Vehicle, UserProfile } from '../types';
import { getReputationTier, REPUTATION_TIERS } from '../utils/reputation';
import { ReputationBadge } from '../components/ReputationBadge';
import { VehicleIcon } from '../components/VehicleIcon';
import { Modal } from '../components/Modal';
import { Toast } from '../components/Toast';
import { ProfileAvatar } from '../components/ProfileAvatar';
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
  onUpdateVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (id: string) => void;
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
  onUpdateVehicle,
  onDeleteVehicle,
  onResetData,
}) => {
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [newVehName, setNewVehName] = useState('');
  const [newVehType, setNewVehType] = useState<'motor' | 'mobil'>('motor');
  const [newVehBrand, setNewVehBrand] = useState('Honda');
  const [newVehModel, setNewVehModel] = useState('');
  const [newVehYear, setNewVehYear] = useState(2024);
  const [plateHead, setPlateHead] = useState('B');
  const [plateNum, setPlateNum] = useState('');
  const [plateTail, setPlateTail] = useState('');
  const [plateError, setPlateError] = useState<string | null>(null);

  const onlyLetters = (v: string, max: number) =>
    v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, max);
  const onlyDigits = (v: string, max: number) =>
    v.replace(/[^0-9]/g, '').slice(0, max);

  /** Plat Indonesia: 1–2 huruf wilayah, 1–4 digit angka, 1–3 huruf seri. */
  const isValidPlate = (head: string, num: string, tail: string) =>
    /^[A-Z]{1,2}$/.test(head) && /^[0-9]{1,4}$/.test(num) && /^[A-Z]{1,3}$/.test(tail);

  const combinedPlate = `${plateHead} ${plateNum} ${plateTail}`.trim().replace(/\s+/g, ' ');
  const [newVehFuel, setNewVehFuel] = useState('Pertalite');
  const [newVehOdo, setNewVehOdo] = useState(1000);
  const [newVehTank, setNewVehTank] = useState(5);

  /** Default kapasitas tangki bila user belum isi (motor 5 L, mobil 45 L). */
  const tankOrDefault = (v: Vehicle) =>
    v.tankCapacityL && v.tankCapacityL > 0 ? v.tankCapacityL : v.type === 'motor' ? 5 : 45;

  /** Pecah plat tersimpan (termasuk format bebas lama) ke 3 segmen form. */
  const parsePlate = (plate: string): [string, string, string] => {
    const m = plate.toUpperCase().match(/^([A-Z]{1,2})\s*([0-9]{1,5})\s*([A-Z]{0,3})$/);
    if (m) return [m[1], m[2].slice(0, 4), m[3]];
    return ['B', plate.replace(/[^0-9]/g, '').slice(0, 4), ''];
  };

  const openAddModal = () => {
    setEditingId(null);
    setNewVehName('');
    setPlateHead('B');
    setPlateNum('');
    setPlateTail('');
    setPlateError(null);
    setNewVehModel('');
    setNewVehTank(5);
    setIsAddVehicleOpen(true);
  };

  const openEditModal = (v: Vehicle) => {
    const [head, num, tail] = parsePlate(v.plateNumber);
    setEditingId(v.id);
    setNewVehName(v.name);
    setNewVehType(v.type);
    setNewVehBrand(v.brand);
    setNewVehModel(v.model);
    setNewVehYear(v.year);
    setPlateHead(head);
    setPlateNum(num);
    setPlateTail(tail);
    setPlateError(null);
    setNewVehFuel(v.primaryFuel);
    setNewVehOdo(v.currentOdo);
    setNewVehTank(v.tankCapacityL ?? (v.type === 'motor' ? 5 : 45));
    setIsAddVehicleOpen(true);
  };

  const tier = getReputationTier(userProfile.credibilityScore);

  const handleSubmitNewVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehName) return;
    if (!isValidPlate(plateHead, plateNum, plateTail)) {
      setPlateError('Format plat: 1–2 huruf, 1–4 angka, 1–3 huruf (cth: B 1234 XYZ).');
      return;
    }
    setPlateError(null);

    if (editingId) {
      const existing = vehicles.find((v) => v.id === editingId);
      onUpdateVehicle({
        ...(existing as Vehicle),
        name: newVehName,
        type: newVehType,
        brand: newVehBrand,
        model: newVehModel || newVehName,
        year: Number(newVehYear) || 2024,
        plateNumber: combinedPlate,
        primaryFuel: newVehFuel,
        currentOdo: Number(newVehOdo) || 0,
        tankCapacityL: Number(newVehTank) || undefined,
      });
      setToastMessage('Kendaraan diperbarui.');
    } else {
      onAddVehicle({
        name: newVehName,
        type: newVehType,
        brand: newVehBrand,
        model: newVehModel || newVehName,
        year: Number(newVehYear) || 2024,
        plateNumber: combinedPlate,
        primaryFuel: newVehFuel,
        currentOdo: Number(newVehOdo) || 0,
        averageKmL: newVehType === 'motor' ? 45.0 : 13.5,
        tankCapacityL: Number(newVehTank) || undefined,
      });
      setToastMessage('Kendaraan ditambahkan.');
    }

    setIsAddVehicleOpen(false);
    setEditingId(null);
    setNewVehName('');
    setPlateHead('B');
    setPlateNum('');
    setPlateTail('');
    setPlateError(null);
    setNewVehModel('');
    setNewVehTank(5);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="flex flex-col w-full gap-4 pb-28 animate-in fade-in duration-150">
      {/* 1. Profile Header Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full ring-3 ring-[#006194]/20 overflow-hidden shrink-0">
            <ProfileAvatar name={userProfile.name} src={userProfile.avatar} size="md" />
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
            onClick={openAddModal}
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
                      {v.plateNumber} • Odo: {formatKm(v.currentOdo)} • Tangki {tankOrDefault(v)} L • {v.averageKmL} km/L
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(v);
                    }}
                    title={`Ubah ${v.name}`}
                    aria-label={`Ubah ${v.name}`}
                    type="button"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-[#006194] hover:bg-sky-50 active:scale-95 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDeleteId(v.id);
                    }}
                    title={`Hapus ${v.name}`}
                    aria-label={`Hapus ${v.name}`}
                    type="button"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-600 hover:bg-red-50 active:scale-95 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
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

      {/* Modal Tambah / Ubah Kendaraan */}
      {isAddVehicleOpen && (
        <Modal
          icon={editingId ? 'edit' : 'two_wheeler'}
          title={editingId ? 'Ubah Kendaraan' : 'Tambah Kendaraan Baru'}
          subtitle={editingId ? 'Perbarui data kendaraanmu' : 'Lengkapi data kendaraanmu'}
          onClose={() => setIsAddVehicleOpen(false)}
        >
          <form onSubmit={handleSubmitNewVehicle} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Jenis Kendaraan</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewVehType('motor');
                      setNewVehTank((prev) => (prev === 45 ? 5 : prev));
                    }}
                    className={`p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border ${
                      newVehType === 'motor' ? 'bg-[#006194] text-white border-[#006194]' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">two_wheeler</span>
                    <span>Sepeda Motor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewVehType('mobil');
                      setNewVehTank((prev) => (prev === 5 ? 45 : prev));
                    }}
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
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nomor Polisi</label>
                  {/* Input plat tersegmen ala plat asli: wilayah • angka • seri */}
                  <div
                    className={`flex items-stretch gap-1.5 bg-slate-900 rounded-xl p-1.5 border-2 transition-colors ${
                      plateError ? 'border-red-500' : 'border-slate-900 focus-within:border-[#006194]'
                    }`}
                  >
                    <input
                      value={plateHead}
                      onChange={(e) => setPlateHead(onlyLetters(e.target.value, 2))}
                      placeholder="B"
                      maxLength={2}
                      aria-label="Kode wilayah"
                      className="w-14 bg-white/10 text-white text-center text-sm font-extrabold tracking-widest rounded-lg py-2 uppercase placeholder:text-slate-500 focus:outline-none focus:bg-white/20"
                    />
                    <input
                      value={plateNum}
                      onChange={(e) => setPlateNum(onlyDigits(e.target.value, 4))}
                      placeholder="1234"
                      maxLength={4}
                      inputMode="numeric"
                      aria-label="Nomor (maks 4 digit)"
                      className="flex-1 min-w-0 bg-white text-slate-900 text-center text-sm font-extrabold tracking-[0.2em] rounded-lg py-2 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                    />
                    <input
                      value={plateTail}
                      onChange={(e) => setPlateTail(onlyLetters(e.target.value, 3))}
                      placeholder="XYZ"
                      maxLength={3}
                      aria-label="Kode seri"
                      className="w-20 bg-white/10 text-white text-center text-sm font-extrabold tracking-widest rounded-lg py-2 uppercase placeholder:text-slate-500 focus:outline-none focus:bg-white/20"
                    />
                  </div>
                  {plateError ? (
                    <p className="text-[11px] text-red-600 font-semibold mt-1">{plateError}</p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-1">
                      {combinedPlate.trim() ? (
                        <>Pratinjau: <span className="font-bold text-slate-600">{combinedPlate}</span></>
                      ) : (
                        'Cth: B 1234 XYZ — angka maksimal 4 digit.'
                      )}
                    </p>
                  )}
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
                  <label className="text-xs font-bold text-slate-700 block mb-1">Kapasitas Tangki (L)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0.5}
                    placeholder={newVehType === 'motor' ? 'Cth: 5.5' : 'Cth: 45'}
                    value={newVehTank}
                    onChange={(e) => setNewVehTank(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                  />
                </div>
                <div className="col-span-2">
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
                  {editingId ? 'Simpan Perubahan' : 'Simpan Kendaraan'}
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

      {/* Modal Konfirmasi Hapus Satu Kendaraan */}
      {pendingDeleteId && (
        <Modal
          icon="delete"
          iconBg="bg-red-100"
          iconColor="text-red-600"
          title={`Hapus ${vehicles.find((v) => v.id === pendingDeleteId)?.name || 'kendaraan'}?`}
          subtitle="Riwayat BBM kendaraan ini ikut terhapus permanen"
          onClose={() => setPendingDeleteId(null)}
        >
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPendingDeleteId(null)}
              className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                onDeleteVehicle(pendingDeleteId);
                setPendingDeleteId(null);
                setToastMessage('Kendaraan dihapus.');
                setTimeout(() => setToastMessage(null), 3000);
              }}
              className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              Ya, Hapus
            </button>
          </div>
        </Modal>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && <Toast message={toastMessage} />}
    </div>
  );
};
