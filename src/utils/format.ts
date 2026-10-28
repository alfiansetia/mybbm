/** Format & kalender terpusat (id-ID). Jangan format manual di view. */

export function formatRupiah(value: number): string {
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
}

export function formatKm(value: number): string {
  return `${Math.round(value).toLocaleString('id-ID')} km`;
}

export function formatLiters(value: number, digits = 1): string {
  return `${Number(value).toFixed(digits)} L`;
}

export function formatCount(value: number): string {
  return value.toLocaleString('id-ID');
}

/** "10000" → "10.000" untuk tampilan input rupiah (tanpa prefix Rp). Nol = string kosong. */
export function formatRibuan(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '';
  return Math.round(value).toLocaleString('id-ID');
}

/** Parse ketikan rupiah: buang non-digit + nol di depan ("010000" → 10000). Kosong → 0. */
export function parseRupiahInput(raw: string): number {
  const digits = raw.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
  return digits ? Number(digits) : 0;
}

/** Parse ketikan liter desimal: koma→titik, buang nol di depan. Kosong → 0. */
export function parseLiterInput(raw: string): number {
  const clean = raw.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const [head, ...rest] = clean.split('.');
  const normalized =
    rest.length > 0
      ? `${head.replace(/^0+(?=\d)/, '') || '0'}.${rest.join('')}`
      : clean.replace(/^0+(?=\d)/, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export const SHORT_MONTHS_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des',
] as const;

export const FULL_MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const;

export function formatBulanTahun(date: Date = new Date()): string {
  return `${FULL_MONTHS_ID[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatBulanSingkatTahun(date: Date = new Date()): string {
  return `${SHORT_MONTHS_ID[date.getMonth()]} ${date.getFullYear()}`;
}

/** "15 Okt 2026" untuk label log. */
export function formatDisplayDate(date: Date): string {
  return `${date.getDate()} ${SHORT_MONTHS_ID[date.getMonth()]} ${date.getFullYear()}`;
}

/** "15 Okt 2026, 08:45 WIB" untuk pratinjau input. */
export function formatDisplayDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${formatDisplayDate(date)}, ${pad(date.getHours())}:${pad(date.getMinutes())} WIB`;
}

/** Nilai untuk <input type="datetime-local"> ("2026-10-28T14:30"). */
export function toDatetimeLocalValue(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

/** Parse longgar (ISO maupun teks OCR). Gagal = null agar pemanggil pakai fallback. */
export function parseDateTimeInput(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Rentang "1–{tgl} {Bln} {thn}" untuk label bulan berjalan. */
export function formatRentangBulanBerjalan(date: Date = new Date()): string {
  return `1–${date.getDate()} ${SHORT_MONTHS_ID[date.getMonth()]} ${date.getFullYear()}`;
}

export interface MonthSlot {
  date: Date;
  short: string;
  full: string;
}

/** N bulan terakhir termasuk bulan berjalan (untuk tren). */
export function lastNMonths(n: number, from: Date = new Date()): MonthSlot[] {
  const out: MonthSlot[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(from.getFullYear(), from.getMonth() - i, 1);
    out.push({
      date: d,
      short: SHORT_MONTHS_ID[d.getMonth()],
      full: `${FULL_MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`,
    });
  }
  return out;
}
