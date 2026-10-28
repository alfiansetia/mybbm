# Arsitektur (untuk AI)

## Peta modul

```
server.ts                  Express: POST /api/scan-receipt, GET /api/health,
                           serve dist/ saat produksi (docs/API.md)
src/App.tsx                Satu-satunya pemilik state global + routing tab.
                           Berisi juga LoginGate & EmptyVehicleState (bukan file sendiri)
src/views/                 Beranda, CekSpbu, CatatBbm, DetailSpbu, Statistik, Akun
src/components/            TopHeader, BottomNav, StationMap, ReputationBadge, ServiceAlertBanner
src/services/dbService.ts  Satu-satunya jalan ke Firestore (jangan query langsung dari view)
src/lib/firebase.ts        Init + auth helpers + handleFirestoreError
src/data/seedData.ts       HANYA seed SPBU publik (initialStations). Lihat aturan di bawah
src/utils/                 reputation.ts, serviceTracker.ts (pure, tanpa I/O)
src/types/index.ts         Tipe domain: Vehicle, FuelLog, GasStation, CommunityReport, UserProfile
```

## Alur data (jangan dibalik)

1. Tamu → `LoginGate` saja. Tidak ada fetch data user.
2. Login → `onAuthStateChanged` → 3 subscription per-uid
   (`users/{uid}`, `vehicles where userId`, `fuel_logs where userId`)
   + 1 subscription publik (`stations`).
3. Tulis → view memanggil handler `App.tsx` → `dbService` (`setDoc` + `{merge:true}`).
   View dilarang import `firebase/firestore` langsung.
4. Cache `localStorage` hanya offline baseline (`mybbm_*` + `mybbm_schema_version`).
   Kunci baru wajib didaftarkan di reset/logout (`App.tsx: handleResetData`,
   `handleGoogleLogout`) dan migrasi versi.

## Keputusan yang tidak boleh dilanggar

1. **Tanpa seed data user.** `initialVehicles/initialLogs/initialUserProfile`
   sudah tidak dipakai; jangan mengembalikannya. Akun baru = kendaraan/log kosong.
2. **Stations update wajib login** (`firestore.rules:57`). Baca publik.
3. **OCR jujur.** Field tak terbaca = `null`; tanpa API key = 503 eksplisit.
   Jangan menambah fallback "cerdas" berdata palsu di `server.ts`.
4. **Statistik = agregasi `vehicleLogs`.** Dilarang angka hardcode, label
   persen statis, atau dataset contoh di chart. Data kosong → empty state.
5. **Effect terpisah:** stations `[]`, auth `[]`, sync user `[currentUser?.uid]`.
   Jangan menggantung subscription auth ke state lain (menyebabkan resubscribe).
6. **`subscribe*` selalu return `() => void`** (termasuk jalur gagal) agar
   cleanup effect aman (`dbService.ts`).
7. **Kendaraan aktif nullable.** `activeVehicle: Vehicle | null`; view yang
   butuh kendaraan hanya dirender lewat gate `needsVehicle` di `App.tsx`.
8. Bahasa UI = Indonesia. Format angka `toLocaleString('id-ID')`,
   tanggal `toLocaleDateString('id-ID', ...)`.
