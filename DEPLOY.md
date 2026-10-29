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

`bash deploy.sh` sudah mengurus login, set project (dari `PROJECT_ID` di `.env`),
dan mengaktifkan semua API — bagian bawah ini hanya referensi manual bila perlu:

```bash
# Install gcloud CLI lalu login
gcloud auth login
gcloud config set project PROJECT_ID_KAMU

# Aktifkan API yang dibutuhkan (sekali saja)
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com

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
3. Deploy rules (cooldown anti-spam ikut aktif, sekali saja + tiap ubah rules):
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase use --add   # pilih project-mu
   firebase deploy --only firestore:rules
   ```

---

## 3. Deploy

### Mulai dari nol (Cloud Shell, clone fresh)

```bash
# 1. Clone
rm -rf mybbm && git clone https://github.com/alfiansetia/mybbm.git && cd mybbm

# 2. Buat .env (Editor Cloud Shell → file baru bernama .env),
#    isi = copy .env lokalmu + pastikan PROJECT_ID terisi.
#    Semua nilai juga terdokumentasi di .env.example.

# 3. Deploy (urus login, project, API, secret, build — sekaligus)
bash deploy.sh
```

Deploy ulang berikutnya: `git pull` lalu `bash deploy.sh` lagi — service yang
sama ditimpa revisi baru, URL tidak berubah. Tidak perlu hapus service dulu
(kecuali ganti nama service / pindah region).

### Opsi A — Cloud Build (disarankan, tanpa paste key)

`.env` yang dipakai run lokal itu juga yang dipakai deploy — isi sekali,
deploy berikutnya cukup satu perintah:

```bash
# Di Cloud Shell / terminal: isi .env seperti biasa (lihat .env.example,
# pastikan PROJECT_ID terisi), lalu tiap kali deploy:
bash deploy.sh
```

`deploy.sh` otomatis: set project → aktifkan API → simpan `GEMINI_API_KEY`
ke **Secret Manager** (rotasi tiap deploy, tidak tampil di build log)
→ `gcloud builds submit` hanya dengan `VITE_*` (publik) → Cloud Run
mengambil secret via `--set-secrets`. Tidak ada key yang diketik di console.

### Opsi B — Manual (tanpa cloudbuild.yaml)

```bash
# 0. Sekali saja: secret server + izin aksesnya
printf '%s' "$GEMINI_API_KEY" | gcloud secrets create mybbm-gemini-key \
  --data-file=- --replication-policy=automatic 2>/dev/null || \
printf '%s' "$GEMINI_API_KEY" | gcloud secrets versions add mybbm-gemini-key --data-file=-
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
gcloud secrets add-iam-policy-binding mybbm-gemini-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 1. Bake VITE_* dari .env lokal, lalu build + push image
set -a; source .env; set +a   # bash; di PowerShell isi manual tiap --build-arg
docker build \
  --build-arg VITE_FIREBASE_API_KEY="$VITE_FIREBASE_API_KEY" \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN="$VITE_FIREBASE_AUTH_DOMAIN" \
  --build-arg VITE_FIREBASE_PROJECT_ID="$VITE_FIREBASE_PROJECT_ID" \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET="$VITE_FIREBASE_STORAGE_BUCKET" \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID="$VITE_FIREBASE_MESSAGING_SENDER_ID" \
  --build-arg VITE_FIREBASE_APP_ID="$VITE_FIREBASE_APP_ID" \
  --build-arg VITE_FIRESTORE_DATABASE_ID="$VITE_FIRESTORE_DATABASE_ID" \
  --build-arg VITE_GOOGLE_MAPS_API_KEY="$VITE_GOOGLE_MAPS_API_KEY" \
  --build-arg VITE_GOOGLE_PLACES_API_KEY="$VITE_GOOGLE_PLACES_API_KEY" \
  --build-arg VITE_GOOGLE_MAPS_MAP_ID="${VITE_GOOGLE_MAPS_MAP_ID:-DEMO_MAP_ID}" \
  -t gcr.io/"$PROJECT_ID"/mybbm:v1 .
docker push gcr.io/"$PROJECT_ID"/mybbm:v1

# 2. Deploy: secret diambil dari Secret Manager (jangan paste key di sini)
gcloud run deploy mybbm \
  --image gcr.io/"$PROJECT_ID"/mybbm:v1 \
  --region "${REGION:-asia-southeast2}" \
  --allow-unauthenticated \
  --set-env-vars GEMINI_MODEL="${GEMINI_MODEL:-gemini-3.8-flash}" \
  --set-secrets GEMINI_API_KEY=mybbm-gemini-key:latest
```

