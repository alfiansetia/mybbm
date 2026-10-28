import React from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/** Keadaan kosong terpusat (ikon + judul + hint + CTA opsional). */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  hint,
  actionLabel,
  onAction,
  className = 'py-16',
}) => (
  <div
    className={`flex flex-col items-center justify-center text-center gap-3 animate-in fade-in duration-150 ${className}`}
  >
    <div className="w-14 h-14 rounded-full bg-sky-100 flex items-center justify-center text-[#006194]">
      <span className="material-symbols-outlined text-[28px]">{icon}</span>
    </div>
    <div>
      <h2 className="text-base font-extrabold text-slate-900 font-headline">{title}</h2>
      {hint && <p className="text-xs text-slate-500 mt-1 max-w-[260px]">{hint}</p>}
    </div>
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        type="button"
        className="h-10 px-5 rounded-xl bg-[#006194] hover:bg-[#007bb9] text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-[0.99] transition-all"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        <span>{actionLabel}</span>
      </button>
    )}
  </div>
);
