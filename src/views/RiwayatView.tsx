import React from 'react';
import { Vehicle, FuelLog } from '../types';
import { brandDotClass } from '../components/BrandAvatar';
import { EmptyState } from '../components/EmptyState';
import { Toast } from '../components/Toast';
import { formatRupiah } from '../utils/format';

interface RiwayatViewProps {
  vehicle: Vehicle;
  logs: FuelLog[];
  notice?: string | null;
  onSelectLog: (logId: string) => void;
  onBack: () => void;
  onCatat: () => void;
}

export const RiwayatView: React.FC<RiwayatViewProps> = ({
  vehicle,
  logs,
  notice,
  onSelectLog,
  onBack,
  onCatat,
}) => {
  const vehicleLogs = [...logs]
    .filter((l) => l.vehicleId === vehicle.id)
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

  const totalSpent = vehicleLogs.reduce((a, c) => a + c.totalAmount, 0);
  const totalLiters = vehicleLogs.reduce((a, c) => a + c.liters, 0);

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
        <span className="text-xs font-bold text-slate-700">
          Riwayat • {vehicle.name} ({vehicleLogs.length})
        </span>
      </div>

      {vehicleLogs.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] text-slate-500 font-medium">Total Pengeluaran</span>
            <p className="text-[15px] font-extrabold text-slate-900 tabular-nums">
              {formatRupiah(totalSpent)}
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] text-slate-500 font-medium">Total BBM</span>
            <p className="text-[15px] font-extrabold text-slate-900 tabular-nums">
              {totalLiters.toFixed(2)} L
            </p>
          </div>
        </div>
      )}

      {vehicleLogs.length === 0 ? (
        <EmptyState
          icon="receipt_long"
          title="Belum ada riwayat"
          hint={`Catat pengisian ${vehicle.name} pertamamu, riwayatnya muncul di sini dan bisa diklik untuk detail, ubah, atau hapus.`}
          actionLabel="Catat Sekarang"
          onAction={onCatat}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {vehicleLogs.map((log) => (
            <button
              key={log.id}
              onClick={() => onSelectLog(log.id)}
              type="button"
              className="text-left rounded-xl bg-white p-3.5 border border-slate-200/80 shadow-sm flex flex-col gap-2 cursor-pointer hover:border-sky-300 transition-all active:scale-[0.99]"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${brandDotClass(log.stationBrand)}`} />
                  <span className="text-[14px] text-slate-900 font-bold truncate">{log.stationName}</span>
                </div>
                <span className="text-[11px] text-slate-500 shrink-0 ml-2">{log.displayDate}</span>
              </div>

              <div className="flex items-center justify-between mt-0.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[18px] font-extrabold text-slate-900 tabular-nums">
                    {formatRupiah(log.totalAmount)}
                  </span>
                  <span className="text-xs text-slate-500">
                    • {log.fuelType} {log.liters} L
                  </span>
                </div>
                {log.calculatedKmL ? (
                  <span className="px-2 py-0.5 rounded-md bg-teal-50 text-[#006a63] text-xs font-bold border border-teal-200">
                    {log.calculatedKmL} km/L
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-[18px] text-slate-300">chevron_right</span>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-slate-500 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                    {log.isFullTank ? 'Full Tank' : 'Parsial'}
                  </span>
                  {log.distanceKm ? <span>+{log.distanceKm} km</span> : null}
                </div>
                <span className="text-[#006194] font-bold flex items-center gap-0.5">
                  <span>Detail</span>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {notice && <Toast message={notice} />}
    </div>
  );
};
