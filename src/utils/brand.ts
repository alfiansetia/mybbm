import { BrandType } from '../types';

/**
 * Tebak brand SPBU dari teks bebas (nama + tag OSM + nama Google Places).
 * Dipakai bareng mapper OSM & Google Places ben konsisten.
 *
 * Urutan: Pertamina dulu (nama "SPBU 34.xxxxx" sering tanpa kata Pertamina —
 * itu ditangani pola `ref` nang mapper OSM), lalu Shell, Vivo, BP, Madura.
 */
export function detectBrandFromText(hayRaw: string): BrandType {
  const hay = (hayRaw ?? '').toLowerCase();
  if (!hay.trim()) return 'Lainnya';

  // Pertamina — termasuk Pertashop (outlet resmi kecil Pertamina)
  // dan pola "SPBU 34.xxxxx" (skema nomer resmi SPBU Pertamina).
  if (
    hay.includes('pertamina') ||
    hay.includes('pertashop') ||
    /spbu\s+\d{2}\.\d{3,}/.test(hay)
  ) {
    return 'Pertamina';
  }

  if (hay.includes('shell')) return 'Shell';

  if (hay.includes('vivo')) return 'Vivo';

  // BP-AKR: "BP", "BP AKR", "SPBU BP ...", operator "PT Aneka Petroindo Raya".
  if (
    /\bbp\b/.test(hay) ||
    hay.includes('bp-akr') ||
    hay.includes('bp akr') ||
    hay.includes('petroindo') ||
    /\bakr\b/.test(hay)
  ) {
    return 'BP';
  }

  // Pom mini / eceran.
  if (hay.includes('madura') || hay.includes('pertamini')) return 'Toko Madura';

  return 'Lainnya';
}

/**
 * Nomer SPBU Pertamina khas Indonesia: "34.12802", "31.88601", dsb.
 * (2 digit region + titik + digit). Cocok kanggo tag `ref` OSM.
 */
export function isPertaminaRef(refRaw: string | undefined): boolean {
  if (!refRaw) return false;
  return /^\d{2}\.\d{3,}/.test(refRaw.trim());
}
