# Function & service (untuk AI)

## Katalog — pakai sebelum tulis logika sendiri

| Fungsi | File | Kegunaan |
| --- | --- | --- |
| `subscribeStations/Vehicles/Logs/UserProfile` | `src/services/dbService.ts` | Satu-satunya cara baca realtime. Selalu kembalikan unsubscribe |
| `saveVehicleToDb/saveLogToDb/saveUserProfileToDb/updateStationInDb` | `src/services/dbService.ts` | Tulis via `setDoc merge`. Sertakan `userId: uid` untuk data milik user |
| `deleteVehicleFromDb/deleteLogFromDb` | `src/services/dbService.ts` | Hapus (dipakai reset data) |
| `loginWithGoogle/logoutUser/onAuthStateChanged` | `src/lib/firebase.ts` | Auth; `onAuthStateChanged` jangan dibungkus ulang |
| `testConnection` | `src/lib/firebase.ts` | Cek Firestore saat mount (sekali) |
| `handleFirestoreError(err, op, path)` | `src/lib/firebase.ts` | Penanganan error Firestore terstruktur (throw). Pakai ini, jangan `console.error` mentah |
| `calculateReporterScore(base, up, down, total)` | `src/utils/reputation.ts` | Skor 1.0–5.0; downvote bobot 1.5x |
| `getReputationTier(score)` / `REPUTATION_TIERS` | `src/utils/reputation.ts` | Tier badge (Master ≥4.8, Terpercaya ≥4.5, Aktif ≥3.5, Baru ≥1.0) |
| `computeAggregatedStatus(reports, fuel?)` | `src/utils/reputation.ts` | Status dominan berbobot (recency × trust × vote); `Terbatas` saat ambigu |
| `getStationPinStatus(station, filter?)` | `src/utils/reputation.ts` | Warna pin peta: green/amber/red/brown + label + hex |
| `ServiceTracker.evaluateServiceStatus(vehicle, logs, baseline?)` | `src/utils/serviceTracker.ts` | Sisa km servis, progres, estimasi hari, checklist per tipe |
| `ServiceTracker.getServiceInterval(type)` | `src/utils/serviceTracker.ts` | Motor 3000 km, mobil 5000 km — jangan hardcode angka di view |

## Konvensi function

1. **Util murni.** `src/utils/*` dilarang import firebase/react/I-O.
   Butuh `localStorage` (mis. baseline servis) → baca di komponen, oper sebagai argumen
   (pola `StatistikView`: baca `mybbm_last_service_*` lalu panggil util).
2. **Hasil agregat, bukan konstanta.** Butuh rata-rata/total/distribusi →
   `reduce/filter` dari data + `useMemo` bila di render. Angka contoh di view = bug.
3. **ID baru:** kendaraan `veh-${Date.now()}`, log `log-${Date.now()}`,
   laporan `rep-${Date.now()}` (pola di `App.tsx`).
4. **Simpan selalu bawa `userId`.** `saveVehicleToDb({...v, userId: uid})` —
   rules menolak dokumen tanpa `userId == auth.uid`.
5. **Optimistic update + persist.** Ubah state lokal dulu, lalu `await` tulis
   Firestore (pola `handleSaveLog`, `handleSubmitReport`, `handleVoteReport`).
6. **Reputasi hanya lewat util.** Lapor baru +15 poin; skor via
   `calculateReporterScore`. Jangan rumus sendiri di view.
7. **Tanggal/angka ID di boundary.** Simpan ISO (`new Date().toISOString()`);
   format `id-ID` hanya saat render. Uang: angka mentah di state, format saat tampil.
8. **CSV:** header tetap sesuai `handleExportCSV` (`App.tsx`); tambah kolom =
   tambah header + mapping baris, jangan ubah urutan lama.
