import React, { useState, useRef, useEffect } from 'react';
import { Vehicle, FuelLog, GasStation } from '../types';
import { VehicleIcon } from '../components/VehicleIcon';
import { BrandAvatar } from '../components/BrandAvatar';
import { Modal } from '../components/Modal';
import { DateTimePickerSheet } from '../components/DateTimePickerSheet';
import { StationPickerSheet } from '../components/StationPickerSheet';
import { CameraCaptureSheet } from '../components/CameraCaptureSheet';
import { formatKm, formatRupiah, toDatetimeLocalValue, parseDateTimeInput, formatDisplayDate, formatDisplayDateTime, formatRibuan, parseRupiahInput, parseLiterInput } from '../utils/format';
import { NON_TUNAI_OPTIONS, normalizePaymentMethod, PaymentCategory } from '../utils/payment';
import { getOfficialPrice, FUEL_PRICE_LIST, FUEL_PRICE_UPDATED_AT } from '../data/fuelPrices';
import {
  prepareReceiptImage,
  scanReceipt,
  isReceiptAiConfigured,
  ReceiptScanError,
} from '../services/receiptAi';

interface CatatBbmViewProps {
  activeVehicle: Vehicle;
  stations: GasStation[];
  /** Pembelian terakhir kendaraan ini — dipakai mengira-ngira jarak wajar. */
  lastLog?: FuelLog | null;
  initialMode?: 'scan' | 'manual';
  onSaveLog: (newLog: FuelLog) => void | Promise<void>;
  onCancel: () => void;
}

