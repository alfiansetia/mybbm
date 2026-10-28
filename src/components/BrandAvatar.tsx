import React from 'react';

/** Warna avatar huruf per brand (satu-satunya mapping). */
const BRAND_STYLES: Record<string, string> = {
  Pertamina: 'bg-red-50 text-[#ee2737]',
  Shell: 'bg-amber-100 text-[#894d00]',
  BP: 'bg-emerald-50 text-[#009900]',
  Vivo: 'bg-blue-50 text-[#005baa]',
  'Toko Madura': 'bg-amber-100 text-[#894d00]',
};

const BRAND_LETTER: Record<string, string> = {
  Pertamina: 'P',
  Shell: 'S',
  BP: 'B',
  Vivo: 'V',
  'Toko Madura': 'M',
};

/** Warna dot brand untuk riwayat/legenda. */
export function brandDotClass(brand: string): string {
  if (brand === 'Pertamina') return 'bg-[#ee2737]';
  if (brand === 'Shell') return 'bg-[#ffd200]';
  return 'bg-[#005baa]';
}

interface BrandAvatarProps {
  brand: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Avatar huruf brand SPBU terpusat. */
export const BrandAvatar: React.FC<BrandAvatarProps> = ({
  brand,
  size = 'md',
  className = '',
}) => {
  const sizeClass =
    size === 'sm'
      ? 'w-7 h-7 text-xs rounded-md'
      : size === 'lg'
      ? 'w-10 h-10 text-[15px] rounded-lg'
      : 'w-9 h-9 text-[14px] rounded-lg';
  return (
    <div
      className={`${sizeClass} flex items-center justify-center shrink-0 font-bold ${
        BRAND_STYLES[brand] ?? 'bg-teal-50 text-[#006a63]'
      } ${className}`}
    >
      {BRAND_LETTER[brand] ?? 'B'}
    </div>
  );
};
