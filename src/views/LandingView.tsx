import React from 'react';

interface LandingViewProps {
  onEnter: () => void;
  onLogin: () => void;
}

/** Landing page publik: hero, masalah, fitur, cara kerja, CTA. */
export const LandingView: React.FC<LandingViewProps> = ({ onEnter, onLogin }) => {
  return (
    <div className="bg-[#f7f9ff] text-[#181c20] min-h-screen flex flex-col antialiased">
      {/* Nav */}
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur border-b border-slate-200">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="myBBM" className="w-8 h-8 rounded-lg shadow-sm" />
            <span className="font-extrabold text-[15px] font-headline">myBBM</span>
          </div>
          <button
            type="button"
            onClick={onLogin}
            className="h-9 px-4 rounded-full bg-[#006194] hover:bg-[#007bb9] text-white text-xs font-bold transition-colors"
          >
            Masuk
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[480px] mx-auto px-4 pb-16">
        {/* Hero */}
        <section className="pt-10 pb-8 text-center">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#006a63] bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
            <span className="material-symbols-outlined text-[14px]">crowdsource</span>
            Peta stok BBM live dari komunitas
          </span>
          <h1 className="mt-4 text-[28px] leading-tight font-extrabold font-headline text-slate-900">
            Jangan antre 20 menit
            <br />
            untuk SPBU yang <span className="text-[#ee2737]">kosong</span>.
          </h1>
          <p className="mt-3 text-[14px] text-slate-600 max-w-[480px] mx-auto">
            myBBM menunjukkan stok &amp; antrean SPBU terdekat secara live —
            dilaporkan komunitas, difoto struknya, dibaca AI.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={onLogin}
              className="w-full sm:w-auto h-12 px-7 rounded-full bg-[#006194] hover:bg-[#007bb9] text-white text-sm font-bold shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">login</span>
              Masuk dengan Google
            </button>
            <button
              type="button"
              onClick={onEnter}
              className="w-full sm:w-auto h-12 px-7 rounded-full bg-white border border-slate-300 text-slate-800 text-sm font-bold hover:border-[#006194] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">map</span>
              Lihat peta dulu
            </button>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">Gratis — datamu hanya tersimpan di akunmu sendiri</p>
        </section>

        {/* Masalah */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-[15px] font-extrabold font-headline text-slate-900">Masalahnya nyata</h2>
          <ul className="mt-3 space-y-2.5">
            {[
              ['schedule', 'Antre 15–20 menit, ternyata Pertalite habis. Waktu & bensin terbuang.'],
              ['visibility_off', 'Tidak ada API publik stok BBM real-time — peta cuma tahu lokasi, bukan isi tangki SPBU.'],
              ['receipt_long', 'Catat konsumsi manual itu merepotkan — struk langsung dibuang, data hilang.'],
            ].map(([icon, text]) => (
              <li key={icon} className="flex items-start gap-2.5">
                <span className="w-8 h-8 shrink-0 rounded-lg bg-red-50 text-[#ee2737] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">{icon}</span>
                </span>
                <p className="text-[13px] text-slate-700 leading-snug pt-1">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Fitur */}
        <section className="mt-6">
          <h2 className="text-[15px] font-extrabold font-headline text-slate-900 text-center">3 hal yang dilakukan myBBM</h2>
          <div className="mt-3 grid grid-cols-1 gap-2.5">
            {[
              ['near_me', 'Peta live SPBU', 'Stok & antrean terdekat, cap “x menit lalu”. Tanpa laporan = jujur “belum ada data”.', 'bg-sky-100 text-[#006194]'],
              ['document_scanner', 'Scan struk AI', 'Foto struk → form terisi otomatis via Gemini. Tiap scan = laporan stok baru.', 'bg-teal-100 text-[#006a63]'],
              ['monitoring', 'Analitik konsumsi', 'km/L, tren 6 bulan, pengingat servis, ekspor CSV untuk armada.', 'bg-amber-100 text-amber-700'],
            ].map(([icon, title, desc, chip]) => (
              <div key={title} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <span className={`w-10 h-10 rounded-xl ${chip} flex items-center justify-center`}>
                  <span className="material-symbols-outlined text-[22px]">{icon}</span>
                </span>
                <h3 className="mt-2.5 text-[13px] font-extrabold text-slate-900">{title}</h3>
                <p className="mt-1 text-[12px] text-slate-600 leading-snug">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Cara kerja */}
        <section className="mt-6 bg-slate-900 rounded-2xl p-5 text-white">
          <h2 className="text-[15px] font-extrabold font-headline">Cara kerja</h2>
          <ol className="mt-3 space-y-3">
            {[
              ['1', 'Buka peta, lihat SPBU terdekat beserta status stok & antreannya.'],
              ['2', 'Isi BBM, foto struk — AI membaca & mencatat otomatis.'],
              ['3', 'Laporanmu memperbarui peta untuk pengendara lain. Makin aktif, makin dipercaya.'],
            ].map(([n, text]) => (
              <li key={n} className="flex items-start gap-3">
                <span className="w-7 h-7 shrink-0 rounded-full bg-white/15 font-extrabold text-[13px] flex items-center justify-center">{n}</span>
                <p className="text-[13px] text-slate-200 leading-snug pt-0.5">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Tech strip */}
        <section className="mt-6 text-center">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ditenagai</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            {['Google Cloud Run', 'Gemini AI', 'Firebase', 'Google Maps'].map((t) => (
              <span key={t} className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-full">
                {t}
              </span>
            ))}
          </div>
        </section>

        {/* CTA bawah */}
        <section className="mt-6 text-center">
          <button
            type="button"
            onClick={onLogin}
            className="w-full sm:w-auto h-12 px-8 rounded-full bg-[#006194] hover:bg-[#007bb9] text-white text-sm font-bold shadow-md active:scale-[0.99] transition-all"
          >
            Mulai gratis — masuk dengan Google
          </button>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-[480px] mx-auto px-4 py-4 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">myBBM — Road to DevFest Jakarta 2026</p>
          <button type="button" onClick={onEnter} className="text-[11px] font-bold text-[#006194] hover:underline">
            Buka aplikasi
          </button>
        </div>
      </footer>
    </div>
  );
};
