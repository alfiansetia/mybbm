# Firestore mybbm

Database: ID kustom (lihat `firebase-applet-config.example.json`,
diisi dari Firebase Console; dipakai di `src/lib/firebase.ts`).

## Koleksi

| Koleksi | Kepemilikan | Akses (ringkas) |
| --- | --- | --- |
| `users/{uid}` | Per akun | get/create/update hanya pemilik (`isOwner`) |
| `vehicles/{vehicleId}` | Per akun (`userId`) | CRUD hanya pemilik |
| `fuel_logs/{logId}` | Per akun (`userId`) | CRUD hanya pemilik |
| `stations/{stationId}` | Publik bersama | Baca publik; create/update wajib login; delete tidak boleh |
| `test/connection` | — | Baca publik (cek koneksi), tulis tidak boleh |

Aturan penuh: `firestore.rules` (default-deny + catch-all).

## Skema dokumen

**`vehicles`** — `{ id, name, type: 'motor'|'mobil', brand, model, year,
engineSpec, plateNumber, primaryFuel, currentOdo, averageKmL, isArchived?, userId }`

**`fuel_logs`** — `{ id, vehicleId, dateTime (ISO), displayDate, stationName,
stationBrand, fuelType, odometer, previousOdo?, distanceKm?, isFullTank, liters,
pricePerLiter, totalAmount, paymentMethod, calculatedKmL?, costPerKm?,
efficiencyBadge?, receiptImage?, notes?, isDraft?, userId }`

**`users`** — `{ id (=uid), name, email, avatar, credibilityScore,
reputationPoints, isVerified, activeVehicleId, totalReports }`

**`stations`** — `{ id, code, name, brand, address, distanceKm, lat, lng,
queueStatus, queueEstimateText, queueMinutes, facilities[], badges?,
fuels[] ({type, ronOrCn, price, status, notes?, lastUpdated}),
lastReportMinutesAgo, contributorsCount, verifiedCount, notes?,
reports[] ({id, stationId, fuelType, status, queueStatus, notes?,
reporterName, reporterAvatar?, reporterTrustScore, isVerifiedReporter?,
timestamp, minutesAgo, upvotes, downvotes, userVoted?}) }`

## Seed SPBU

- `initialStations` di `src/data/seedData.ts` = 6 titik bootstrap
  (5 SPBU + 1 kios Madura) beserta contoh laporan.
- `subscribeStations` menulis seed **sekali** saat koleksi `stations` kosong.
- Ini data referensi publik, bukan data pribadi — dipertahankan by design.
  Kalau ingin mulai dari nol di environment baru: kosongkan koleksi
  `stations` + hapus/ubah seed di `seedData.ts` sebelum deploy pertama.

## Query & indeks

- `vehicles` / `fuel_logs`: `where('userId', '==', uid)` — filter tunggal,
  tanpa indeks komposit. Urutan log di-sort client-side (desc `dateTime`).
- `users/{uid}`: `onSnapshot` per dokumen.
- `stations`: `onSnapshot` seluruh koleksi (kecil, < 100 dokumen).

## Operasional

- Deploy rules: `firebase deploy --only firestore:rules`
- Reset data user dari UI (tab Akun) menghapus `vehicles` + `fuel_logs`
  miliknya dan mereset statistik profil; `stations` tidak tersentuh.
- Jangan simpan API key di dokumen — kunci hanya di env server (`.env`).
