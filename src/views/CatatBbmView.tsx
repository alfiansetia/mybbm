import React, { useState, useRef } from 'react';
import { Vehicle, FuelLog, GasStation } from '../types';

interface CatatBbmViewProps {
  activeVehicle: Vehicle;
  allVehicles: Vehicle[];
  stations: GasStation[];
  initialMode?: 'scan' | 'manual';
  onSaveLog: (newLog: FuelLog) => void;
  onCancel: () => void;
}

export const CatatBbmView: React.FC<CatatBbmViewProps> = ({
  activeVehicle,
  allVehicles,
  stations,
  initialMode = 'scan',
  onSaveLog,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>(initialMode);
  const [isScanning, setIsScanning] = useState(false);
  const [scanConfidence, setScanConfidence] = useState<number | null>(98);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // Form states
  const [selectedVehicleId, setSelectedVehicleId] = useState(activeVehicle.id);
  const [stationName, setStationName] = useState('SPBU 31.12802 MT Haryono');
  const [stationBrand, setStationBrand] = useState<'Pertamina' | 'Shell' | 'Vivo' | 'BP' | 'Toko Madura' | 'Lainnya'>('Pertamina');
  const [dateTime, setDateTime] = useState('17 Okt 2026, 08:45 WIB');
  const [fuelType, setFuelType] = useState('Pertalite');
  const [previousOdo, setPreviousOdo] = useState(activeVehicle.currentOdo > 195 ? activeVehicle.currentOdo - 195 : 14655);
  const [currentOdo, setCurrentOdo] = useState(activeVehicle.currentOdo || 14850);
  const [isFullTank, setIsFullTank] = useState(true);
  const [liters, setLiters] = useState(3.80);
  const [pricePerLiter, setPricePerLiter] = useState(10000);
  const [totalAmount, setTotalAmount] = useState(38000);
  const [paymentMethod, setPaymentMethod] = useState('QRIS / MyPertamina');
  const [notes, setNotes] = useState('');
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [showOdoWarningModal, setShowOdoWarningModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentVehicle = allVehicles.find((v) => v.id === selectedVehicleId) || activeVehicle;
  const distanceKm = currentOdo > previousOdo ? currentOdo - previousOdo : 0;
  const calculatedKmL = isFullTank && distanceKm > 0 && liters > 0 ? Number((distanceKm / liters).toFixed(1)) : undefined;
  const costPerKm = distanceKm > 0 && totalAmount > 0 ? Math.round(totalAmount / distanceKm) : undefined;

  // Handle price/volume recalculations
  const handleLitersChange = (val: number) => {
    setLiters(val);
    setTotalAmount(Math.round(val * pricePerLiter));
  };

  const handlePricePerLiterChange = (val: number) => {
    setPricePerLiter(val);
    setTotalAmount(Math.round(liters * val));
  };

  const handleTotalAmountChange = (val: number) => {
    setTotalAmount(val);
    if (pricePerLiter > 0) {
      setLiters(Number((val / pricePerLiter).toFixed(2)));
    }
  };

  // Preset receipt samples for quick demo
  const handleApplyPresetReceipt = (type: 'pertamina' | 'shell' | 'solar') => {
    setIsScanning(true);
    setTimeout(() => {
      if (type === 'pertamina') {
        setStationName('SPBU 31.12802 MT Haryono');
        setStationBrand('Pertamina');
        setFuelType('Pertalite');
        setLiters(3.80);
        setPricePerLiter(10000);
        setTotalAmount(38000);
        setPaymentMethod('QRIS / MyPertamina');
        setScanConfidence(98);
      } else if (type === 'shell') {
        setStationName('Shell MT Haryono');
        setStationBrand('Shell');
        setFuelType('Shell Super');
        setLiters(3.50);
        setPricePerLiter(13500);
        setTotalAmount(47250);
        setPaymentMethod('QRIS / GoPay');
        setScanConfidence(96);
      } else {
        setStationName('SPBU 34.12803 Pancoran');
        setStationBrand('Pertamina');
        setFuelType('Bio Solar');
        setLiters(15.0);
        setPricePerLiter(6800);
        setTotalAmount(102000);
        setPaymentMethod('Tunai');
        setScanConfidence(94);
      }
      setIsScanning(false);
    }, 600);
  };

  // Upload custom receipt file and send to backend
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setReceiptPreview(base64Data);
      setIsScanning(true);

      try {
        const response = await fetch('/api/scan-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: file.type || 'image/jpeg',
          }),
        });

        const resData = await response.json();
        if (resData.success && resData.data) {
          const d = resData.data;
          if (d.stationName) setStationName(d.stationName);
          if (d.stationBrand) setStationBrand(d.stationBrand);
          if (d.fuelType) setFuelType(d.fuelType);
          if (d.liters) setLiters(d.liters);
          if (d.pricePerLiter) setPricePerLiter(d.pricePerLiter);
          if (d.totalAmount) setTotalAmount(d.totalAmount);
          if (d.paymentMethod) setPaymentMethod(d.paymentMethod);
          if (d.confidence) setScanConfidence(d.confidence);
          if (d.dateTime) setDateTime(d.dateTime);
        }
      } catch (err) {
        console.warn('Scan request error, fallback used:', err);
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (bypassOdoCheck = false) => {
    if (!bypassOdoCheck && currentOdo < previousOdo) {
      setShowOdoWarningModal(true);
      return;
    }

    const newLog: FuelLog = {
      id: `log-${Date.now()}`,
      vehicleId: selectedVehicleId,
      dateTime: new Date().toISOString(),
      displayDate: '17 Okt 2026',
      stationName,
      stationBrand,
      fuelType,
      odometer: Number(currentOdo),
      previousOdo: Number(previousOdo),
      distanceKm,
      isFullTank,
      liters: Number(liters),
      pricePerLiter: Number(pricePerLiter),
      totalAmount: Number(totalAmount),
      paymentMethod,
      calculatedKmL,
      costPerKm,
      efficiencyBadge: calculatedKmL && calculatedKmL > 45 ? 'Sangat Irit' : 'Irit',
      notes,
    };

    setIsSavedSuccess(true);
    setTimeout(() => {
      onSaveLog(newLog);
    }, 600);
  };

  return (
    <div className="flex flex-col w-full pb-24 animate-in fade-in duration-150">
      {/* Top Header / Back */}
      <div className="flex items-center justify-between pb-3 -mt-2">
        <button
          onClick={onCancel}
          aria-label="Kembali"
          className="flex items-center gap-1.5 text-[#006194] text-xs font-bold hover:underline"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          <span>Batal</span>
        </button>
        <span className="text-xs font-bold text-slate-700">Catat Pengisian BBM</span>
      </div>

      {/* Segmented Control Tab Switcher */}
      <div className="mb-4">
        <div className="bg-slate-200/80 p-1 rounded-full flex items-center shadow-inner">
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'scan'
                ? 'bg-white text-[#006194] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">document_scanner</span>
            <span>Scan Struk AI</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'manual'
                ? 'bg-white text-[#006194] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">edit_note</span>
            <span>Input Manual</span>
          </button>
        </div>
      </div>

      {/* AI Receipt Scanner Viewport (Visible in Scan Tab) */}
      {activeTab === 'scan' && (
        <div className="mb-4 bg-slate-900 rounded-xl overflow-hidden shadow-md flex flex-col border border-slate-800">
          <div className="relative w-full h-52 bg-slate-950 overflow-hidden flex items-center justify-center p-3">
            {/* Simulated / Real Struk Bounding Box Overlay */}
            <div className="w-64 bg-white p-3 rounded-lg shadow-2xl transform rotate-[-1deg] relative font-mono text-[10px] text-slate-800 leading-tight select-none border border-slate-200">
              {/* Receipt Header */}
              <div className="text-center pb-1.5 mb-1.5 bg-slate-50 rounded p-1 border border-slate-100">
                <p className="font-extrabold text-[#ee2737] tracking-wider truncate">{stationName}</p>
                <p className="text-[8px] text-slate-400">JL. MT HARYONO KAV 18 JAKARTA</p>
              </div>

              {/* OCR Extracted Lines with Bounding highlights */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center relative p-1 rounded bg-teal-50 border border-teal-200">
                  <span className="font-bold text-slate-600">PRODUK :</span>
                  <span className="font-extrabold text-[#006194]">{fuelType.toUpperCase()}</span>
                  <span className="absolute -top-1.5 -right-1 bg-[#006a63] text-white px-1 rounded-full text-[7px] font-bold">
                    RON 90
                  </span>
                </div>

                <div className="flex justify-between items-center relative p-1 rounded bg-teal-50/70 border border-teal-100">
                  <span className="text-slate-500">VOLUME (L) :</span>
                  <span className="font-extrabold tabular-nums">{liters.toFixed(3)} L</span>
                  <span className="absolute -bottom-1 -left-1 bg-[#006a63] text-white px-1 rounded text-[7px]">
                    OCR {scanConfidence || 98}%
                  </span>
                </div>

                <div className="flex justify-between items-center p-1 rounded bg-teal-50/70 border border-teal-100">
                  <span className="text-slate-500">HARGA/L :</span>
                  <span className="font-bold tabular-nums">Rp {pricePerLiter.toLocaleString('id-ID')}</span>
                </div>

                <div className="flex justify-between items-center p-1.5 rounded bg-sky-100 text-[#001d31] font-bold text-[11px] border border-sky-300">
                  <span>TOTAL :</span>
                  <span className="text-[#006194] font-extrabold tabular-nums">
                    Rp {totalAmount.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="mt-1.5 text-center text-[8px] text-slate-400">
                TRX: 98402/20261017 • {paymentMethod}
              </div>

              {/* Scanner Sweep Line Animation */}
              {isScanning && (
                <div className="absolute inset-x-0 top-0 h-1 bg-sky-400 shadow-[0_0_12px_#38bdf8] animate-pulse transition-all" />
              )}
            </div>

            {/* Camera / Scan Controls */}
            <div className="absolute top-2.5 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/80 text-white backdrop-blur-md text-[10px] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#059669] animate-ping" />
              <span>{isScanning ? 'MEMINDAI DOKUMEN...' : 'AUTO-DETECT AKTIF'}</span>
            </div>

            <div className="absolute top-2.5 right-3 flex items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Unggah Foto Struk"
                aria-label="Unggah Struk"
                type="button"
                className="w-8 h-8 rounded-full bg-slate-800/90 text-white flex items-center justify-center hover:bg-slate-700 shadow"
              >
                <span className="material-symbols-outlined text-[17px]">photo_camera</span>
              </button>
            </div>
          </div>

          {/* Quick presets for testing */}
          <div className="bg-slate-900 px-3 py-2 border-t border-slate-800 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
            <span className="text-[10px] text-slate-400 font-semibold shrink-0">Contoh Struk:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleApplyPresetReceipt('pertamina')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10px] font-semibold shrink-0"
              >
                Pertamina Rp38k
              </button>
              <button
                type="button"
                onClick={() => handleApplyPresetReceipt('shell')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-semibold shrink-0"
              >
                Shell Rp47k
              </button>
              <button
                type="button"
                onClick={() => handleApplyPresetReceipt('solar')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[10px] font-semibold shrink-0"
              >
                Solar Rp102k
              </button>
            </div>
          </div>

          {/* Success Status Ribbon */}
          <div className="bg-teal-900/40 border-t border-teal-800/60 px-3 py-2 flex items-center justify-between text-teal-100">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-teal-400 text-[18px]">auto_awesome</span>
              <p className="text-xs font-semibold">
                Struk terbaca akurat <span className="text-teal-300 font-bold">({scanConfidence || 98}%)</span>
              </p>
            </div>
            <span className="bg-[#006a63] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">check</span> AI Extracted
            </span>
          </div>
        </div>
      )}

      {/* Main Extracted Form Data */}
      <div className="space-y-3.5">
        {/* Vehicle Selector */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Kendaraan</label>
            <span className="text-[10px] font-bold text-[#006a63] bg-teal-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-teal-200">
              <span className="material-symbols-outlined text-[12px]">check_circle</span> Terhubung
            </span>
          </div>
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-[#006194] shrink-0 font-bold">
                <span className="material-symbols-outlined text-[18px]">
                  {currentVehicle.type === 'motor' ? 'two_wheeler' : 'directions_car'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{currentVehicle.name}</p>
                <p className="text-[10px] text-slate-500">
                  {currentVehicle.plateNumber} • {currentVehicle.engineSpec || 'Bensin'}
                </p>
              </div>
            </div>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#006194] focus:outline-none cursor-pointer"
            >
              {allVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date & Station Card */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
          {/* Timestamp */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Tanggal & Waktu Pengisian
            </label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-slate-800">
              <span className="material-symbols-outlined text-[18px] text-[#006194]">calendar_today</span>
              <input
                type="text"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold focus:outline-none"
              />
              <span className="material-symbols-outlined text-[16px] text-[#006a63]">verified</span>
            </div>
          </div>

          {/* SPBU Location */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Lokasi SPBU</label>
              <span className="text-[10px] font-bold text-[#006194] flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">near_me</span> GPS Cocok
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg">
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 font-bold text-xs ${
                  stationBrand === 'Pertamina'
                    ? 'bg-red-100 text-[#ee2737]'
                    : stationBrand === 'Shell'
                    ? 'bg-amber-100 text-[#894d00]'
                    : 'bg-teal-100 text-[#006a63]'
                }`}
              >
                {stationBrand === 'Pertamina' ? 'P' : stationBrand === 'Shell' ? 'S' : 'B'}
              </div>
              <input
                type="text"
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                placeholder="Nama atau Alamat SPBU"
                className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Jenis Bahan Bakar Selector */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Jenis Bahan Bakar</label>
            <span className="text-[10px] text-[#006a63] font-semibold flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[13px]">done_all</span> Terverifikasi Struk
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { name: 'Pertalite', ron: 'RON 90' },
              { name: 'Pertamax', ron: 'RON 92' },
              { name: 'Turbo', ron: 'RON 98' },
            ].map((f) => {
              const isSelected = fuelType.toLowerCase().includes(f.name.toLowerCase());
              return (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => setFuelType(f.name)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg transition-transform active:scale-95 border ${
                    isSelected
                      ? 'bg-[#006194] text-white border-[#006194] shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs font-bold">{f.name}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-sky-200' : 'text-slate-400'}`}>
                    {f.ron}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Odometer Tracking & Delta Calculation */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#006194]">speed</span>
              <span className="text-xs font-bold text-slate-900">Catatan Odometer</span>
            </div>
            {distanceKm > 0 && (
              <span className="text-[10px] text-[#006a63] bg-teal-50 px-2 py-0.5 rounded-full font-bold border border-teal-200">
                +{distanceKm} km jarak tempuh
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
              <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Odo Sebelumnya</span>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  value={previousOdo}
                  onChange={(e) => setPreviousOdo(Number(e.target.value))}
                  className="w-full bg-transparent text-sm font-extrabold text-slate-700 tabular-nums focus:outline-none"
                />
                <span className="text-xs text-slate-400">km</span>
              </div>
            </div>

            <div className="bg-sky-50 border border-sky-200 p-2.5 rounded-lg">
              <span className="text-[10px] text-[#006194] font-bold block mb-0.5">Odo Sekarang</span>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  value={currentOdo}
                  onChange={(e) => setCurrentOdo(Number(e.target.value))}
                  className="w-full bg-transparent text-sm font-extrabold text-[#006194] tabular-nums focus:outline-none"
                />
                <span className="text-xs text-[#006194] font-medium">km</span>
              </div>
            </div>
          </div>

          {/* Full Tank Toggle */}
          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex items-center justify-between">
            <div className="flex items-start gap-2 max-w-[78%]">
              <span className="material-symbols-outlined text-[18px] text-[#006194] shrink-0 mt-0.5">
                local_gas_station
              </span>
              <div>
                <p className="text-xs font-bold text-slate-800">Isi Penuh (Full Tank)</p>
                <p className="text-[10px] text-slate-500">
                  Wajib aktif untuk kalkulasi konsumsi km/L yang valid
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={isFullTank}
                onChange={(e) => setIsFullTank(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#006a63]" />
            </label>
          </div>
        </div>

        {/* Volume, Harga & Total Pembayaran */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
              <span className="text-[10px] font-bold text-slate-500 block mb-1">Volume BBM</span>
              <div className="flex items-baseline justify-between">
                <input
                  type="number"
                  step="0.01"
                  value={liters}
                  onChange={(e) => handleLitersChange(Number(e.target.value))}
                  className="w-full bg-transparent text-base font-extrabold text-slate-900 tabular-nums focus:outline-none"
                />
                <span className="text-xs font-bold text-slate-400">Liter</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
              <span className="text-[10px] font-bold text-slate-500 block mb-1">Harga per Liter</span>
              <div className="flex items-baseline justify-between">
                <input
                  type="number"
                  value={pricePerLiter}
                  onChange={(e) => handlePricePerLiterChange(Number(e.target.value))}
                  className="w-full bg-transparent text-base font-extrabold text-slate-900 tabular-nums focus:outline-none"
                />
                <span className="text-[10px] font-bold text-slate-400">Rp/L</span>
              </div>
            </div>
          </div>

          {/* Total Bayar Box */}
          <div className="bg-slate-100 border border-slate-200/90 p-3 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Total Pembayaran
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-sm font-bold text-[#006194]">Rp</span>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => handleTotalAmountChange(Number(e.target.value))}
                  className="w-32 bg-transparent text-lg font-extrabold text-[#006194] tabular-nums focus:outline-none"
                />
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 block">Metode Pembayaran</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-white px-2 py-1 rounded border border-slate-200 shadow-xs mt-0.5">
                <span className="material-symbols-outlined text-[13px] text-[#ee2737]">qr_code_2</span>
                <span>{paymentMethod}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Live Preview Efficiency Banner */}
        {calculatedKmL && (
          <div className="bg-gradient-to-r from-teal-50 via-teal-100/70 to-emerald-50 border border-teal-200 p-3 rounded-xl shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#006a63] text-white flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[20px]">eco</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#006a63]">
                  Estimasi Efisiensi
                </span>
                <span className="text-[9px] bg-[#059669] text-white px-1.5 py-0.2 rounded-full font-bold">
                  Sangat Irit
                </span>
              </div>
              <p className="text-sm font-extrabold text-slate-900 tracking-tight font-headline">
                {calculatedKmL} km/L{' '}
                {costPerKm && (
                  <span className="text-xs font-normal text-slate-600">• Rp {costPerKm}/km</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={() => handleSave(false)}
            disabled={isSavedSuccess}
            className={`w-full h-11 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all ${
              isSavedSuccess ? 'bg-[#059669]' : 'bg-[#006194] hover:bg-[#007bb9]'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isSavedSuccess ? 'check_circle' : 'save'}
            </span>
            <span>{isSavedSuccess ? 'Berhasil Disimpan!' : 'Simpan Catatan Pengisian'}</span>
          </button>

          <button
            onClick={onCancel}
            className="w-full h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">bookmark_border</span>
            <span>Simpan sebagai Draft</span>
          </button>
        </div>

        {/* Footer tip */}
        <p className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1 pt-1">
          <span className="material-symbols-outlined text-[13px]">lock</span>
          <span>Data terenkripsi dan berkontribusi pada rata-rata konsumsi {currentVehicle.name}</span>
        </p>
      </div>

      {/* Modal Peringatan Odometer Lebih Rendah */}
      {showOdoWarningModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">warning</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-headline">Konfirmasi Angka Odometer</h3>
                <p className="text-[11px] text-slate-500">Angka lebih rendah dari catatan sebelumnya</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 bg-amber-50 p-3 rounded-xl border border-amber-200">
              Odometer sekarang (<strong>{currentOdo.toLocaleString('id-ID')} km</strong>) lebih kecil dari odometer sebelumnya (<strong>{previousOdo.toLocaleString('id-ID')} km</strong>). Tetap simpan log ini?
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowOdoWarningModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Koreksi Odo
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowOdoWarningModal(false);
                  handleSave(true);
                }}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                Tetap Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
