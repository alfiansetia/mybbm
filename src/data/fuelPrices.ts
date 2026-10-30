/**
 * Harga resmi BBM per Oktober 2026 (Jawa/Jabodetabek, per liter).
 * Sumber: pengumuman Pertamina Patra Niaga, BP-AKR, Vivo, Shell periode Sep–Okt 2026.
 * Dipakai sebagai harga acuan otomatis di form Catat BBM.
 * Kalau harga berubah, cukup update file ini + seedData.
 */

export const FUEL_PRICE_UPDATED_AT = '19 Okt 2026';

export interface FuelPriceEntry {
  name: string;
  ron: string;
  price: number;
  brand?: string;
}

/** Urutan tampil di pemilih jenis BBM (Pertamina dulu). */
export const FUEL_PRICE_LIST: FuelPriceEntry[] = [
  { name: 'Pertalite', ron: 'RON 90', price: 10000 },
  { name: 'Bio Solar', ron: 'CN 48', price: 6800 },
  { name: 'Pertamax', ron: 'RON 92', price: 15950 },
  { name: 'Pertamax Green 95', ron: 'RON 95', price: 19150 },
  { name: 'Pertamax Turbo', ron: 'RON 98', price: 19600 },
  { name: 'Dexlite', ron: 'CN 51', price: 23700 },
  { name: 'Pertamina Dex', ron: 'CN 53', price: 25200 },
  // SPBU swasta (setara RON 92/95 + diesel)
  { name: 'BP 92', ron: 'RON 92', price: 16130, brand: 'BP' },
  { name: 'BP Ultimate', ron: 'RON 95', price: 19330, brand: 'BP' },
  { name: 'Revvo 92', ron: 'RON 92', price: 16130, brand: 'Vivo' },
  { name: 'Revvo 95', ron: 'RON 95', price: 19330, brand: 'Vivo' },
];

/** Normalisasi nama BBM dari struk/OCR ke kunci resmi. */
function normalizeFuelKey(raw: string): string {
  const m = raw.toLowerCase();
  if (/green/.test(m)) return 'pertamax green 95';
  if (/turbo/.test(m)) return 'pertamax turbo';
  if (/pertamina dex|pdex|dex\b/.test(m) && !/dexlite/.test(m)) return 'pertamina dex';
  if (/dexlite/.test(m)) return 'dexlite';
  if (/revvo\s*95|vivo.*95/.test(m)) return 'revvo 95';
  if (/revvo\s*92|vivo.*92/.test(m)) return 'revvo 92';
  if (/ultimate/.test(m)) return 'bp ultimate';
  if (/\bbp\s*92\b/.test(m)) return 'bp 92';
  if (/shell super/.test(m)) return 'pertamax'; // Super ≈ RON 92, tak tersedia Okt 2026 → fallback Pertamax
  if (/v-power diesel|v diesel|shell.*diesel/.test(m)) return 'pertamina dex';
  if (/solar|bio/.test(m)) return 'bio solar';
  if (/pertalite/.test(m)) return 'pertalite';
  if (/pertamax/.test(m)) return 'pertamax';
  return raw.trim().toLowerCase();
}

/** Harga resmi per liter untuk nama BBM bebas, atau null kalau tak dikenal. */
export function getOfficialPrice(fuelType: string): number | null {
  const key = normalizeFuelKey(fuelType);
  const found = FUEL_PRICE_LIST.find((f) => f.name.toLowerCase() === key);
  return found ? found.price : null;
}

/** Entri resmi untuk nama BBM bebas (untuk label RON). */
export function getOfficialFuel(fuelType: string): FuelPriceEntry | null {
  const key = normalizeFuelKey(fuelType);
  return FUEL_PRICE_LIST.find((f) => f.name.toLowerCase() === key) ?? null;
}
