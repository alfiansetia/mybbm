export type PaymentCategory = 'Tunai' | 'Non-Tunai';

export const NON_TUNAI_OPTIONS = [
  'QRIS',
  'E-Wallet',
  'Kartu Debit',
  'Kartu Kredit',
  'MyPertamina',
] as const;

/** Kategori dari string metode tersimpan. 'Tunai' = tunai, sisanya non-tunai. */
export function paymentCategoryOf(method: string | undefined | null): PaymentCategory {
  return (method ?? '').trim().toLowerCase() === 'tunai' ? 'Tunai' : 'Non-Tunai';
}

/**
 * Normalisasi teks metode bebas (hasil OCR/struk lama) ke pasangan kategori + rincian.
 * Cth: 'QRIS / GoPay' → Non-Tunai/QRIS, 'cash' → Tunai, 'debit bca' → Non-Tunai/Kartu Debit.
 */
export function normalizePaymentMethod(raw: string): {
  category: PaymentCategory;
  detail: string;
} {
  const m = (raw ?? '').toLowerCase();
  if (/\btunai\b|\bcash\b/.test(m) && !/non.tunai|nontunai/.test(m)) {
    return { category: 'Tunai', detail: 'Tunai' };
  }
  let detail = 'QRIS';
  if (/mypertamina|my pertamina/.test(m)) detail = 'MyPertamina';
  else if (/e.wallet|ewallet|gopay|ovo|dana|shopeepay|linkaja/.test(m)) detail = 'E-Wallet';
  else if (/kredit|credit|visa|mastercard/.test(m)) detail = 'Kartu Kredit';
  else if (/debit|kartu|card|edc/.test(m)) detail = 'Kartu Debit';
  else if (/qris|qr\b|qr[^a-z]/.test(m)) detail = 'QRIS';
  return { category: 'Non-Tunai', detail };
}
