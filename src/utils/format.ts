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
