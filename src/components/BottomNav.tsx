import React from 'react';

export type NavTab = 'beranda' | 'cek-spbu' | 'catat-bbm' | 'statistik' | 'akun';

interface BottomNavProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-safe">
      <div className="max-w-[480px] mx-auto flex items-center justify-between h-16 px-1 relative">
        {/* 1. Beranda */}
        <button
          onClick={() => onChangeTab('beranda')}
          aria-current={activeTab === 'beranda' ? 'page' : undefined}
          className={`flex-1 flex flex-col items-center justify-center py-1 min-h-[44px] transition-colors ${
            activeTab === 'beranda' ? 'text-[#006194] font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
          type="button"
        >
          <span
            className="material-symbols-outlined text-[23px]"
            style={{ fontVariationSettings: activeTab === 'beranda' ? "'FILL' 1" : "'FILL' 0" }}
          >
            home
          </span>
          <span className="text-[11px] leading-tight mt-0.5">Beranda</span>
        </button>

        {/* 2. Cek BBM */}
        <button
          onClick={() => onChangeTab('cek-spbu')}
          aria-current={activeTab === 'cek-spbu' ? 'page' : undefined}
          className={`flex-1 flex flex-col items-center justify-center py-1 min-h-[44px] transition-colors ${
            activeTab === 'cek-spbu' ? 'text-[#006194] font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
          type="button"
        >
          <span
            className="material-symbols-outlined text-[23px]"
            style={{ fontVariationSettings: activeTab === 'cek-spbu' ? "'FILL' 1" : "'FILL' 0" }}
          >
            local_gas_station
          </span>
          <span className="text-[11px] leading-tight mt-0.5">Cek BBM</span>
        </button>

        {/* 3. Center Elevated FAB: Catat */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <button
            onClick={() => onChangeTab('catat-bbm')}
            aria-label="Catat Pengisian BBM"
            className="-top-5 absolute w-13 h-13 rounded-full bg-[#006194] hover:bg-[#007bb9] text-white shadow-lg shadow-[#006194]/35 flex flex-col items-center justify-center active:scale-95 transition-all ring-4 ring-white"
            type="button"
          >
            <span className="material-symbols-outlined text-[26px]">add</span>
            <span className="text-[9px] font-extrabold leading-none -mt-0.5">Catat</span>
          </button>
        </div>

        {/* 4. Statistik */}
        <button
          onClick={() => onChangeTab('statistik')}
          aria-current={activeTab === 'statistik' ? 'page' : undefined}
          className={`flex-1 flex flex-col items-center justify-center py-1 min-h-[44px] transition-colors ${
            activeTab === 'statistik' ? 'text-[#006194] font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
          type="button"
        >
          <span
            className="material-symbols-outlined text-[23px]"
            style={{ fontVariationSettings: activeTab === 'statistik' ? "'FILL' 1" : "'FILL' 0" }}
          >
            bar_chart
          </span>
          <span className="text-[11px] leading-tight mt-0.5">Statistik</span>
        </button>

        {/* 5. Akun */}
        <button
          onClick={() => onChangeTab('akun')}
          aria-current={activeTab === 'akun' ? 'page' : undefined}
          className={`flex-1 flex flex-col items-center justify-center py-1 min-h-[44px] transition-colors ${
            activeTab === 'akun' ? 'text-[#006194] font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
          type="button"
        >
          <span
            className="material-symbols-outlined text-[23px]"
            style={{ fontVariationSettings: activeTab === 'akun' ? "'FILL' 1" : "'FILL' 0" }}
          >
            person
          </span>
          <span className="text-[11px] leading-tight mt-0.5">Akun</span>
        </button>
      </div>
    </nav>
  );
};
