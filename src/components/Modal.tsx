import React from 'react';

interface ModalProps {
  icon: string;
  iconBg?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** 'center' = dialog tengah, 'sheet' = bottom-sheet di mobile */
  position?: 'center' | 'sheet';
}

/** Kerangka modal terpusat: overlay + kartu + header + konten. */
export const Modal: React.FC<ModalProps> = ({
  icon,
  iconBg = 'bg-sky-100',
  iconColor = 'text-[#006194]',
  title,
  subtitle,
  onClose,
  children,
  position = 'center',
}) => {
  const isSheet = position === 'sheet';
  return (
    <div
      className={`fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex animate-in fade-in duration-150 ${
        isSheet ? 'items-end sm:items-center justify-center p-0 sm:p-4' : 'items-center justify-center p-4'
      }`}
    >
      <div
        className={`bg-white w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 ${
          isSheet ? 'max-w-md rounded-t-2xl sm:rounded-2xl p-5' : 'max-w-sm rounded-2xl p-5'
        }`}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-10 h-10 rounded-full ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}
          >
            <span className="material-symbols-outlined text-[22px]">{icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 font-headline">{title}</h3>
            {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            type="button"
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 shrink-0 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
