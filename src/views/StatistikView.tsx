import React, { useState, useMemo } from 'react';
import { Vehicle, FuelLog } from '../types';
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
  const [selectedPeriod, setSelectedPeriod] = useState<'7 Hari' | 'Bulan Ini' | '30 Hari' | 'Tahun 2026'>('Bulan Ini');
  const [activeMetric, setActiveMetric] = useState<ChartMetric>('kmL');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Filter logs for this vehicle
  const vehicleLogs = logs.filter((l) => l.vehicleId === activeVehicle.id);

  // Compute metrics
  const totalBiaya = vehicleLogs.reduce((acc, curr) => acc + curr.totalAmount, 0) || 285000;
  const totalLiters = vehicleLogs.reduce((acc, curr) => acc + curr.liters, 0) || 28.5;
  const validKmLs = vehicleLogs.filter((l) => l.calculatedKmL).map((l) => l.calculatedKmL!);
  const avgKmL =
    validKmLs.length > 0
      ? Number((validKmLs.reduce((a, b) => a + b, 0) / validKmLs.length).toFixed(1))
      : activeVehicle.type === 'motor'
      ? 49.8
      : 14.5;
  const totalDistance = vehicleLogs.reduce((acc, curr) => acc + (curr.distanceKm || 0), 0) || 1419;
  const costPerKm = totalDistance > 0 ? Math.round(totalBiaya / totalDistance) : 201;

  // Monthly trends aggregated dataset
  const monthlyData: MonthlyDataPoint[] = useMemo(() => {
    const isMotor = activeVehicle.type === 'motor';
    const baseKmL = isMotor ? 46.0 : 13.0;

    return [
      {
        month: 'Mei',
        fullMonth: 'Mei 2026',
        kmL: Number((baseKmL + 0.8).toFixed(1)),
        liters: isMotor ? 32.5 : 98.0,
        cost: isMotor ? 325000 : 1372000,
        distance: isMotor ? 1520 : 1350,
        logsCount: 4,
      },
      {
        month: 'Jun',
        fullMonth: 'Juni 2026',
        kmL: Number((baseKmL + 1.6).toFixed(1)),
        liters: isMotor ? 31.0 : 94.0,
        cost: isMotor ? 310000 : 1316000,
        distance: isMotor ? 1475 : 1372,
        logsCount: 3,
      },
      {
        month: 'Jul',
        fullMonth: 'Juli 2026',
        kmL: Number((baseKmL + 2.2).toFixed(1)),
        liters: isMotor ? 29.5 : 89.0,
        cost: isMotor ? 295000 : 1246000,
        distance: isMotor ? 1420 : 1352,
        logsCount: 4,
      },
      {
        month: 'Ags',
        fullMonth: 'Agustus 2026',
        kmL: Number((baseKmL + 1.2).toFixed(1)),
        liters: isMotor ? 34.0 : 102.0,
        cost: isMotor ? 340000 : 1428000,
        distance: isMotor ? 1604 : 1448,
        logsCount: 5,
      },
      {
        month: 'Sep',
        fullMonth: 'September 2026',
        kmL: Number((baseKmL + 2.8).toFixed(1)),
        liters: isMotor ? 30.0 : 91.0,
        cost: isMotor ? 300000 : 1274000,
        distance: isMotor ? 1464 : 1437,
        logsCount: 4,
      },
      {
        month: 'Okt',
        fullMonth: 'Oktober 2026',
        kmL: avgKmL,
        liters: Number(totalLiters.toFixed(1)),
        cost: totalBiaya,
        distance: totalDistance,
        logsCount: vehicleLogs.length || 3,
      },
    ];
  }, [activeVehicle.type, avgKmL, totalLiters, totalBiaya, totalDistance, vehicleLogs.length]);

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
            <span className="font-bold text-amber-300">Rp {data.cost.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400 text-[10px] pt-0.5 border-t border-slate-800">
            <span>Jarak Tempuh:</span>
            <span>{data.distance.toLocaleString('id-ID')} km</span>
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
              <span className="material-symbols-outlined text-[19px]">
                {activeVehicle.type === 'motor' ? 'two_wheeler' : 'directions_car'}
              </span>
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
          {(['7 Hari', 'Bulan Ini', '30 Hari', 'Tahun 2026'] as const).map((period) => (
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
              {period === 'Bulan Ini' ? 'Bulan Ini (Okt 2026)' : period}
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
              <span>+2.4 km/L</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Lebih irit drpd Sept</span>
        </div>

        {/* Card 2: Total Biaya */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-500 font-medium">Total Biaya BBM</span>
            <span className="material-symbols-outlined text-[#006a63] text-[18px]">wallet</span>
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900 leading-tight tabular-nums font-headline">
              Rp {totalBiaya.toLocaleString('id-ID')}
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-slate-500 text-[10px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#006194]" />
              <span>{totalLiters.toFixed(1)} Liter diisi</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Okt 2026 ({vehicleLogs.length} struk)</span>
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
                {totalDistance.toLocaleString('id-ID')}
              </span>
              <span className="text-xs text-slate-500 font-semibold">KM</span>
            </div>
            <div className="mt-1 text-slate-500 text-[10px]">
              {vehicleLogs.length}x Pengisian
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Odo: {activeVehicle.currentOdo.toLocaleString('id-ID')} km</span>
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
            <p className="text-[11px] text-slate-500 mt-0.5">Grafik historis konsumsi bulanan (Mei - Okt 2026)</p>
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
                domain={
                  activeMetric === 'kmL'
                    ? [activeVehicle.type === 'motor' ? 40 : 10, activeVehicle.type === 'motor' ? 55 : 18]
                    : activeMetric === 'liters'
                    ? [20, 45]
                    : [200000, 400000]
                }
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

        {/* Dynamic Highlight Insight Banner */}
        <div className="bg-sky-50 text-[#004b73] px-3 py-2 rounded-lg text-xs font-semibold border border-sky-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#059669]">trending_up</span>
            <span>
              {selectedMonth
                ? `Bulan ${selectedMonth}: Efisiensi tercatat stabil di atas target efisiensi.`
                : 'Konsumsi Oktober paling irit (+6.8% vs Mei) berkat servis berkala.'}
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
          <span className="text-xs text-slate-500 font-bold">Rp {totalBiaya.toLocaleString('id-ID')}</span>
        </div>

        {/* Brand Distribution */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-700 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-slate-400">storefront</span>
              Berdasarkan Brand SPBU
            </span>
            <span className="text-slate-400 text-[10px]">2 Operator</span>
          </div>

          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex p-0.5 gap-0.5">
            <div className="h-full bg-[#ee2737] rounded-l-full" style={{ width: '78%' }} />
            <div className="h-full bg-[#ffd200] rounded-r-full" style={{ width: '22%' }} />
          </div>

          <div className="flex items-center justify-between pt-0.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ee2737]" />
              <span className="text-slate-800 font-medium">Pertamina</span>
              <span className="text-slate-400 text-[10px] font-bold">(78% · Rp222.300)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffd200]" />
              <span className="text-slate-800 font-medium">Shell</span>
              <span className="text-slate-400 text-[10px] font-bold">(22% · Rp62.700)</span>
            </div>
          </div>
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

          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex p-0.5 gap-0.5">
            <div className="h-full bg-[#059669] rounded-l-full" style={{ width: '70%' }} />
            <div className="h-full bg-[#005baa] rounded-r-full" style={{ width: '30%' }} />
          </div>

          <div className="flex items-center justify-between pt-0.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
              <span className="text-slate-800 font-medium">Pertalite (RON 90)</span>
              <span className="text-slate-400 text-[10px] font-bold">(70% · 20 L)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#005baa]" />
              <span className="text-slate-800 font-medium">Pertamax (RON 92)</span>
              <span className="text-slate-400 text-[10px] font-bold">(30% · 8.5 L)</span>
            </div>
          </div>
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
            <p className="text-xs text-slate-600 mt-0.5 leading-snug">
              Pengisian di <strong className="text-slate-900">SPBU MT Haryono</strong> menghasilkan konsumsi paling stabil yaitu{' '}
              <strong className="text-[#006194]">51.2 km/L</strong>. Pertahankan gaya berkendara halus!
            </p>
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
                Sisa 150 KM
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5 leading-snug">
              Odometer saat ini: <strong className="text-slate-900">{activeVehicle.currentOdo.toLocaleString('id-ID')} km</strong>. Target servis berkala di{' '}
              <strong className="text-slate-900">{(activeVehicle.currentOdo + 150).toLocaleString('id-ID')} km</strong>.
            </p>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="bg-[#894d00] h-full rounded-full" style={{ width: '88%' }} />
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
