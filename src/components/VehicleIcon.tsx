import React from 'react';

interface VehicleIconProps {
  type: 'motor' | 'mobil';
  className?: string;
  filled?: boolean;
}

/** Ikon tipe kendaraan terpusat (satu-satunya mapping motor/mobil → ikon). */
export const VehicleIcon: React.FC<VehicleIconProps> = ({
  type,
  className = 'text-[18px]',
  filled = false,
}) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
  >
    {type === 'motor' ? 'two_wheeler' : 'directions_car'}
  </span>
);
