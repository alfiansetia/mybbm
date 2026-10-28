# Style baku (untuk AI)

Sumber token: `src/index.css` (`@layer base :root`). Tailwind v4 (`@import "tailwindcss"`).
Font: body `Inter`, heading/`font-headline` = `Plus Jakarta Sans`.

## Token warna (pakai persis, jangan aproksimasi)

| Token | Hex | Pakai untuk |
| --- | --- | --- |
| `--primary` | `#006194` | Tombol utama, FAB, link, ikon aktif, teks brand `mybbm` |
| `--primary-container` | `#007bb9` | Hover/gradien (`to-[#007bb9]`) |
| `--secondary` | `#006a63` | Aksen teal (badge sukses, toggle on) |
| `--tertiary` | `#894d00` | Peringatan/amber tua, ikon kios |
| `--surface` | `#f7f9ff` | Background app + body |
| `--status-available` | `#059669` | Tersedia / sukses / hemat |
| `--status-limited` | `#d97706` | Terbatas / biaya |
| `--status-empty` | `#dc2626` | Kosong / bahaya |
| `--spbu-pertamina` | `#ee2737` | Avatar/bar Pertamina |
| `--spbu-shell` | `#ffd200` | Avatar/bar Shell |
| `--spbu-vivo` | `#005baa` | Avatar/bar Vivo dkk |
| Teks | `#181c20` / `slate-600` / `slate-500` / `slate-400` | Judul / isi / sekunder / hint |

Avatar brand: Pertamina `bg-red-50 text-[#ee2737]` huruf `P`;
Shell `bg-amber-100 text-[#894d00]` huruf `S`; lain `bg-teal-50 text-[#006a63]`
(pola `BerandaView.tsx:287-296`, `CekSpbuView` mengikuti).

## Pola baku (copy struktur class ini)

- **Envelope:** `max-w-[480px] mx-auto px-4 pt-20 pb-safe` untuk main;
  header/nav `fixed` + inner `max-w-[480px] mx-auto`.
- **Card:** `bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm`
  (varian besar `rounded-2xl p-4`). Jangan border tanpa shadow atau sebaliknya.
- **Tombol primer:** `h-11 bg-[#006194] hover:bg-[#007bb9] text-white text-xs font-bold rounded-lg shadow-md active:scale-[0.99]`
  (varian bulat penuh: `rounded-xl`/`rounded-full` mengikuti konteks tombol asal).
- **Tombol sekunder:** `bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg`.
- **Input field:** bungkus `bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg`,
  input `w-full bg-transparent text-xs font-semibold focus:outline-none`.
- **Badge pil:** `text-[10px] font-bold px-2 py-0.5 rounded-full` + pasangan
  bg/teks/border (contoh sukses: `bg-teal-50 text-[#006a63] border border-teal-200`).
- **Angka:** selalu `tabular-nums`; rupiah `Rp {n.toLocaleString('id-ID')}`.
- **Section title:** ikon `material-symbols-outlined text-[19px] text-[#006194]`
  + `h2 text-[16px] font-bold font-headline`.
- **Empty state:** ikon `text-slate-300 text-[28px+]` + judul bold + hint
  `text-[11px] text-slate-500` + tombol primer CTA (pola `EmptyVehicleState`,
  chart kosong `StatistikView`).
- **Ribbon status scan/lapor:** sukses `bg-teal-900/40 border-teal-800/60 text-teal-100`;
  gagal/peringatan `bg-amber-900/40 border-amber-800/60 text-amber-100`.

## Larangan style

1. Jangan menambah warna primer baru — map ke token di atas.
2. Jangan inline `style={{color:...}}` bila ada class Tailwind setara
   (pengecualian: `width:%` bar distribusi, `fontVariationSettings` ikon FILL).
3. Jangan ubah font/body/global di luar `index.css`.
4. Utilitas kustom hanya `no-scrollbar`, `pb-safe`, `pt-safe`,
   `custom-leaflet-marker`. Butuh yang baru → tambah di `index.css`, jangan
   `<style>` di komponen.
5. Ukuran teks konten: judul `text-sm/base font-bold`, isi `text-xs`,
   hint `text-[10px]/[11px] text-slate-400/500`. Jangan teks < `text-[10px]`
   kecuali badge angka.