Lihat `Dockerfile` untuk isi build (multi-stage, runtime hanya `server.js` + `dist`).

---

## 4. Verifikasi (buka URL `*.run.app`)

| Cek | Harapan |
|---|---|
| Buka URL di incognito (tanpa login Google Cloud) | Langsung terbuka, BUKAN `403 Forbidden` (= service public) |
| Landing (logged-out / incognito) | Hero + CTA Masuk / Lihat peta dulu |
| Peta + SPBU terdekat | Pin muncul, log `[Places] N SPBU dalam X ms` |
| Pilih SPBU → ketik nama jalan | Log `[PlacesText] "..." → N SPBU`, hasil merge dengan lokal |
| Foto struk (kamera) / upload galeri | Form terisi + confidence (tanpa error key) |
| Contoh struk / isi manual | Tetap jalan walau AI nonaktif |
| Login Google | Berhasil (authorized domain sudah ditambah) |
| Lapor → lapor lagi | Tombol "Tunggu M:SS" (cooldown jalan) |
| Odo lompat tak wajar | Modal konfirmasi, `Tetap Simpan` tetap bisa |
| `/api/health` | `{"status":"ok","hasGeminiKey":true,...}` |

## 5. Rollback (kalau revisi baru bermasalah)

Revisi lama tidak dihapus — kembalikan traffic dari console
(Cloud Run → mybbm → Revisions → kelola traffic) atau via CLI:

```bash
# Lihat revisi: gcloud run revisions list --service mybbm --region asia-southeast2
gcloud run services update-traffic mybbm --to-revisions REVISI_LAMA=100 --region asia-southeast2
```

## 6. Troubleshooting

| Gejala | Penyebab → fix |
|---|---|
| `Container failed to start` | Cek log: `gcloud run services logs read mybbm --region asia-southeast2`. Umumnya PORT — server sudah pakai `process.env.PORT`, jangan override. |
| `403 Forbidden` buka URL | Service masih Require authentication → buka akses publik: `gcloud run services add-iam-policy-binding mybbm --member=allUsers --role=roles/run.invoker --region asia-southeast2` (deploy via `deploy.sh`/`cloudbuild.yaml` sudah `--allow-unauthenticated`, jadi ini hanya untuk service lama) |
| Peta abu-abu / `ApiNotActivatedMapError` | API belum di-enable atau key salah → §2B. |
| `REQUEST_DENIED` Places | Key places kena restriction API yang salah → restriction = Places API (New). |
| Login Google `auth/unauthorized-domain` | Authorized domains belum ditambah → §2C langkah 2. |
| Scan: `hasGeminiKey: false` | Secret kosong/salah → cek `gcloud secrets versions access latest --secret=mybbm-gemini-key`, lalu deploy ulang (`bash deploy.sh`) |
| Scan 403 / permission secret | Service account Cloud Run belum `secretAccessor` → `deploy.sh` mengurus otomatis; manual: lihat Opsi B langkah 0 |
| Build gagal `PROJECT_ID kosong` | Isi `PROJECT_ID` di `.env` |
| Firebase `firebase deploy` error | Belum `firebase login` / belum `firebase use --add` → §2C langkah 3 |
| Scan 404 model | Model pensiun → ganti `GEMINI_MODEL` (lihat error-nya, ia menyebut penggantinya). |
| Tagihan takut jebol | Billing → Budgets & alerts; Cloud Run min-instances = 0 (default) agar scale-to-zero. |
