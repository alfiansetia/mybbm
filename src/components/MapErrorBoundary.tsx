import React from 'react';

interface Props {
  children: React.ReactNode;
  fallbackLabel?: string;
}

/**
 * Menangkap crash Google Maps (mis. InvalidKeyMapError / map instance gagal load)
 * agar ganti radius / filter tidak bikin seluruh halaman blank.
 */
export class MapErrorBoundary extends React.Component<Props, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    console.warn('[MapErrorBoundary] Google Maps gagal dimuat:', err);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-slate-100">
          <span className="material-symbols-outlined text-[32px] text-slate-400 mb-1">map</span>
          <p className="text-xs font-bold text-slate-700">Peta tidak dapat dimuat</p>
          <p className="text-[11px] text-slate-500 mt-0.5 max-w-[260px]">
            {this.props.fallbackLabel ||
              'API key Google Maps tidak valid / belum mengizinkan domain ini. Daftar SPBU di bawah tetap bisa dipakai.'}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 text-[11px] font-bold text-[#006194] bg-white border border-sky-200 px-3 py-1.5 rounded-lg"
          >
            Coba lagi
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
