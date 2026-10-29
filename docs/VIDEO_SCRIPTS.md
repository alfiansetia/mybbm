# Naskah Video myBBM — Road to DevFest Jakarta 2026

Rekam 1080p, bahasa Indonesia santai. Siapkan: tab `/landing`, tab `/` (incognito),
akun demo, 1 struk asli + 1 contoh, GPS allow, zoom browser 125%, matikan notif.
Kecepatan baca ±130 kata/menit.

Link:
- Live: https://mybbm-773235037448.asia-southeast2.run.app
- Landing: https://mybbm-773235037448.asia-southeast2.run.app/landing
- API health: https://mybbm-773235037448.asia-southeast2.run.app/api/health

---

## Video 1 — Short Demo (≤ 3 menit, user-facing)

Target 380–430 kata. Jangan cut saat error — tunjukkan fallback-nya.

### [0:00–0:20] Hook + masalah — LAYAR: `/landing`

> "Di Indonesia tidak ada data stok BBM real-time. Peta tahu lokasi SPBU,
> tapi tidak tahu isinya. Akibatnya kita antre 20 menit, ternyata Pertalite
> habis. myBBM membangun data itu dari komunitas: peta live, scan struk AI,
> dan reputasi anti-spam."

### [0:20–1:00] Peta live — LAYAR: `/` → Lihat peta dulu → Cek SPBU

> "Tanpa login pun peta langsung jalan. Izinkan GPS, SPBU terdekat muncul
> dengan cap 'x menit lalu'. Tidak ada laporan? Tulisannya jujur
> 'belum ada data' — kami tidak mengarang. Klik satu SPBU: lihat stok per BBM,
> status antrean, dan laporan warga."

Aksi: scroll list SPBU, klik 1 SPBU, tunjukkan badge menit + tombol vote.

### [1:00–1:50] Scan struk AI — LAYAR: Catat BBM → Scan

> "Isi bensin, foto struk — AI Gemini membaca lewat `/api/scan-receipt`.
> Form terisi otomatis: SPBU, BBM, liter, harga, total, pembayaran.
> Yang tidak terbaca jadi null, bukan tebakan. Tanpa AI pun tetap bisa isi
> manual atau pakai contoh struk. Setiap scan tersimpan sekaligus jadi
> laporan stok baru untuk semua orang."

Aksi: upload 1 struk asli, tunjukkan confidence, simpan.

### [1:50–2:30] Analitik + trust — LAYAR: Statistik + Detail SPBU vote

> "Statistik menghitung km per liter, tren 6 bulan, cash vs cashless,
> pengingat servis, dan ekspor CSV buat armada. Kepercayaan dijaga: laporan
> baru mulai dari nol vote, naik dari vote asli. Spammer kena cooldown
> 'Tunggu M:SS' dan penalti skor."

Aksi: vote 1 laporan, coba lapor ulang untuk tunjukkan cooldown.

### [2:30–3:00] Penutup — LAYAR: `/landing`

> "myBBM: React plus Firebase plus Gemini di Cloud Run Jakarta, PWA
> installable. Misi: data BBM Indonesia dibuka untuk komuter, ojek, sampai
> armada. Coba live di link deskripsi. Terima kasih — Road to DevFest
> Jakarta 2026."

---

## Video 2 — Deep-Dive (≤ 15 menit, teknis)

### [0:00–2:00] Problem & scope

100JT+ motor Indonesia, mulai Jabodetabek (komuter + ojek/logistik),
lalu fleet 5–50 armada, lalu konsumen data. MVP: live map, scan struk,
analitik, trust system. Tunjukkan `/landing` → `/`.

### [2:00–5:00] Arsitektur — LAYAR: diagram + `server.ts`, `App.tsx:77-170`

Satu codebase: React 19 + Vite + Tailwind SPA, Express serve `dist/`
plus API JSON. Firebase Auth Google, Firestore 4 koleksi:
`users/vehicles/fuel_logs` strictly owner-scoped, `stations` public-read.
Effect terpisah: stations publik sekali, auth listener sekali, sync per-uid.
Cloud kosong = kosong, tanpa seed dummy user. Offline: `localStorage`
cache, online: `onSnapshot` realtime.

### [5:00–8:00] AI integration — LAYAR: `server.ts:36-148`, `docs/API.md`

Gemini Flash vision server-side, key tidak pernah ke klien. Client
downscale foto ke 1600px dulu — lebih murah dan cepat. Prompt
strict-JSON-only, temperature 0, null-instead-of-guessing, foto non-struk
confidence 0 ditolak. Angka divalidasi vs kapasitas tangki, payment
dinormalisasi Cash vs Cashless. Gagal jujur: 503 tanpa key, 502 AI error,
400 validasi — UI kuning plus fallback manual.

### [8:00–11:00] Guardrails & token — LAYAR: `firestore.rules`, `utils/reputation.ts`

Firestore default-deny, stations create/update wajib login, delete
dilarang. Cooldown server-enforced plus penalti net ≤ −3. PII: struk tanpa
identitas pemilik, data user tidak keluar scope, `.env` di-gitignore dan
dockerignore, `GEMINI_API_KEY` runtime-only via Secret Manager. Token:
downscale, temp 0, no chat history, tanpa field karangan.

### [11:00–13:00] Scale & ops — LAYAR: `Dockerfile`, `cloudbuild.yaml`, `DEPLOY.md`

Cloud Run scale-to-zero, region Jakarta. Multi-stage Docker: build bake
`VITE_*`, runtime cuma `server.js` plus `dist`. Cloud Build trigger
manual, secret via Secret Manager tidak tampil di log. Rollback via revisi
traffic. Billing aman: min-instances 0 plus budget alert.

### [13:00–15:00] Live demo + roadmap

Ulangi flow video 1 full tanpa cut: peta → scan → vote → statistik → CSV.
Tutup: "Revenue: data API per-call, fleet dashboard, freemium scan-credit.
Roadmap: fleet pilot, agregasi wilayah, data API publik."

---

## Checklist sebelum tekan record

- [ ] `/api/health` → `hasGeminiKey: true`
- [ ] Authorized domain Firebase sudah tambah `*.run.app`
- [ ] 1 SPBU sekitar lokasi demo punya laporan fresh (< 60 menit)
- [ ] Struk asli tidak memuat data pribadi selain belanja BBM
- [ ] Backup deck PDF + PPTX di flashdisk untuk showcase
