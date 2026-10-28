# mybbm — Catat Konsumsi & Cek Stok SPBU Real-Time

Aplikasi mobile-first untuk mencatat pemakaian BBM kendaraan, menganalisis efisiensi,
dan memantau stok + antrean SPBU secara crowdsourced di Indonesia.

> Wajib login (Google). Data kendaraan, log pengisian, dan profil murni milik
> akun masing-masing. Data SPBU adalah data publik bersama.

## Fitur

| Tab | Isi |
| --- | --- |
| Beranda | Ringkasan kendaraan aktif, pengeluaran bulan berjalan, radar SPBU terdekat |
| Cek BBM | Daftar SPBU + status stok/antrean, lapor kondisi, vote laporan orang lain |
| Catat (FAB) | Scan struk AI (Gemini) atau input manual + hitung km/L otomatis |
| Statistik | Tren 6 bulan, komposisi brand/BBM, insight SPBU terhemat, jadwal oli, export CSV |
| Akun | Profil + reputasi, kelola kendaraan, reset data milik sendiri |

Hal penting:

- **Scan struk jujur** — kalau AI tidak tersedia/gagal, backend return error eksplisit
  (tidak mengarang data). Lihat `docs/API.md`.
- **Reputasi crowdsource** — lapor stok menambah poin, vote memengaruhi skor reporter.
- **Offline baseline** — cache `localStorage`, sinkron realtime Firestore saat online.

## Tech stack

React 19 + Vite 8 + Tailwind 4, Firebase (Auth Google + Firestore),
Express (`server.ts` sekaligus menyajikan API + dev server Vite / file `dist`),
Gemini AI untuk OCR struk, Recharts untuk grafik, Leaflet + Google Maps untuk peta.

## Mulai cepat (lokal)

```bash
cp .env.example .env        # lalu isi GEMINI_API_KEY bila ingin coba scan AI
npm install --legacy-peer-deps
npm run dev                 # http://localhost:3000
```

> `npm install` biasa gagal karena konflik peer `vite@8` vs `esbuild` —
> pakai `--legacy-peer-deps`.

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `GEMINI_API_KEY` | Opsional | Tanpa ini, scan struk return 503 jujur + isi manual |
| `GEMINI_MODEL` | Opsional | Default `gemini-2.0-flash` |
| `VITE_GOOGLE_MAPS_API_KEY` | Opsional | Tanpa ini peta Google abu-abu (Leaflet tetap jalan) |
| `PORT` | Opsional | Default `3000` |

## Skrip

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Express + Vite dev (`tsx server.ts`) |
| `npm run build` | Build frontend ke `dist/` |
| `npm run start` | Serve `dist/` + API (produksi) |
| `npm run preview` | Preview Vite |
| `npm run lint` | `tsc --noEmit` |

## Struktur proyek

```
server.ts                 # API + serve frontend
firestore.rules           # Security rules (default-deny)
src/
  App.tsx                 # Auth gate, sync Firestore, routing tab
  views/                  # Beranda, CekSpbu, CatatBbm, DetailSpbu, Statistik, Akun
  components/             # TopHeader, BottomNav, StationMap, ...
  services/dbService.ts   # Langganan + tulis Firestore
  lib/firebase.ts         # Init Firebase Auth/Firestore
  data/seedData.ts        # Seed bootstrap SPBU (publik) — bukan data user
  utils/                  # reputation.ts, serviceTracker.ts
docs/
  ARSITEKTUR.md           # Alur app & modul
  FIRESTORE.md            # Koleksi, rules, seed
  API.md                  # Kontrak endpoint backend
  PENGEMBANGAN.md         # Setup, konvensi, deploy
```

## Dokumentasi

- `docs/ARSITEKTUR.md` — cara kerja auth gate, sinkronisasi, dan modul
- `docs/FIRESTORE.md` — skema koleksi + security rules
- `docs/API.md` — `POST /api/scan-receipt`, `GET /api/health`
- `docs/PENGEMBANGAN.md` — setup lokal, deploy, troubleshooting

## Keamanan (ringkas)

- Firestore default-deny; kendaraan/log/profil hanya milik `request.auth.uid`.
- Koleksi `stations` bisa dibaca publik, tulis hanya saat login.
- Jangan commit `.env` (sudah di-`.gitignore`).

## Lisensi

Apache-2.0 (lihat header `src/App.tsx`).
