import React from 'react';

interface ToastProps {
  message: string;
  tone?: 'dark' | 'success';
  position?: 'top' | 'bottom';
}

/** Toast notifikasi terpusat. */
export const Toast: React.FC<ToastProps> = ({
  message,
  tone = 'dark',
  position = 'bottom',
}) => (
  <div
    className={`fixed left-1/2 -translate-x-1/2 z-50 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in duration-200 ${
      tone === 'success' ? 'bg-emerald-600' : 'bg-slate-900'
    } ${position === 'top' ? 'top-20 slide-in-from-top-2' : 'bottom-20 slide-in-from-bottom-2'}`}
  >
    <span
      className={`material-symbols-outlined text-[18px] ${
        tone === 'success' ? 'text-white' : 'text-emerald-400'
      }`}
    >
      check_circle
    </span>
    <span>{message}</span>
  </div>
);
