import React from 'react';

interface RequireLoginProps {
  title: string;
  hint: string;
  icon?: string;
  onLogin: () => void;
}

export const RequireLogin: React.FC<RequireLoginProps> = ({
  title,
  hint,
  icon = 'lock',
  onLogin,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-4 py-10 animate-in fade-in duration-150">
      <div className="w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center text-[#006194]">
        <span className="material-symbols-outlined text-[30px]">{icon}</span>
      </div>
      <div>
        <h2 className="text-[16px] font-extrabold text-slate-900 font-headline">{title}</h2>
        <p className="text-[13px] text-slate-600 mt-1 max-w-[300px] mx-auto">{hint}</p>
      </div>
      <button
        onClick={onLogin}
        type="button"
        className="h-11 px-6 rounded-xl bg-[#006194] hover:bg-[#007bb9] text-white text-sm font-bold flex items-center gap-2 shadow-md active:scale-[0.99] transition-all"
      >
        <span className="material-symbols-outlined text-[20px]">login</span>
        <span>Masuk dengan Google</span>
      </button>
      <p className="text-[11px] text-slate-400">Gratis — datamu hanya tersimpan di akunmu sendiri</p>
    </div>
  );
};
