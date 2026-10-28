import React, { useState, useMemo } from 'react';
import { Vehicle, FuelLog } from '../types';
import { ServiceTracker, readServiceBaseline } from '../utils/serviceTracker';
import { VehicleIcon } from '../components/VehicleIcon';
import { DistributionBar } from '../components/DistributionBar';
import { EmptyState } from '../components/EmptyState';
import {
  formatRupiah,
  formatKm,
  formatCount,
  SHORT_MONTHS_ID,
  FULL_MONTHS_ID,
  formatBulanSingkatTahun,
} from '../utils/format';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface StatistikViewProps {
  activeVehicle: Vehicle;
  logs: FuelLog[];
  onChangeVehicle: () => void;
  onExportCSV: () => void;
}

type ChartMetric = 'kmL' | 'liters' | 'cost';

interface MonthlyDataPoint {
  month: string;
  fullMonth: string;
  kmL: number;
  liters: number;
  cost: number;
  distance: number;
  logsCount: number;
}

export const StatistikView: React.FC<StatistikViewProps> = ({
  activeVehicle,
  logs,
  onChangeVehicle,
  onExportCSV,
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonthLabel = formatBulanSingkatTahun();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Bulan Ini');
  const [activeMetric, setActiveMetric] = useState<ChartMetric>('kmL');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Filter logs for this vehicle
  const vehicleLogs = logs.filter((l) => l.vehicleId === activeVehicle.id);
  const hasData = vehicleLogs.length > 0;

  // Compute metrics — murni dari data user, tanpa angka fallback
  const totalBiaya = vehicleLogs.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalLiters = vehicleLogs.reduce((acc, curr) => acc + curr.liters, 0);
  const validKmLs = vehicleLogs.filter((l) => l.calculatedKmL).map((l) => l.calculatedKmL!);
  const avgKmL =
    validKmLs.length > 0
      ? Number((validKmLs.reduce((a, b) => a + b, 0) / validKmLs.length).toFixed(1))
      : 0;
  const totalDistance = vehicleLogs.reduce((acc, curr) => acc + (curr.distanceKm || 0), 0);
  const costPerKm = totalDistance > 0 ? Math.round(totalBiaya / totalDistance) : 0;

  // Status servis dari data nyata (dipakai kartu oli, bukan hardcode 150 KM)
  const serviceStatus = useMemo(() => {
    return ServiceTracker.evaluateServiceStatus(
      activeVehicle,
      logs,
      readServiceBaseline(activeVehicle.id)
    );
  }, [activeVehicle, logs]);

  // Tren 6 bulan terakhir — agregasi nyata dari log user (bukan data contoh statis)
  const monthlyData: MonthlyDataPoint[] = useMemo(() => {
    const now = new Date();
    const out: MonthlyDataPoint[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const inMonth = vehicleLogs.filter((l) => {
        const t = new Date(l.dateTime);
        return !isNaN(t.getTime()) && t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth();
      });
      const liters = inMonth.reduce((a, c) => a + c.liters, 0);
      const cost = inMonth.reduce((a, c) => a + c.totalAmount, 0);
      const distance = inMonth.reduce((a, c) => a + (c.distanceKm || 0), 0);
      const kms = inMonth.filter((l) => l.calculatedKmL).map((l) => l.calculatedKmL!);
      out.push({
        month: SHORT_MONTHS_ID[d.getMonth()],
        fullMonth: `${FULL_MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`,
        kmL: kms.length > 0 ? Number((kms.reduce((a, b) => a + b, 0) / kms.length).toFixed(1)) : 0,
        liters: Number(liters.toFixed(1)),
        cost,
        distance,
        logsCount: inMonth.length,
      });
    }
    return out;
  }, [vehicleLogs]);

  // Selisih efisiensi bulan berjalan vs bulan lalu (hanya jika keduanya ada data)
  const lastMonth = monthlyData[monthlyData.length - 1];
  const prevMonth = monthlyData[monthlyData.length - 2];
  const deltaKmL =
    lastMonth.logsCount > 0 && prevMonth.logsCount > 0
      ? Number((lastMonth.kmL - prevMonth.kmL).toFixed(1))
      : null;

  // Komposisi pengeluaran per brand SPBU — dari data nyata
  const brandStats = useMemo(() => {
    const map = new Map<string, number>();
    vehicleLogs.forEach((l) => {
      map.set(l.stationBrand, (map.get(l.stationBrand) ?? 0) + l.totalAmount);
    });
    const total = [...map.values()].reduce((a, b) => a + b, 0);
    return [...map.entries()]
      .map(([name, amount]) => ({
        name,
        amount,
        pct: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [vehicleLogs]);

  // Komposisi liter per jenis BBM — dari data nyata
  const fuelStats = useMemo(() => {
    const map = new Map<string, number>();
    vehicleLogs.forEach((l) => {
      map.set(l.fuelType, (map.get(l.fuelType) ?? 0) + l.liters);
    });
    const total = [...map.values()].reduce((a, b) => a + b, 0);
    return [...map.entries()]
      .map(([name, liters]) => ({
        name,
        liters,
        pct: total > 0 ? Math.round((liters / total) * 100) : 0,
      }))
      .sort((a, b) => b.liters - a.liters);
  }, [vehicleLogs]);

  // SPBU dengan efisiensi full-tank terbaik — dari data nyata
  const bestStation = useMemo(() => {
    const byStation = new Map<string, number[]>();
    vehicleLogs.forEach((l) => {
      if (l.calculatedKmL && l.calculatedKmL > 0) {
        const arr = byStation.get(l.stationName) ?? [];
        arr.push(l.calculatedKmL);
        byStation.set(l.stationName, arr);
      }
    });
    let bestName = '';
    let bestKmL = 0;
    let bestCount = 0;
    byStation.forEach((arr, name) => {
      const avg = Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1));
      if (avg > bestKmL) {
        bestKmL = avg;
        bestName = name;
        bestCount = arr.length;
      }
    });
    return bestCount > 0 ? { name: bestName, kmL: bestKmL, count: bestCount } : null;
  }, [vehicleLogs]);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      onExportCSV();
      setIsExporting(false);
    }, 800);
  };

  // Custom Recharts Tooltip
  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: MonthlyDataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl text-xs shadow-xl border border-slate-700 space-y-1.5 min-w-[170px]">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-1">
            <span className="font-bold text-sky-300">{data.fullMonth}</span>
            <span className="text-[10px] text-slate-400">{data.logsCount}x Isi BBM</span>
          </div>
          <div className="flex items-center justify-between text-slate-200">
            <span>Efisiensi:</span>
            <span className="font-extrabold text-emerald-400 text-sm">
              {data.kmL} <span className="text-[10px] font-normal text-slate-300">km/L</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-300 text-[11px]">
            <span>Total BBM:</span>
            <span className="font-bold">{data.liters.toFixed(1)} L</span>
          </div>
          <div className="flex items-center justify-between text-slate-300 text-[11px]">
            <span>Pengeluaran:</span>
            <span className="font-bold text-amber-300">{formatRupiah(data.cost)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400 text-[10px] pt-0.5 border-t border-slate-800">
            <span>Jarak Tempuh:</span>
            <span>{formatKm(data.distance)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col w-full gap-4 pb-28 animate-in fade-in duration-150">
      {/* 1. Active Vehicle & Period Picker */}
      <div className="flex flex-col gap-2.5 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-[#006a63] shrink-0">
              <VehicleIcon type={activeVehicle.type} className="text-[19px]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Kendaraan Terpilih
              </span>
              <h2 className="text-sm font-extrabold text-slate-900 truncate font-headline">
                {activeVehicle.name}
              </h2>
            </div>
          </div>
          <button
            onClick={onChangeVehicle}
            className="h-7 px-2.5 rounded-full bg-slate-100 text-[#006194] flex items-center gap-1 text-[11px] font-bold active:scale-95 transition-transform"
            type="button"
          >
            <span>Ganti</span>
            <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
          </button>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
          {(['7 Hari', 'Bulan Ini', '30 Hari', `Tahun ${currentYear}`] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                selectedPeriod === period
                  ? 'bg-[#006194] text-white shadow-xs font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              type="button"
            >
                {period === 'Bulan Ini' ? `Bulan Ini (${currentMonthLabel})` : period}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Summary Scorecards Grid (2x2) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Card 1: Efisiensi BBM */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-500 font-medium">Rata-rata Konsumsi</span>
            <span className="material-symbols-outlined text-[#006194] text-[18px]">local_gas_station</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-slate-900 tabular-nums font-headline">
                {avgKmL}
              </span>
              <span className="text-xs text-slate-500 font-semibold">km/L</span>
            </div>
            <div className="mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-[#059669] text-[10px] font-bold border border-emerald-200">
              <span className="material-symbols-outlined text-[13px]">trending_up</span>
              <span>
                {deltaKmL !== null ? `${deltaKmL >= 0 ? '+' : ''}${deltaKmL} km/L` : '—'}
              </span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            {deltaKmL !== null ? 'vs bulan lalu' : 'Belum ada pembanding'}
          </span>
        </div>

        {/* Card 2: Total Biaya */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-500 font-medium">Total Biaya BBM</span>
            <span className="material-symbols-outlined text-[#006a63] text-[18px]">wallet</span>
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900 leading-tight tabular-nums font-headline">
              {formatRupiah(totalBiaya)}
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-slate-500 text-[10px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#006194]" />
              <span>{totalLiters.toFixed(1)} Liter diisi</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            {currentMonthLabel} ({vehicleLogs.length} struk)
          </span>
        </div>

        {/* Card 3: Biaya / Jarak */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-500 font-medium">Biaya / Jarak</span>
            <span className="material-symbols-outlined text-[#d97706] text-[18px]">price_change</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-slate-900 tabular-nums font-headline">
                {costPerKm}
              </span>
              <span className="text-xs text-slate-500 font-semibold">Rp/km</span>
            </div>
            <div className="mt-1 text-slate-600 text-[10px] font-medium">
              Sangat Hemat
            </div>
          </div>
          <span className="text-[10px] text-[#059669] font-bold mt-1">Standar {activeVehicle.type}: ~Rp230/km</span>
        </div>

        {/* Card 4: Jarak Tempuh */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-500 font-medium">Jarak Tempuh</span>
            <span className="material-symbols-outlined text-[#006194] text-[18px]">route</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-slate-900 tabular-nums font-headline">
                {formatCount(totalDistance)}
              </span>
              <span className="text-xs text-slate-500 font-semibold">KM</span>
            </div>
            <div className="mt-1 text-slate-500 text-[10px]">
              {vehicleLogs.length}x Pengisian
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Odo: {formatKm(activeVehicle.currentOdo)}</span>
        </div>
      </div>

      {/* 3. Recharts Line Chart: Tren Konsumsi BBM Bulanan */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[19px] text-[#006194]">show_chart</span>
              <h3 className="text-sm font-bold text-slate-900 font-headline">Tren Konsumsi BBM Bulanan</h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Grafik historis konsumsi bulanan ({monthlyData[0].month} - {lastMonth.month} {currentYear})
            </p>
          </div>

          {/* Metric Selector Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveMetric('kmL')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                activeMetric === 'kmL'
                  ? 'bg-white text-[#006194] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              km/L
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('liters')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                activeMetric === 'liters'
                  ? 'bg-white text-[#006194] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Liter
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('cost')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                activeMetric === 'cost'
                  ? 'bg-white text-[#006194] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Biaya
            </button>
          </div>
        </div>

        {/* Recharts Line Chart Container */}
        {!hasData ? (
          <EmptyState
            icon="show_chart"
            title="Belum ada data untuk grafik"
            hint="Catat pengisian BBM pertamamu, grafik tren akan muncul di sini."
            className="py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300"
          />
        ) : (
        <div className="w-full h-56 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={monthlyData}
              margin={{ top: 12, right: 12, left: -16, bottom: 0 }}
              onClick={(e) => {
                if (e && e.activeLabel) {
                  setSelectedMonth(String(e.activeLabel));
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => {
                  if (activeMetric === 'cost') return `${Math.round(val / 1000)}rb`;
                  if (activeMetric === 'kmL') return `${val}`;
                  return `${val}L`;
                }}
              />
              <Tooltip content={renderCustomTooltip} />
              {activeMetric === 'kmL' && (
                <ReferenceLine
                  y={avgKmL}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  label={{
                    value: `Rata-rata: ${avgKmL} km/L`,
                    position: 'insideTopRight',
                    fill: '#64748b',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey={activeMetric}
                stroke={activeMetric === 'cost' ? '#d97706' : activeMetric === 'liters' ? '#0284c7' : '#006194'}
                strokeWidth={3}
                dot={{
                  r: 4,
                  fill: '#ffffff',
                  stroke: activeMetric === 'cost' ? '#d97706' : activeMetric === 'liters' ? '#0284c7' : '#006194',
                  strokeWidth: 2.5,
                }}
                activeDot={{
                  r: 6,
                  fill: '#059669',
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }}
                animationDuration={600}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        )}

        {/* Dynamic Highlight Insight Banner */}
        <div className="bg-sky-50 text-[#004b73] px-3 py-2 rounded-lg text-xs font-semibold border border-sky-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#059669]">trending_up</span>
            <span>
              {(() => {
                if (selectedMonth) {
                  const m = monthlyData.find((x) => x.month === selectedMonth);
                  if (m && m.logsCount > 0) {
                    return `Bulan ${m.fullMonth}: ${m.logsCount}x pengisian, efisiensi ${m.kmL} km/L, biaya ${formatRupiah(m.cost)}.`;
                  }
                  return `Bulan ${selectedMonth}: belum ada catatan pengisian.`;
                }
                if (!hasData) return 'Belum ada data — catat pengisian pertamamu untuk melihat insight.';
                return `Bulan ${lastMonth.fullMonth}: ${lastMonth.logsCount}x pengisian, efisiensi ${lastMonth.kmL} km/L.`;
              })()}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">recharts live</span>
        </div>

        {/* Quick Monthly Pills for detail inspection */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar">
          {monthlyData.map((m) => {
            const isSelected = selectedMonth === m.month;
            return (
              <button
                key={m.month}
                type="button"
                onClick={() => setSelectedMonth(isSelected ? null : m.month)}
                className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg border text-center transition-all shrink-0 ${
                  isSelected
                    ? 'bg-sky-100/80 border-[#006194] text-[#006194] font-bold shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="text-[10px] text-slate-400 font-medium">{m.month}</span>
                <span className="text-xs font-extrabold tabular-nums">
                  {activeMetric === 'kmL' ? `${m.kmL}` : activeMetric === 'liters' ? `${m.liters}L` : `${Math.round(m.cost / 1000)}rb`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Breakdown Komposisi Pengeluaran */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 font-headline">Komposisi Pengeluaran</h3>
          <span className="text-xs text-slate-500 font-bold">{formatRupiah(totalBiaya)}</span>
        </div>

        {/* Brand Distribution */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-700 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-slate-400">storefront</span>
              Berdasarkan Brand SPBU
            </span>
            <span className="text-slate-400 text-[10px]">
              {brandStats.length > 0 ? `${brandStats.length} Operator` : 'Belum ada data'}
            </span>
          </div>

          <DistributionBar
            items={brandStats.map((b, i) => ({
              label: b.name,
              sub: formatRupiah(b.amount),
              pct: b.pct,
              color: i === 0 ? '#ee2737' : '#ffd200',
            }))}
            emptyText="Catat pengisian untuk melihat komposisi brand."
          />
        </div>

        <div className="w-full h-px bg-slate-100" />

        {/* Fuel Type Distribution */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-700 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-slate-400">opacity</span>
              Berdasarkan Jenis Bahan Bakar
            </span>
            <span className="text-slate-400 text-[10px]">{totalLiters.toFixed(1)} Liter</span>
          </div>

          <DistributionBar
            items={fuelStats.map((f, i) => ({
              label: f.name,
              sub: `${f.liters.toFixed(1)} L`,
              pct: f.pct,
              color: i === 0 ? '#059669' : '#005baa',
            }))}
            emptyText="Catat pengisian untuk melihat komposisi BBM."
          />
        </div>
      </div>

      {/* 5. Smart Driving Insights & Diagnostics */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1">
          Smart Insights & Pengingat
        </span>

        {/* Insight Card 1 */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-[#006194] shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[18px]">lightbulb</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-bold text-slate-900">SPBU Rekomendasi Hemat</span>
            {bestStation ? (
              <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                Pengisian di <strong className="text-slate-900">{bestStation.name}</strong> menghasilkan
                konsumsi paling stabil yaitu <strong className="text-[#006194]">{bestStation.kmL} km/L</strong>{' '}
                ({bestStation.count}x full tank). Pertahankan gaya berkendara halus!
              </p>
            ) : (
              <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                Belum ada data efisiensi. Aktifkan <strong>Full Tank</strong> saat mencatat agar
                rekomendasi muncul di sini.
              </p>
            )}
          </div>
        </div>

        {/* Maintenance Warning */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-[#894d00] shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[18px]">oil_barrel</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Jadwal Ganti Oli Mesin</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-[#894d00] text-[10px] font-extrabold">
                {serviceStatus.remainingKm <= 0
                  ? 'Terlewati'
                  : `Sisa ${formatKm(serviceStatus.remainingKm).toUpperCase()}`}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5 leading-snug">
              Odometer saat ini:{' '}
              <strong className="text-slate-900">
                {formatKm(serviceStatus.currentMileage)}
              </strong>
              . Target servis berkala di{' '}
              <strong className="text-slate-900">
                {formatKm(serviceStatus.nextServiceMileage)}
              </strong>
              .
            </p>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-[#894d00] h-full rounded-full"
                style={{ width: `${serviceStatus.progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 6. Export Button */}
      <div className="pt-1 flex flex-col gap-1.5">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full h-11 rounded-xl bg-white border border-slate-200 text-[#006194] text-xs font-bold shadow-xs flex items-center justify-center gap-2 active:scale-98 transition-all hover:bg-slate-50"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">
            {isExporting ? 'progress_activity' : 'download'}
          </span>
          <span>{isExporting ? 'Menyiapkan Dokumen...' : 'Unduh Laporan Konsumsi (CSV / PDF)'}</span>
        </button>
        <p className="text-center text-[10px] text-slate-400">
          Laporan lengkap memenuhi standar klaim bensin operasional kantor.
        </p>
      </div>
    </div>
  );
};