export const CatatBbmView: React.FC<CatatBbmViewProps> = ({
  activeVehicle,
  stations,
  lastLog = null,
  initialMode = 'scan',
  onSaveLog,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>(initialMode);
  const [isScanning, setIsScanning] = useState(false);
  const [scanConfidence, setScanConfidence] = useState<number | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // Form states
  // Kendaraan manut navbar atas — dropdown nang form dibuang ben ora dobel sumber.
  // Ganti kendaraan = lewat navbar atas / menu Akun.
  const [stationName, setStationName] = useState('');
  const [stationAddress, setStationAddress] = useState('');
  const [transactionNumber, setTransactionNumber] = useState('');
  const [stationBrand, setStationBrand] = useState<'Pertamina' | 'Shell' | 'Vivo' | 'BP' | 'Toko Madura' | 'Lainnya'>('Pertamina');
  const [isStationSheetOpen, setIsStationSheetOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [dateInput, setDateInput] = useState(() => toDatetimeLocalValue());
  const [isDateSheetOpen, setIsDateSheetOpen] = useState(false);
  const initialFuel = lastLog?.fuelType || 'Pertamax';
  const [fuelType, setFuelType] = useState(initialFuel);
  /** Cara isi: 'volume' -> ketik liter, total otomatis; 'total' -> ketik Rp bayar, liter otomatis. */
  const [previousOdo, setPreviousOdo] = useState(() => {
    // Default = odo saat isi terakhir (jarak tinggal selisih kecil perjalanan ini).
    // Tanpa riwayat → mundur sejauh jarak wajar antar-isi: motor dekat (±45 km),
    // mobil wajar lebih jauh (±200 km).
    const cur = activeVehicle.currentOdo || 0;
    if (lastLog && lastLog.odometer > 0 && lastLog.odometer <= cur) return lastLog.odometer;
    const fallbackGap = activeVehicle.type === 'motor' ? 45 : 200;
    return cur > fallbackGap ? cur - fallbackGap : 0;
  });
  const [currentOdo, setCurrentOdo] = useState(activeVehicle.currentOdo || 0);
  const [isFullTank, setIsFullTank] = useState(true);
  // Default volume = full tank kendaraan aktif (bukan hardcode 3.8 L).
  const [liters, setLiters] = useState(() => {
    const t = activeVehicle.tankCapacityL;
    return t && t > 0 ? Number(t.toFixed(3)) : activeVehicle.type === 'motor' ? 5 : 45;
  });
  const [pricePerLiter, setPricePerLiter] = useState(() => {
    if (lastLog && lastLog.pricePerLiter > 0) return lastLog.pricePerLiter;
    return getOfficialPrice(initialFuel) ?? 10000;
  });
  const [totalAmount, setTotalAmount] = useState(() => {
    const t = activeVehicle.tankCapacityL;
    const cap = t && t > 0 ? t : activeVehicle.type === 'motor' ? 5 : 45;
    const price =
      lastLog && lastLog.pricePerLiter > 0
        ? lastLog.pricePerLiter
        : (getOfficialPrice(initialFuel) ?? 10000);
    return Math.round(cap * price);
  });
  const officialPrice = getOfficialPrice(fuelType);
  const isPriceCustom = officialPrice != null && pricePerLiter !== officialPrice;
  const [payCategory, setPayCategory] = useState<PaymentCategory>('Non-Tunai');
  const [payDetail, setPayDetail] = useState<string>('QRIS');
  /** Nilai tersimpan ke log: 'Tunai' atau 'Non-Tunai • QRIS'. */
  const paymentMethod = payCategory === 'Tunai' ? 'Tunai' : `Non-Tunai • ${payDetail}`;
  const applyPayment = (raw: string) => {
    const n = normalizePaymentMethod(raw);
    setPayCategory(n.category);
    setPayDetail(n.detail);
  };
  const [notes, setNotes] = useState('');
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showOdoWarningModal, setShowOdoWarningModal] = useState(false);
  const [odoWarnKind, setOdoWarnKind] = useState<'lower' | 'jump'>('lower');
  /** Jalur scan: server (key rahasia) / direct (hosting statis + key VITE_) / off. */
  const [scanBackend, setScanBackend] = useState<'unknown' | 'server' | 'direct' | 'off'>('unknown');
  useEffect(() => {
    let alive = true;
    fetch('/api/health')
      .then((r) => {
        if (alive) setScanBackend(r.ok ? 'server' : isReceiptAiConfigured() ? 'direct' : 'off');
      })
      .catch(() => {
        if (alive) setScanBackend(isReceiptAiConfigured() ? 'direct' : 'off');
      });
    return () => {
      alive = false;
    };
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentVehicle = activeVehicle;
  const tankCapacityL =
    currentVehicle.tankCapacityL && currentVehicle.tankCapacityL > 0
      ? currentVehicle.tankCapacityL
      : currentVehicle.type === 'motor'
        ? 5
        : 45;
  const litersOverCapacity = liters > tankCapacityL;

  // Ganti kendaraan lewat navbar atas → form ngikut kendaraan aktif anyar.
  // Guard id: update odo kendaraan (bar simpan) ora nge-reset ketikan user.
  const prevActiveVehicleIdRef = useRef(activeVehicle.id);
  useEffect(() => {
    if (prevActiveVehicleIdRef.current === activeVehicle.id) return;
    prevActiveVehicleIdRef.current = activeVehicle.id;
    const next = activeVehicle;
    const fallbackGap = next.type === 'motor' ? 45 : 200;
    setPreviousOdo(
      lastLog && lastLog.odometer > 0 && lastLog.odometer <= next.currentOdo
        ? lastLog.odometer
        : next.currentOdo > fallbackGap
          ? next.currentOdo - fallbackGap
          : 0
    );
    setCurrentOdo(next.currentOdo || 0);
    const cap =
      next.tankCapacityL && next.tankCapacityL > 0
        ? next.tankCapacityL
        : next.type === 'motor'
          ? 5
          : 45;
    const fuel = lastLog?.fuelType || 'Pertamax';
    const price =
      lastLog && lastLog.pricePerLiter > 0
        ? lastLog.pricePerLiter
        : (getOfficialPrice(fuel) ?? 10000);
    setFuelType(fuel);
    setLiters(Number(cap.toFixed(3)));
    setPricePerLiter(price);
    setTotalAmount(Math.round(cap * price));
    setIsFullTank(true);
    setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVehicle.id, lastLog]);  const distanceKm = currentOdo > previousOdo ? currentOdo - previousOdo : 0;
  /**
   * Jarak wajar maks dihitung dari PEMBELIAN TERAKHIR, bukan kapasitas tangki:
   * bensin yang dipakai sejak isi sebelumnya ≈ sebanyak yang dibeli kemarin
   * (metode full-to-full). Tanpa riwayat → fallback kapasitas tangki.
   * Faktor super-irit: motor 50 km/L, mobil 20 km/L.
   * Contoh: motor terakhir beli 3.8 L → maks ±190 km; beli 2 L → ±100 km.
   */
  const maxRangeKm = Math.round(
    (lastLog && lastLog.liters > 0 ? lastLog.liters : tankCapacityL) *
      (currentVehicle.type === 'motor' ? 50 : 20)
  );
  const distanceTooFar = distanceKm > maxRangeKm;
  const calculatedKmL = isFullTank && distanceKm > 0 && liters > 0 ? Number((distanceKm / liters).toFixed(1)) : undefined;
  const costPerKm = distanceKm > 0 && totalAmount > 0 ? Math.round(totalAmount / distanceKm) : undefined;

  // Dua mode input saling mengisi — KEDUA kolom selalu bisa diketik.
  // Ketik liter → total otomatis; ketik total (mis. 37.000) → liter otomatis.
  // Tidak ada lagi kolom terkunci: dulu total readOnly di mode volume bikin
  // ketikan Rp37.000 diabaikan lalu total nyangkut di hitungan full-tank.
  const handleFuelTypeChange = (name: string) => {
    setFuelType(name);
    const off = getOfficialPrice(name);
    if (off != null) {
      setPricePerLiter(off);
      setTotalAmount(Math.round(liters * off));
    }
  };

  const handleLitersChange = (val: number) => {
    const clean = Number(Math.max(0, val).toFixed(3));
    setLiters(clean);
    setTotalAmount(Math.round(clean * pricePerLiter));
  };

  const handlePricePerLiterChange = (val: number) => {
    const price = Math.max(0, val);
    setPricePerLiter(price);
    setTotalAmount(Math.round(liters * price));
  };

  const handleTotalAmountChange = (val: number) => {
    const clean = Math.max(0, Math.round(val));
    setTotalAmount(clean);
    if (pricePerLiter > 0) {
      setLiters(Number((clean / pricePerLiter).toFixed(3)));
    }
  };

  // Preset receipt samples for quick demo
  const handleApplyPresetReceipt = (type: 'pertamina' | 'shell' | 'solar') => {
    setScanError(null);
    setIsScanning(true);
    setTimeout(() => {
      if (type === 'pertamina') {
        setStationName('SPBU 31.12802 MT Haryono');
        setStationAddress('Jl. MT Haryono Kav 18, Jakarta');
        setTransactionNumber('98402/20261017');
        setStationBrand('Pertamina');
        setFuelType('Pertamax');
        setLiters(2.733);
        setPricePerLiter(15950);
        setTotalAmount(43590);
        setPayCategory('Non-Tunai');
        setPayDetail('QRIS');
        setScanConfidence(98);
      } else if (type === 'shell') {
        setStationName('Shell MT Haryono');
        setStationAddress('Jl. MT Haryono Kav 18, Jakarta');
        setTransactionNumber('SHELL/884102');
        setStationBrand('Shell');
        setFuelType('Shell Super');
        setLiters(2.929);
        setPricePerLiter(16130);
        setTotalAmount(47250);
        setPayCategory('Non-Tunai');
        setPayDetail('E-Wallet');
        setScanConfidence(96);
      } else {
        setStationName('SPBU 34.12803 Pancoran');
        setStationAddress('Jl. Raya Pancoran, Jakarta Selatan');
        setTransactionNumber('SOLAR/552031');
        setStationBrand('Pertamina');
        setFuelType('Bio Solar');
        setLiters(15.0);
        setPricePerLiter(6800);
        setTotalAmount(102000);
        setPayCategory('Tunai');
        setPayDetail('Tunai');
        setScanConfidence(94);
      }
      setIsScanning(false);
    }, 600);
  };

  // Inti pipeline: File (dari galeri maupun kamera) → preview → scan AI → isi form.
  // Guard spam: tolak panggilan ganda + cooldown 10 detik antar scan.
  const lastScanAtRef = useRef(0);
  const processReceiptFile = async (file: File) => {
    if (isScanning) return;
    const nowMs = Date.now();
    if (nowMs - lastScanAtRef.current < 10_000) {
      setScanError('Tunggu sebentar sebelum scan lagi (±10 detik).');
      return;
    }
    lastScanAtRef.current = nowMs;
    setIsScanning(true);
    setScanError(null);
    try {
      const reader = new FileReader();
      const preview: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('read'));
        reader.readAsDataURL(file);
      });
      setReceiptPreview(preview);

      const img = await prepareReceiptImage(file);
      // Server dulu (key rahasia di BE), fallback direct hanya di hosting statis.
      const { result: d } = await scanReceipt(img.base64, img.mimeType);

      if (d.stationName) setStationName(d.stationName);
      if (d.address) setStationAddress(d.address);
      if (d.transactionNumber) setTransactionNumber(String(d.transactionNumber));
      // Server bisa jawab 'Other (Toko Madura)' — normalkan ke brand resmi.
      const rawBrand = (d.stationBrand ?? '').trim();
      const brand = /madura/i.test(rawBrand)
        ? 'Toko Madura'
        : /^other/i.test(rawBrand)
          ? 'Lainnya'
          : rawBrand;
      if (['Pertamina', 'Shell', 'Vivo', 'BP', 'Toko Madura', 'Lainnya'].includes(brand)) {
        setStationBrand(brand as typeof stationBrand);
      }
      if (d.fuelType) setFuelType(d.fuelType);
      // Angka AI JANGAN di-clamp ke tangki di sini: biarkan apa adanya agar
      // user lihat hasil asli. Validasi tangki terjadi saat Simpan
      // (formError jelas: "melebihi tangki ..."), bukan dipotong diam-diam.
      if (d.liters != null) {
        setLiters(Number((Math.max(0, Number(d.liters) || 0)).toFixed(3)));
      }
      if (d.pricePerLiter != null) setPricePerLiter(Math.max(0, Number(d.pricePerLiter) || 0));
      if (d.totalAmount != null) {
        setTotalAmount(Math.max(0, Math.round(Number(d.totalAmount) || 0)));
      }
      if (d.paymentMethod) applyPayment(d.paymentMethod);
      setScanConfidence(d.confidence != null ? Math.round(Number(d.confidence)) : null);
      if (d.dateTime) {
        const parsed = parseDateTimeInput(d.dateTime);
        if (parsed) setDateInput(toDatetimeLocalValue(parsed));
      }
      setScanError(null);
    } catch (err) {
      console.warn('Scan receipt error:', err);
      setScanConfidence(null);
      setScanError(
        err instanceof ReceiptScanError
          ? err.message
          : 'Scan AI gagal. Silakan isi manual atau pakai contoh struk.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  // Upload dari galeri → masuk pipeline yang sama dengan hasil jepretan kamera.
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    void processReceiptFile(file);
  };

  const handleSave = async (bypassOdoCheck = false) => {
    if (isSavedSuccess) return;
    if (!stationName.trim()) {
      setFormError('Pilih SPBU dulu — ketuk kolom Lokasi SPBU.');
      return;
    }
    if (!(pricePerLiter > 0)) {
      setFormError('Isi harga per liter dulu (ikut harga resmi).');
      return;
    }
    if (!(liters > 0)) {
      setFormError('Isi volume BBM dulu (liter) — atau ketik total bayar, liter ngikut otomatis.');
      return;
    }
    if (!(totalAmount > 0)) {
      setFormError('Isi total pembayaran dulu (Rp).');
      return;
    }
    if (liters > tankCapacityL + 1e-9) {
      setFormError(
        `Volume ${liters} L melebihi tangki ${currentVehicle.name} (${tankCapacityL} L). Cek liternya atau ubah kapasitas di menu Akun → Garasi.`
      );
      return;
    }
    setFormError(null);
    // Samakan angka biar konsisten: total dibulatkan, liter 3 desimal.
    // Contoh: Rp43.590 / Rp15.950 = 2,733 L tetap lolos walau bukan full tank.
    const finalLiters = Number(liters);
    const finalTotal = Math.round(Number(totalAmount));
    if (!bypassOdoCheck && currentOdo < previousOdo) {
      setOdoWarnKind('lower');
      setShowOdoWarningModal(true);
      return;
    }
    if (!bypassOdoCheck && distanceKm > maxRangeKm) {
      setOdoWarnKind('jump');
      setShowOdoWarningModal(true);
      return;
    }

    const logDate = parseDateTimeInput(dateInput) ?? new Date();

    const newLog: FuelLog = {
      id: `log-${Date.now()}`,
      vehicleId: activeVehicle.id,
      dateTime: logDate.toISOString(),
      displayDate: formatDisplayDate(logDate),
      stationName,
      stationBrand,
      fuelType,
      odometer: Number(currentOdo),
      previousOdo: Number(previousOdo),
      distanceKm,
      isFullTank,
      liters: finalLiters,
      pricePerLiter: Number(pricePerLiter),
      totalAmount: finalTotal,
      paymentMethod,
      calculatedKmL,
      costPerKm,
      efficiencyBadge: calculatedKmL && calculatedKmL > 45 ? 'Sangat Irit' : 'Irit',
      notes,
    };

    // Langsung simpan + pindah ke detail riwayat — tanpa jeda timer.
    // (Dulu ada setTimeout 600ms yang bikin tombol nyangkut di "Berhasil"
    // tanpa pindah halaman.)
    setIsSavedSuccess(true);
    try {
      await onSaveLog(newLog);
    } catch {
      // Tulis DB gagal (mis. aturan Firestore / offline) — jangan meneng wae,
      // balekke tombol + tampilkan sebab biar user ngerti datane durung kesimpen.
      setIsSavedSuccess(false);
      setFormError('Gagal menyimpan ke database. Cek koneksi internet / login, lalu coba lagi.');
    }
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
                <p className="font-extrabold text-[#ee2737] tracking-wider truncate">{stationName || 'NAMA SPBU'}</p>
                <p className="text-[8px] text-slate-400 truncate px-1">{stationAddress || 'ALAMAT TERBACA DARI STRUK'}</p>
              </div>

              {/* OCR Extracted Lines with Bounding highlights */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center relative p-1 rounded bg-teal-50 border border-teal-200">
                  <span className="font-bold text-slate-600">PRODUK :</span>
                  <span className="font-extrabold text-[#006194]">{fuelType.toUpperCase()}</span>
                  <span className="absolute -top-1.5 -right-1 bg-[#006a63] text-white px-1 rounded-full text-[7px] font-bold">
                    {(FUEL_PRICE_LIST.find((f) => f.name.toLowerCase() === fuelType.toLowerCase())?.ron ?? '').toUpperCase() || 'BBM'}
                  </span>
                </div>

                <div className="flex justify-between items-center relative p-1 rounded bg-teal-50/70 border border-teal-100">
                  <span className="text-slate-500">VOLUME (L) :</span>
                  <span className="font-extrabold tabular-nums">{liters.toFixed(3)} L</span>
                  {scanConfidence != null && (
                    <span className="absolute -bottom-1 -left-1 bg-[#006a63] text-white px-1 rounded text-[7px]">
                      OCR {scanConfidence}%
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center p-1 rounded bg-teal-50/70 border border-teal-100">
                  <span className="text-slate-500">HARGA/L :</span>
                  <span className="font-bold tabular-nums">{formatRupiah(pricePerLiter)}</span>
                </div>

                <div className="flex justify-between items-center p-1.5 rounded bg-sky-100 text-[#001d31] font-bold text-[11px] border border-sky-300">
                  <span>TOTAL :</span>
                  <span className="text-[#006194] font-extrabold tabular-nums">
                    {formatRupiah(totalAmount)}
                  </span>
                </div>
              </div>

              <div className="mt-1.5 text-center text-[8px] text-slate-400 truncate px-2">
                TRX: {transactionNumber || '-'} • {paymentMethod}
              </div>

              {/* Scanner Sweep Line Animation */}
              {isScanning && (
                <div className="absolute inset-x-0 top-0 h-1 bg-sky-400 shadow-[0_0_12px_#38bdf8] animate-pulse transition-all" />
              )}
            </div>

            {/* Camera / Scan Controls */}
            <div className="absolute top-2.5 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/80 text-white backdrop-blur-md text-[10px] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#059669] animate-ping" />
              <span>{isScanning ? 'GEMINI MEMBACA STRUK…' : 'SCAN AI • GEMINI'}</span>
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
                onClick={() => setIsCameraOpen(true)}
                title="Foto Struk dengan Kamera"
                aria-label="Foto Struk"
                type="button"
                disabled={isScanning}
                className="w-8 h-8 rounded-full bg-[#006194] text-white flex items-center justify-center hover:bg-[#007bb9] shadow disabled:opacity-50 disabled:pointer-events-none"
              >
                <span className="material-symbols-outlined text-[17px]">photo_camera</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Unggah dari Galeri"
                aria-label="Unggah Struk"
                type="button"
                disabled={isScanning}
                className="w-8 h-8 rounded-full bg-slate-800/90 text-white flex items-center justify-center hover:bg-slate-700 shadow disabled:opacity-50 disabled:pointer-events-none"
              >
                <span className="material-symbols-outlined text-[17px]">upload</span>
              </button>
            </div>
          </div>

          {/* Sheet kamera in-app */}
          {isCameraOpen && (
            <CameraCaptureSheet
              onCapture={(f) => {
                setIsCameraOpen(false);
                void processReceiptFile(f);
              }}
              onClose={() => setIsCameraOpen(false)}
            />
          )}

          {/* Quick presets for testing */}
          <div className="bg-slate-900 px-3 py-2 border-t border-slate-800 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
            <span className="text-[10px] text-slate-400 font-semibold shrink-0">Contoh Struk:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleApplyPresetReceipt('pertamina')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10px] font-semibold shrink-0"
              >
                Pertamax Rp43,6k
              </button>
              <button
                type="button"
                onClick={() => handleApplyPresetReceipt('shell')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-semibold shrink-0"
              >
                Shell Rp47,2k
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

          {/* Scan Status Ribbon — jujur: sukses vs gagal */}
          {scanError ? (
            <div className="bg-amber-900/40 border-t border-amber-800/60 px-3 py-2 flex items-center gap-1.5 text-amber-100">
              <span className="material-symbols-outlined text-amber-400 text-[18px]">warning</span>
              <p className="text-xs font-semibold">{scanError}</p>
            </div>
          ) : (
            <div className="bg-teal-900/40 border-t border-teal-800/60 px-3 py-2 flex items-center justify-between text-teal-100">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-teal-400 text-[18px]">auto_awesome</span>
                <p className="text-xs font-semibold">
                  {scanConfidence != null ? (
                    <>
                      Struk terbaca akurat{' '}
                      <span className="text-teal-300 font-bold">({scanConfidence}%)</span>
                    </>
                  ) : scanBackend === 'off' ? (
                    'Scan AI belum aktif — pakai contoh struk atau isi manual'
                  ) : (
                    'Foto atau upload struk untuk scan AI, atau pakai contoh / isi manual'
                  )}
                </p>
              </div>
              {scanConfidence != null && (
                <span className="bg-[#006a63] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">check</span> AI Extracted
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Extracted Form Data */}
      <div className="space-y-3.5">
        {/* Vehicle Info — manut navbar atas, ora iso diganti nang kene */}
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
                <VehicleIcon type={currentVehicle.type} className="text-[18px]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{currentVehicle.name}</p>
                <p className="text-[10px] text-slate-500">
                  {currentVehicle.plateNumber} • {currentVehicle.engineSpec || 'Bensin'}
                </p>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold shrink-0 ml-2">
              Ganti lewat navbar atas
            </span>
          </div>
        </div>

        {/* Date & Station Card */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
          {/* Timestamp */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Tanggal & Waktu Pengisian
            </label>
            <button
              type="button"
              onClick={() => setIsDateSheetOpen(true)}
              className="w-full flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-slate-800 text-left active:scale-[0.99] transition-transform"
            >
              <span className="material-symbols-outlined text-[18px] text-[#006194]">calendar_today</span>
              <span className="flex-1 text-xs font-semibold">
                {(() => {
                  const d = parseDateTimeInput(dateInput);
                  return d ? formatDisplayDateTime(d) : 'Pilih tanggal & jam';
                })()}
              </span>
              <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
            </button>
          </div>

          {/* SPBU Location */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Lokasi SPBU</label>
              <span className="text-[10px] font-bold text-[#006194] flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">near_me</span> GPS Cocok
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsStationSheetOpen(true)}
              className="w-full flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-left active:scale-[0.99] transition-transform"
            >
              <BrandAvatar brand={stationBrand} size="sm" />
              <span className={`flex-1 min-w-0 truncate text-xs ${stationName ? 'font-bold text-slate-900' : 'text-slate-400'}`}>
                {stationName || 'Pilih SPBU terdekat…'}
              </span>
              <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
            </button>
          </div>
        </div>

        {/* Sheet pilih SPBU */}
        {isStationSheetOpen && (
          <StationPickerSheet
            stations={stations}
            onPick={(st) => {
              setStationName(st.name);
              setStationBrand(st.brand);
              setFormError(null);
              setIsStationSheetOpen(false);
            }}
            onClose={() => setIsStationSheetOpen(false)}
          />
        )}

        {/* Sheet pilih tanggal & jam */}
        {isDateSheetOpen && (
          <DateTimePickerSheet
            initial={parseDateTimeInput(dateInput) ?? new Date()}
            max={new Date()}
            onPick={(d) => {
              setDateInput(toDatetimeLocalValue(d));
              setIsDateSheetOpen(false);
            }}
            onClose={() => setIsDateSheetOpen(false)}
          />
        )}

        {/* Jenis Bahan Bakar Selector - harga resmi Okt 2026 */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Jenis Bahan Bakar</label>
            <span className="text-[10px] text-slate-400 font-semibold">Resmi {FUEL_PRICE_UPDATED_AT}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {FUEL_PRICE_LIST.filter((f) => !f.brand).map((f) => {
              const isSelected = fuelType.toLowerCase() === f.name.toLowerCase();
              return (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => handleFuelTypeChange(f.name)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg transition-transform active:scale-95 border ${
                    isSelected
                      ? 'bg-[#006194] text-white border-[#006194] shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[11px] font-bold leading-tight text-center">{f.name}</span>
                  <span className={`text-[9px] ${isSelected ? 'text-sky-200' : 'text-slate-400'}`}>
                    {f.ron}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold tabular-nums ${isSelected ? 'text-white' : 'text-[#006194]'}`}
                  >
                    {formatRibuan(f.price)}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400">
            Pilih BBM — harga/L otomatis ikut harga resmi. Masih bisa diubah manual bila SPBU beda.
          </p>
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
                  type="text"
                  inputMode="numeric"
                  value={formatRibuan(previousOdo)}
                  placeholder="0"
                  onChange={(e) => setPreviousOdo(parseRupiahInput(e.target.value))}
                  className="w-full bg-transparent text-sm font-extrabold text-slate-700 tabular-nums focus:outline-none"
                />
                <span className="text-xs text-slate-400">km</span>
              </div>
            </div>

            <div className="bg-sky-50 border border-sky-200 p-2.5 rounded-lg">
              <span className="text-[10px] text-[#006194] font-bold block mb-0.5">Odo Sekarang</span>
              <div className="flex items-baseline gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatRibuan(currentOdo)}
                  placeholder="0"
                  onChange={(e) => setCurrentOdo(parseRupiahInput(e.target.value))}
                  className="w-full bg-transparent text-sm font-extrabold text-[#006194] tabular-nums focus:outline-none"
                />
                <span className="text-xs text-[#006194] font-medium">km</span>
              </div>
            </div>
          </div>

          {distanceTooFar && (
            <p className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 tabular-nums">
              Jarak {formatKm(distanceKm)} melebihi jangkauan wajar {currentVehicle.name} (±{formatKm(maxRangeKm)}) — cek lagi angka odonya.
            </p>
          )}

          {/* Full Tank Toggle */}          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex items-center justify-between">
            <div className="flex items-start gap-2 max-w-[78%]">
              <span className="material-symbols-outlined text-[18px] text-[#006194] shrink-0 mt-0.5">
                local_gas_station
              </span>
              <div>
                <p className="text-xs font-bold text-slate-800">Isi Penuh (Full Tank)</p>
                <p className="text-[10px] text-slate-500">
                  Default ON tiap buka form agar km/L valid (full-to-full). Matikan bila isi
                  parsial / nominal bebas seperti 3.9 L.
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

        {/* Volume, Harga & Total Pembayaran — kedua kolom ketik, saling mengisi */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
          <p className="text-[10px] text-slate-500 bg-sky-50 border border-sky-100 rounded-lg px-2.5 py-1.5">
            Kedua kolom bisa diketik langsung: ketik liter → total otomatis ({formatRupiah(pricePerLiter)}/L).
            Ketik total mis. 43.590 → liter otomatis. Cocok untuk bayar QRIS nominal bebas.
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            <div
              className={`border p-2.5 rounded-lg ${
                litersOverCapacity
                  ? 'bg-red-50 border-red-300'
                  : 'bg-sky-50 border-sky-300'
              }`}
            >
              <span className="text-[10px] font-bold text-slate-500 flex items-center justify-between mb-1">
                <span>Volume BBM • ketik</span>
                <span className="text-[#006194]">⛽ {tankCapacityL} L</span>
              </span>
              <div className="flex items-baseline justify-between">
                <input
                  type="text"
                  inputMode="decimal"
                  value={liters === 0 ? '' : String(liters)}
                  placeholder="0"
                  onChange={(e) => handleLitersChange(parseLiterInput(e.target.value))}
                  className="w-full bg-transparent text-base font-extrabold tabular-nums focus:outline-none text-slate-900"
                />
                <span className="text-xs font-bold text-slate-400">Liter</span>
              </div>
              {isFullTank ? (
                <button
                  type="button"
                  onClick={() => handleLitersChange(tankCapacityL)}
                  className="mt-1 text-[10px] font-bold text-[#006a63] underline"
                >
                  Samakan full tank ({tankCapacityL} L)
                </button>
              ) : litersOverCapacity ? (
                <p className="mt-1 text-[10px] font-bold text-red-600">
                  Melebihi tangki {currentVehicle.name} ({tankCapacityL} L)
                </p>
              ) : (
                <p className="mt-1 text-[10px] text-slate-400 tabular-nums">
                  = {formatRupiah(totalAmount)} ÷ {formatRupiah(pricePerLiter)}
                </p>
              )}
            </div>

            <div className="border p-2.5 rounded-lg bg-slate-50 border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 block mb-1">
                Harga per Liter {officialPrice != null ? `• resmi ${formatRupiah(officialPrice)}` : ''}
              </span>
              <div className="flex items-baseline justify-between">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatRibuan(pricePerLiter)}
                  placeholder="0"
                  onChange={(e) => handlePricePerLiterChange(parseRupiahInput(e.target.value))}
                  className="w-full bg-transparent text-base font-extrabold text-slate-900 tabular-nums focus:outline-none"
                />
                <span className="text-[10px] font-bold text-slate-400">Rp/L</span>
              </div>
              {isPriceCustom && officialPrice != null ? (
                <button
                  type="button"
                  onClick={() => handlePricePerLiterChange(officialPrice)}
                  className="mt-1 text-[10px] font-bold text-[#006194] underline"
                >
                  Pakai harga resmi {formatRupiah(officialPrice)}
                </button>
              ) : (
                <p className="mt-1 text-[10px] text-slate-400">Harga resmi {FUEL_PRICE_UPDATED_AT}</p>
              )}
            </div>
          </div>

          {/* Total Bayar Box */}
          <div className="border p-3 rounded-lg bg-sky-50 border-sky-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Total Pembayaran • ketik bebas
              </span>
              <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                {liters} L × {formatRupiah(pricePerLiter)}/L
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm font-bold text-[#006194]">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={formatRibuan(totalAmount)}
                placeholder="cth 43.590"
                onChange={(e) => handleTotalAmountChange(parseRupiahInput(e.target.value))}
                className="w-full bg-transparent text-lg font-extrabold text-[#006194] tabular-nums focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
              {formatRupiah(totalAmount)} ÷ {formatRupiah(pricePerLiter)}/L = {liters} L — bebas nominal QRIS, validasi tangki saat Simpan.
            </p>
          </div>

          {/* Metode Pembayaran: Tunai vs Non-Tunai */}
          <div className="bg-white border border-slate-200/90 p-3 rounded-lg">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Metode Pembayaran
            </span>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => setPayCategory('Tunai')}
                className={`h-10 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all active:scale-[0.98] ${
                  payCategory === 'Tunai'
                    ? 'bg-[#006a63] text-white border-[#006a63] shadow'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">payments</span>
                <span>Tunai</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPayCategory('Non-Tunai');
                  if (payDetail === 'Tunai') setPayDetail('QRIS');
                }}
                className={`h-10 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all active:scale-[0.98] ${
                  payCategory === 'Non-Tunai'
                    ? 'bg-[#006194] text-white border-[#006194] shadow'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">qr_code_2</span>
                <span>Non-Tunai</span>
              </button>
            </div>
            {payCategory === 'Non-Tunai' && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {NON_TUNAI_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPayDetail(opt)}
                    className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-95 ${
                      payDetail === opt
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
          {formError && (
            <p className="text-[11px] text-red-600 font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}
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

      {/* Modal Peringatan Odometer (lebih rendah / lompatan tak wajar) */}
      {showOdoWarningModal && (
        <Modal
          icon="warning"
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          title="Konfirmasi Angka Odometer"
          subtitle={
            odoWarnKind === 'lower'
              ? 'Angka lebih rendah dari catatan sebelumnya'
              : 'Jarak tempuh tak wajar untuk sekali pengisian'
          }
          onClose={() => setShowOdoWarningModal(false)}
        >
            <p className="text-xs text-slate-600 mb-4 bg-amber-50 p-3 rounded-xl border border-amber-200">
              {odoWarnKind === 'lower' ? (
                <>
                  Odometer sekarang (<strong>{formatKm(currentOdo)}</strong>) lebih kecil dari odometer
                  sebelumnya (<strong>{formatKm(previousOdo)}</strong>). Tetap simpan log ini?
                </>
              ) : (
                <>
                  Jarak tempuh <strong>{formatKm(distanceKm)}</strong> melebihi jangkauan wajar{' '}
                  {currentVehicle.name} (±<strong>{formatKm(maxRangeKm)}</strong>). Kemungkinan salah
                  ketik (kelebihan digit). Tetap simpan log ini?
                </>
              )}
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
        </Modal>
      )}
    </div>
  );
};
