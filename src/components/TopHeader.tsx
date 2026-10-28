import React from 'react';
import { Vehicle, UserProfile } from '../types';

interface TopHeaderProps {
  currentSubtitle: string;
  activeVehicle: Vehicle;
  allVehicles: Vehicle[];
  onSelectVehicle: (id: string) => void;
  userProfile: UserProfile;
  onOpenAccount: () => void;
  onOpenVehicleModal: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentSubtitle,
  activeVehicle,
  allVehicles,
  onSelectVehicle,
  userProfile,
  onOpenAccount,
  onOpenVehicleModal,
}) => {
  const [showVehicleDropdown, setShowVehicleDropdown] = React.useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-[#f7f9ff]/90 backdrop-blur-xl border-b border-slate-200/60 shadow-[0_1px_8px_rgba(0,0,0,0.03)] pt-safe">
      <div className="max-w-[480px] mx-auto h-16 px-4 flex items-center justify-between gap-2">
        {/* Brand Logo & Subtitle */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#006194] to-[#007bb9] flex items-center justify-center text-white shadow-sm shrink-0">
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              water_drop
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-[18px] text-[#006194] tracking-tight leading-none">
              mybbm
            </span>
            <span className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
              {currentSubtitle}
            </span>
          </div>
        </div>

        {/* Vehicle Switcher Pill & Profile Avatar */}
        <div className="flex items-center gap-2 shrink-0 relative">
          <button
            onClick={() => setShowVehicleDropdown(!showVehicleDropdown)}
            aria-label="Pilih Kendaraan Aktif"
            type="button"
            className="h-9 px-3 py-1 rounded-full bg-slate-200/70 hover:bg-slate-200 flex items-center gap-1.5 text-slate-800 transition-colors active:scale-95 text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-[17px] text-[#006194]">
              {activeVehicle.type === 'motor' ? 'two_wheeler' : 'directions_car'}
            </span>
            <span className="max-w-[95px] truncate">{activeVehicle.name}</span>
            <span className="material-symbols-outlined text-[15px] text-slate-500">
              expand_more
            </span>
          </button>

          {/* Vehicle Dropdown Menu */}
          {showVehicleDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowVehicleDropdown(false)}
              />
              <div className="absolute top-11 right-10 z-50 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Pilih Kendaraan
                </div>
                {allVehicles.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      onSelectVehicle(v.id);
                      setShowVehicleDropdown(false);
                    }}
                    type="button"
                    className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                      v.id === activeVehicle.id
                        ? 'bg-[#cce5ff] text-[#004b73] font-bold'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="material-symbols-outlined text-[16px]">
                        {v.type === 'motor' ? 'two_wheeler' : 'directions_car'}
                      </span>
                      <span className="truncate">{v.name}</span>
                    </div>
                    {v.id === activeVehicle.id && (
                      <span className="material-symbols-outlined text-[16px] text-[#006194]">
                        check
                      </span>
                    )}
                  </button>
                ))}
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => {
                    setShowVehicleDropdown(false);
                    onOpenVehicleModal();
                  }}
                  type="button"
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#006194] hover:bg-sky-50 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Tambah Kendaraan Baru</span>
                </button>
              </div>
            </>
          )}

          {/* Profile Avatar */}
          <button
            onClick={onOpenAccount}
            aria-label="Profil Akun"
            type="button"
            className="w-9 h-9 rounded-full ring-2 ring-[#006194]/20 overflow-hidden hover:opacity-90 active:scale-95 transition-all shrink-0 bg-slate-200"
          >
            <img
              src={userProfile.avatar}
              alt={userProfile.name}
              className="w-full h-full object-cover"
            />
          </button>
        </div>
      </div>
    </header>
  );
};
