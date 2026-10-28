import React from 'react';
import { AvailabilityStatus, QueueStatus } from '../types';

const STATUS_STYLE: Record<AvailabilityStatus, { text: string; dot: string; pill: string }> = {
  Tersedia: {
    text: 'text-[#059669]',
    dot: 'bg-[#059669]',
    pill: 'bg-emerald-50 text-[#059669] border-emerald-200',
  },
  Terbatas: {
    text: 'text-[#d97706]',
    dot: 'bg-[#d97706]',
    pill: 'bg-amber-50 text-[#d97706] border-amber-200',
  },
  Kosong: {
    text: 'text-[#dc2626]',
    dot: 'bg-[#dc2626]',
    pill: 'bg-red-50 text-[#dc2626] border-red-200',
  },
};

const QUEUE_STYLE: Record<QueueStatus, string> = {
  Sepi: 'bg-emerald-50 text-[#059669]',
  Sedang: 'bg-amber-50 text-[#d97706]',
  Panjang: 'bg-red-50 text-[#dc2626]',
};

interface StatusPillProps {
  status: AvailabilityStatus;
  uppercase?: boolean;
  className?: string;
}

/** Pil status stok BBM (Tersedia/Terbatas/Kosong) — satu-satunya varian. */
export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  uppercase = false,
  className = 'px-2 py-0.5 rounded-full text-[10px] font-extrabold border',
}) => (
  <span className={`inline-block ${STATUS_STYLE[status].pill} ${className}`}>
    {uppercase ? status.toUpperCase() : status}
  </span>
);

interface StatusDotProps {
  status: AvailabilityStatus;
  label?: string;
  className?: string;
}

/** Label status + dot (untuk grid stok). */
export const StatusDot: React.FC<StatusDotProps> = ({
  status,
  label,
  className = 'text-[11px] font-bold flex items-center gap-1 mt-0.5',
}) => (
  <span className={`${STATUS_STYLE[status].text} ${className}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLE[status].dot}`} />
    {label ?? (status === 'Tersedia' ? 'Ready' : status)}
  </span>
);

interface QueuePillProps {
  status: QueueStatus;
  label: string;
  className?: string;
}

/** Pil status antrean SPBU. */
export const QueuePill: React.FC<QueuePillProps> = ({
  status,
  label,
  className = 'px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0',
}) => <span className={`${QUEUE_STYLE[status]} ${className}`}>{label}</span>;
