# Pengembangan mybbm

## Prasyarat

Node 22+, npm. Repo memakai `bun.lock`, tapi instalasi via npm didukung:

```bash
cp .env.example .env
npm install --legacy-peer-deps   # wajib: konflik peer vite@8 vs esbuild
npm run dev                      # http://localhost:3000
```

Cek cepat: `curl localhost:3000/api/health` → `hasGeminiKey: false`
kalau belum isi kunci (normal untuk dev tanpa AI).

## Alur kerja dev

1. `npm run dev` — Express + Vite middleware, HMR aktif.
2. `npm run lint` — `tsc --noEmit`. Dijalankan sebelum commit.
3. Login Google di localhost: daftarkan `localhost` di Firebase Console →
   Authentication → Authorized domains (kalau error unauthorized-domain).
4. Konfigurasi Firebase ada di `firebase-applet-config.json` (DB ID kustom).
   Jangan commit kredensial lain ke repo.

## Konvensi

- State user (kendaraan/log/profil) **tidak pernah** diisi seed — kosong
  sampai Firestore mengembalikan data.
- Tambah layar baru: buat di `src/views/`, daftarkan tab di `BottomNav`
  (`NavTab`), dan cabang render di `App.tsx` (perhatikan gate
  `!currentUser` → `LoginGate`, `!activeVehicle && needsVehicle`).
- Format tanggal ID: `toLocaleDateString('id-ID', ...)`, rupiah:
  `toLocaleString('id-ID')`.
- Cache lokal hanya `mybbm_*` berversi (`mybbm_schema_version`).
  Tambah key baru → sertakan dalam daftar reset/logout di `App.tsx`.

## Deploy

```bash
npm run build     # → dist/
npm run start     # serve dist/ + API di PORT (default 3000)
firebase deploy --only firestore:rules
```

Env produksi wajib: `GEMINI_API_KEY`, `PORT`, `VITE_GOOGLE_MAPS_API_KEY`
(bila pakai peta Google). `server.ts` otomatis serve SPA fallback (`*` →
`dist/index.html`).

## Troubleshooting

| Gejala | Penyebab / solusi |
| --- | --- |
| `Failed to resolve import "react-is"` | Peer `recharts` hilang — `npm install react-is --legacy-peer-deps`, hapus `node_modules/.vite`, hard-refresh browser |
| `npm install` eresolve esbuild | Pakai `--legacy-peer-deps` |
| Scan struk selalu peringatan kuning | `GEMINI_API_KEY` masih placeholder — isi `.env` lalu restart `dev` |
| Peta abu-abu | `VITE_GOOGLE_MAPS_API_KEY` kosong; restart dev setelah mengisi (env Vite dibaca saat start) |
| Data akun A terlihat sebelum login B | Seharusnya tidak terjadi (logout membersihkan cache). Kalau iya: cek `mybbm_schema_version` di DevTools → Application → Local Storage, dan laporkan |
| Chart kosong padahal ada log | `dateTime` log harus ISO valid; agregasi memakai `new Date(dateTime)` per bulan |
