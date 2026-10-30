import React, { useState } from 'react';
import { Vehicle, FuelLog } from '../types';
import { Modal } from '../components/Modal';
import { Toast } from '../components/Toast';
import {
  formatRupiah,
  formatKm,
  formatRibuan,
  parseRupiahInput,
  parseLiterInput,
} from '../utils/format';
import { NON_TUNAI_OPTIONS, PaymentCategory } from '../utils/payment';

interface LogDetailViewProps {
  log: FuelLog;
  vehicle: Vehicle;
  /** True bila baru saja dibuat dari form catat — tampilkan banner sukses. */
  justSaved?: boolean;
  onBack: () => void;
  onUpdateLog: (updated: FuelLog) => void;
  onDeleteLog: (logId: string) => void;
}

export const LogDetailView: React.FC<LogDetailViewProps> = ({
  log,
  vehicle,
  justSaved = false,
  onBack,
  onUpdateLog,
  onDeleteLog,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ---- State edit: HANYA nominal + metode + catatan yang bisa diubah.
  // SPBU, jenis BBM, tanggal, odometer, kendaraan dikunci (biar ga ribet).
  const tankCapacityL =
    vehicle.tankCapacityL && vehicle.tankCapacityL > 0
      ? vehicle.tankCapacityL
      : vehicle.type === 'motor'
        ? 5
        : 45;
  const [editLiters, setEditLiters] = useState(log.liters);
  const [editPrice, setEditPrice] = useState(log.pricePerLiter);
  const [editTotal, setEditTotal] = useState(log.totalAmount);
  const [editPayCategory, setEditPayCategory] = useState<PaymentCategory>(() =>
    log.paymentMethod.trim().toLowerCase() === 'tunai' ? 'Tunai' : 'Non-Tunai'
  );
  const [editPayDetail, setEditPayDetail] = useState(() => {
    const m = log.paymentMethod;
    if (m.trim().toLowerCase() === 'tunai') return 'Tunai';
    const detail = m.replace(/^non.tunai\s*[•·\-–:]\s*/i, '').trim();
    return detail || 'QRIS';
  });
  const [editNotes, setEditNotes] = useState(log.notes ?? '');
  const [editError, setEditError] = useState<string | null>(null);

  const flashToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleEditLiters = (val: number) => {
    const clean = Number(Math.max(0, val).toFixed(3));
    setEditLiters(clean);
    setEditTotal(Math.round(clean * editPrice));
  };

  const handleEditPrice = (val: number) => {
    const price = Math.max(0, val);
    setEditPrice(price);
    setEditTotal(Math.round(editLiters * price));
  };

  const handleEditTotal = (val: number) => {
    const clean = Math.max(0, Math.round(val));
    setEditTotal(clean);
    if (editPrice > 0) setEditLiters(Number((clean / editPrice).toFixed(3)));
  };

  const openEdit = () => {
    setEditLiters(log.liters);
    setEditPrice(log.pricePerLiter);
    setEditTotal(log.totalAmount);
    setEditNotes(log.notes ?? '');
    setEditError(null);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!(editPrice > 0)) {
      setEditError('Harga per liter harus lebih dari 0.');
      return;
    }
    if (!(editLiters > 0)) {
      setEditError('Volume BBM harus lebih dari 0.');
      return;
    }
    if (!(editTotal > 0)) {
      setEditError('Total pembayaran harus lebih dari 0.');
      return;
    }
    if (editLiters > tankCapacityL + 1e-9) {
      setEditError(
        `Volume ${editLiters} L melebihi tangki ${vehicle.name} (${tankCapacityL} L).`
      );
      return;
    }
    const distance = log.distanceKm ?? 0;
    const updated: FuelLog = {
      ...log,
      liters: Number(editLiters),
      pricePerLiter: Number(editPrice),
      totalAmount: Math.round(editTotal),
      paymentMethod: editPayCategory === 'Tunai' ? 'Tunai' : `Non-Tunai • ${editPayDetail}`,
      notes: editNotes.trim(),
      calculatedKmL:
        log.isFullTank && distance > 0 && editLiters > 0
          ? Number((distance / editLiters).toFixed(1))
          : log.calculatedKmL,
      costPerKm: distance > 0 ? Math.round(editTotal / distance) : log.costPerKm,
    };
    onUpdateLog(updated);
    setIsEditing(false);
    setEditError(null);
    flashToast('Perubahan nominal disimpan.');
  };

  return (
    <div className="flex flex-col w-full gap-4 pb-28 animate-in fade-in duration-150">
      <div className="flex items-center justify-between -mt-2">
        <button
          onClick={onBack}
          aria-label="Kembali"
          className="flex items-center gap-1.5 text-[#006194] text-xs font-bold hover:underline"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          <span>Kembali</span>
        </button>
        <span className="text-xs font-bold text-slate-700">Detail Pengisian</span>
      </div>

      {justSaved && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-3 flex items-center gap-2.5 shadow-sm">
          <span className="material-symbols-outlined text-emerald-600 text-[22px]">check_circle</span>
          <div>
            <p className="text-xs font-extrabold text-emerald-800">Berhasil disimpan!</p>
            <p className="text-[11px] text-emerald-700">
              Catatan {formatRupiah(log.totalAmount)} • {log.liters} L {log.fuelType} masuk riwayat.
            </p>
          </div>
        </div>
      )}

      {/* Ringkasan utama */}
      <section className="rounded-2xl bg-gradient-to-br from-[#006194] via-[#007bb9] to-[#006a63] p-4 text-white shadow-lg shadow-[#006194]/20">
        <div className="flex items-center gap-1.5 text-[11px] text-sky-200">
          <span className={`w-2 h-2 rounded-full bg-white/80`} />
          <span className="truncate">
            {log.stationName} • {log.displayDate}
          </span>
        </div>
        <p className="text-[26px] font-extrabold tabular-nums mt-1">{formatRupiah(log.totalAmount)}</p>
        <p className="text-[12px] text-sky-100 tabular-nums">
          {log.liters} L {log.fuelType} • {formatRupiah(log.pricePerLiter)}/L
        </p>
        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
          <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
            {log.isFullTank ? 'Full Tank' : 'Parsial'}
          </span>
          <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
            {log.paymentMethod}
          </span>
          {log.calculatedKmL ? (
            <span className="text-[10px] font-bold bg-white text-[#006a63] px-2 py-0.5 rounded-full">
              {log.calculatedKmL} km/L
            </span>
          ) : null}
        </div>
      </section>

      {/* Rincian (kunci) */}
      <section className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-xs font-extrabold text-slate-800 mb-2">Rincian Pengisian</h3>
        <dl className="divide-y divide-slate-100 text-xs">
          {[
            ['Kendaraan', `${vehicle.name} • ${vehicle.plateNumber}`],
            ['SPBU', log.stationName],
            ['Jenis BBM', log.fuelType],
            ['Tanggal', `${log.displayDate}`],
            ['Odometer', `${formatKm(log.odometer)}${log.distanceKm ? ` (+${log.distanceKm} km)` : ''}`],
            ['Biaya per km', log.costPerKm ? formatRupiah(log.costPerKm) : '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-1.5 gap-3">
              <dt className="text-slate-500">{k}</dt>
              <dd className="font-bold text-slate-800 text-right truncate">{v}</dd>
            </div>
          ))}
          {log.notes ? (
            <div className="py-1.5">
              <dt className="text-slate-500 mb-0.5">Catatan</dt>
              <dd className="font-semibold text-slate-800">{log.notes}</dd>
            </div>
          ) : null}
        </dl>
        <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px]">lock</span>
          SPBU, BBM, tanggal & odometer dikunci — yang bisa diubah hanya nominal di bawah.
        </p>
      </section>

      {/* Edit nominal */}
      <section className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#006194]">edit</span>
            Nominal & Pembayaran
          </h3>
          {!isEditing && (
            <button
              onClick={openEdit}
              type="button"
              className="text-[11px] font-bold text-[#006194] bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-lg hover:bg-sky-100 active:scale-95 transition"
            >
              Ubah
            </button>
          )}
        </div>

        {!isEditing ? (
          <dl className="divide-y divide-slate-100 text-xs">
            <div className="flex items-center justify-between py-1.5">
              <dt className="text-slate-500">Volume</dt>
              <dd className="font-extrabold text-slate-800 tabular-nums">{log.liters} L</dd>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <dt className="text-slate-500">Harga / L</dt>
              <dd className="font-extrabold text-slate-800 tabular-nums">{formatRupiah(log.pricePerLiter)}</dd>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <dt className="text-slate-500">Total bayar</dt>
              <dd className="font-extrabold text-[#006194] tabular-nums">{formatRupiah(log.totalAmount)}</dd>
            </div>
          </dl>
        ) : (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <label className="block bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                <span className="text-[10px] text-slate-500 font-bold block mb-1">Volume (Liter)</span>
                <span className="flex items-baseline gap-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editLiters === 0 ? '' : String(editLiters)}
                    onChange={(e) => handleEditLiters(parseLiterInput(e.target.value))}
                    className="w-full bg-transparent text-sm font-extrabold text-slate-900 tabular-nums focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 font-bold">L</span>
                </span>
              </label>
              <label className="block bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                <span className="text-[10px] text-slate-500 font-bold block mb-1">Harga / L (Rp)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatRibuan(editPrice)}
                  onChange={(e) => handleEditPrice(parseRupiahInput(e.target.value))}
                  className="w-full bg-transparent text-sm font-extrabold text-slate-900 tabular-nums focus:outline-none"
                />
              </label>
            </div>
            <label className="block bg-sky-50 border border-sky-300 p-2.5 rounded-lg">
              <span className="text-[10px] text-slate-500 font-bold block mb-1">
                Total bayar (Rp) • otomatis = {editLiters} L × {formatRupiah(editPrice)}
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={formatRibuan(editTotal)}
                onChange={(e) => handleEditTotal(parseRupiahInput(e.target.value))}
                className="w-full bg-transparent text-base font-extrabold text-[#006194] tabular-nums focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">
                Ketik total (mis. 37.000) → liter menyesuaikan. Ketik liter → total menyesuaikan.
              </span>
            </label>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Metode Pembayaran
              </span>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {(['Tunai', 'Non-Tunai'] as PaymentCategory[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditPayCategory(c)}
                    className={`h-9 rounded-lg text-xs font-bold border transition-all ${
                      editPayCategory === c
                        ? 'bg-[#006194] text-white border-[#006194]'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {editPayCategory === 'Non-Tunai' && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {NON_TUNAI_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setEditPayDetail(opt)}
                      className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                        editPayDetail === opt
                          ? 'bg-sky-100 text-[#006194] border-[#006194]'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="block">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Catatan</span>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Cth: promo QRIS"
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006194]"
              />
            </label>

            {editError && (
              <p className="text-[11px] text-red-600 font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {editError}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                type="button"
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                type="button"
                className="flex-1 py-2 rounded-xl bg-[#006194] hover:bg-[#007bb9] text-white text-xs font-bold shadow-xs transition-colors"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Hapus */}
      <button
        onClick={() => setShowDeleteConfirm(true)}
        type="button"
        className="w-full text-xs text-red-600 hover:text-red-700 bg-red-50/80 hover:bg-red-100/80 border border-red-200 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
      >
        <span className="material-symbols-outlined text-[16px]">delete</span>
        <span>Hapus Catatan Ini</span>
      </button>

      {showDeleteConfirm && (
        <Modal
          icon="delete"
          iconBg="bg-red-100"
          iconColor="text-red-600"
          title="Hapus catatan ini?"
          subtitle={`${formatRupiah(log.totalAmount)} • ${log.liters} L • ${log.displayDate}`}
          onClose={() => setShowDeleteConfirm(false)}
        >
          <p className="text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
            Catatan dihapus permanen dari akunmu dan tidak bisa dikembalikan. Odometer kendaraan tidak ikut berubah.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => onDeleteLog(log.id)}
              className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              Ya, Hapus
            </button>
          </div>
        </Modal>
      )}

      {toastMessage && <Toast message={toastMessage} />}
    </div>
  );
};
