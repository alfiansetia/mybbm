# Arsitektur mybbm

## Gambaran alur

```
[Tamu] ── buka app ──> LoginGate (wajib Google login, tanpa data dummy)
   │
[Login] ── onAuthStateChanged ──> subscribe per-uid:
   │          users/{uid} · vehicles (where userId) · fuel_logs (where userId)
   │          stations (publik, tanpa filter)
   ▼
[State App.tsx] ── tampil tab ──> Beranda / Cek BBM / Catat / Statistik / Akun
   │                                   │
   │ offline: localStorage             │ tulis: setDoc merge → Firestore
   │ (`mybbm_*`, versi v2-per-user)    │ lapor SPBU / vote / tambah kendaraan
```

- **Belum login** → hanya `LoginGate`. Tidak ada state user yang dimuat.
- **Login, belum punya kendaraan** → `EmptyVehicleState` + CTA ke tab Akun
  (form tambah kendaraan ada di `AkunView`).
- **Logout** → state user dikosongkan + cache `mybbm_vehicles/active_vehicle/logs/user`
  dihapus agar tidak bocor ke akun berikutnya di perangkat yang sama.

## Modul

| Lokasi | Peran |
| --- | --- |
| `src/App.tsx` | Auth gate, 3 effect terpisah (stations / auth / sync per-uid), handler simpan lapor/vote/export CSV, `LoginGate` + `EmptyVehicleState` |
| `src/services/dbService.ts` | `subscribeStations/Vehicles/Logs/UserProfile`, `save*/update*/delete*`. Tiap subscribe selalu return fungsi unsubscribe (aman untuk cleanup effect) |
| `src/lib/firebase.ts` | Init app, `auth`, `db` (pakai `firestoreDatabaseId` kustom), `handleFirestoreError` terstruktur, `testConnection` |
| `src/views/*` | 6 layar sesuai tab + detail SPBU |
| `src/components/*` | `TopHeader` (kendaraan aktif nullable), `BottomNav` (5 tab + FAB Catat), `StationMap`, `ReputationBadge`, `ServiceAlertBanner` |
| `src/utils/reputation.ts` | `calculateReporterScore` + tier reputasi pelapor |
| `src/utils/serviceTracker.ts` | Interval servis (motor 3000 km / mobil 5000 km), sisa km, progres, estimasi harian dari log |
| `src/data/seedData.ts` | **Hanya** seed bootstrap SPBU publik (`initialStations`) + auto-seed sekali saat koleksi kosong. Tidak ada seed kendaraan/log/profil user |
| `server.ts` | `POST /api/scan-receipt`, `GET /api/health`, serve `dist/` saat produksi |

## Keputusan desain penting

1. **Effect terpisah, bukan satu effect raksasa.** Stations (publik, sekali),
   auth listener (sekali), dan sync per-user (`[currentUser?.uid]`). Dulu auth
   effect depend ke `activeVehicleId` sehingga resubscribe tiap ganti kendaraan.
2. **Cloud kosong = kosong.** Tidak ada penyalinan dummy lokal ke Firestore.
   (Dulu: kendaraan lokal di-seed ke cloud saat koleksi kosong.)
3. **Stations update butuh login** (`firestore.rules`). Baca tetap publik.
4. **OCR tanpa karangan.** Lihat `docs/API.md` — field tak terbaca = `null`,
   tanpa AI = HTTP 503 eksplisit.
5. **Statistik dihitung, bukan ditempel.** Tren 6 bulan, komposisi brand/BBM,
   SPBU terhemat, dan kartu servis semuanya agregasi `vehicleLogs` + empty state.
