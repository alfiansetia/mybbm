# Deploy myBBM ke Cloud Run (Gratis)

Panduan dari nol: ambil semua key → deploy → verifikasi.
Free tier Cloud Run (2 jt request/bulan, scale-to-zero) cukup untuk tahap ini.

> Aturan env yang harus dipahami dulu:
> - `VITE_*` = **dibake ke bundle saat BUILD** (terlihat di FE, jadi hanya untuk
>   key publik/terbatas). Ganti nilainya = build ulang.
> - `GEMINI_API_KEY` (tanpa prefix) = **rahasia server**, diset saat RUNTIME,
>   tidak pernah masuk image (`.dockerignore` mengecualikan `.env`).

---

## 1. Prasyarat

```bash
# Install gcloud CLI lalu login
gcloud auth login
gcloud config set project PROJECT_ID_KAMU

# Aktifkan API yang dibutuhkan (sekali saja)
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com

# Billing wajib aktif (tidak ditagih selama dalam batas gratis).
# Pasang budget alert: Console → Billing → Budgets & alerts → Rp50.000, 50%/100%.
```

---

## 2. Dapetin semua key

### A. Gemini (scan struk, server-side, gratis)

1. Buka `https://aistudio.google.com/apikey` → **Create API Key** → copy (`AIza...`).
2. (Opsional, disarankan) Batasi di `console.cloud.google.com` → APIs & Services →
   Credentials → key tersebut → API restriction: **Generative Language API** saja.
   Referrer tidak perlu karena key ini tidak keluar dari server.

### B. Google Maps + Places (key publik terbatas)

1. `console.cloud.google.com` → APIs & Services → **Enabled APIs** → enable:
   - **Maps JavaScript API** (peta)
   - **Places API (New)** (cari SPBU)
2. Credentials → **Create Credentials → API key** → buat **2 key terpisah**:
   - Key 1 `mybbm-maps`: API restriction = Maps JavaScript API saja.
   - Key 2 `mybbm-places`: API restriction = Places API (New) saja.
3. Keduanya: Application restriction → **HTTP referrers**, isi:
   - `http://localhost:*` (dev)
   - `https://*.run.app/*` (Cloud Run, ganti domain custom bila sudah ada)

### C. Firebase Web config (Auth + Firestore)

1. `console.firebase.google.com` → project-mu → Project settings → **Your apps** →
   Web app → `firebaseConfig` → copy 7 nilai (`apiKey`, `authDomain`,
   `projectId`, `storageBucket`, `messagingSenderId`, `appId`,
   `databaseId` bila pakai DB non-default).
2. **WAJIB setelah deploy:** Authentication → Settings → **Authorized domains** →
   tambah domain Cloud Run (`xxx.run.app`). Tanpa ini login Google gagal.
3. Deploy rules (cooldown anti-spam ikut aktif):
   ```bash
   firebase deploy --only firestore:rules
   ```

---

## 3. Deploy

### Opsi A — Cloud Build (disarankan, tanpa paste key)

Isi key sekali di file lokal (gitignored), deploy berikutnya cukup satu perintah:

```bash
# Di Cloud Shell / terminal (sekali saja):
cp .env.deploy.example .env.deploy   # lalu isi semua nilai di dalamnya

# Tiap kali deploy:
bash deploy.sh
```

`deploy.sh` otomatis: set project → aktifkan API → simpan `GEMINI_API_KEY`
ke **Secret Manager** (rotasi tiap deploy, tidak tampil di build log)
→ `gcloud builds submit` hanya dengan `VITE_*` (publik) → Cloud Run
mengambil secret via `--set-secrets`. Tidak ada key yang diketik di console.

### Opsi B — Manual (tanpa cloudbuild.yaml)

```bash
# 1. Bake VITE_* dari .env lokal, lalu build image
docker build \
  --build-arg VITE_FIREBASE_API_KEY="..." \
  --build-arg VITE_GOOGLE_MAPS_API_KEY="..." \
  -t gcr.io/PROJECT_ID/mybbm:v1 .
docker push gcr.io/PROJECT_ID/mybbm:v1

# 2. Deploy dengan secret server sebagai runtime var
gcloud run deploy mybbm \
  --image gcr.io/PROJECT_ID/mybbm:v1 \
  --region asia-southeast2 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY="AIza...server",GEMINI_MODEL="gemini-3.8-flash"
```

Lihat `Dockerfile` untuk isi build (multi-stage, runtime hanya `server.js` + `dist`).

---

## 4. Verifikasi (buka URL `*.run.app`)

| Cek | Harapan |
|---|---|
| Peta + SPBU terdekat | Pin muncul, log `[Places] N SPBU dalam X ms` |
| Upload struk | Form terisi + confidence (tanpa error key) |
| Login Google | Berhasil (authorized domain sudah ditambah) |
| Lapor → lapor lagi | Tombol "Tunggu M:SS" (cooldown jalan) |
| `/api/health` | `{"status":"ok","hasGeminiKey":true,...}` |

## 5. Troubleshooting

| Gejala | Penyebab → fix |
|---|---|
| `Container failed to start` | Cek log: `gcloud run services logs read mybbm --region asia-southeast2`. Umumnya PORT — server sudah pakai `process.env.PORT`, jangan override. |
| Peta abu-abu / `ApiNotActivatedMapError` | API belum di-enable atau key salah → §2B. |
| `REQUEST_DENIED` Places | Key places kena restriction API yang salah → restriction = Places API (New). |
| Login Google `auth/unauthorized-domain` | Authorized domains belum ditambah → §2C langkah 2. |
| Scan: `hasGeminiKey: false` | `GEMINI_API_KEY` belum diset sebagai runtime var → deploy ulang dengan `--set-env-vars` / `--update-env-vars`. |
| Scan 404 model | Model pensiun → ganti `GEMINI_MODEL` (lihat error-nya, ia menyebut penggantinya). |
| Tagihan takut jebol | Billing → Budgets & alerts; Cloud Run min-instances = 0 (default) agar scale-to-zero. |
