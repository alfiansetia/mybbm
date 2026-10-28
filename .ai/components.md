# Komponen reusable (untuk AI)

## Katalog — pakai yang ada dulu sebelum bikin baru

| Komponen | File | Props inti | Kapan dipakai |
| --- | --- | --- | --- |
| `TopHeader` | `src/components/TopHeader.tsx` | `currentSubtitle, activeVehicle: Vehicle\|null, allVehicles, onSelectVehicle, userProfile, onOpenAccount, onOpenVehicleModal` | Header semua tab login. `activeVehicle null` → pill "Tambah kendaraan" |
| `BottomNav` | `src/components/BottomNav.tsx` | `activeTab, onChangeTab` | Navigasi 5 tab + FAB `Catat` di tengah. Sembunyikan saat `DetailSpbuView` terbuka |
| `ReputationBadge` | `src/components/ReputationBadge.tsx` | `credibilityScore, size?: xs\|sm\|md\|lg, showLabel?, showScore?, className?` | Skor/reputasi user atau reporter. Selalu sertakan `title` (sudah ada) |
| `ServiceAlertBanner` | `src/components/ServiceAlertBanner.tsx` | `vehicle, logs, serviceStatus, onNavigateToStats` | Peringatan servis di Beranda |
| `StationMap` | `src/components/StationMap.tsx` | Lihat `StationMapProps` di file | Peta SPBU (Leaflet + Google Maps) |
| `LoginGate` | `src/App.tsx` (lokal, tidak diekspor) | `onLogin` | Satu-satunya tampilan tamu |
| `EmptyVehicleState` | `src/App.tsx` (lokal, tidak diekspor) | `onAdd` | Akun login tanpa kendaraan + butuh kendaraan |

## Aturan membuat komponen baru

1. **Cek katalog dulu.** Badge skor → `ReputationBadge`; navigasi → `BottomNav`.
   Duplikasi pola visual tanpa reuse = ditolak.
2. **Props eksplisit + TypeScript.** `interface XProps`, `React.FC<XProps>`,
   tidak ada `any`. Callback bernama `on...` (`onSelectStation`, `onSaveLog`).
3. **Nullable, bukan dummy.** Butuh data yang mungkin kosong → tipe `| null`
   + empty state di dalam komponen, jangan default ke contoh ("SPBU ...", "Budi").
4. **Ikon = Material Symbols Outlined** via `<span className="material-symbols-outlined ...">nama_ikon</span>`;
   ikon terisi penuh tambah `style={{ fontVariationSettings: "'FILL' 1" }}`.
   Contoh pola: `TopHeader.tsx`, `BottomNav.tsx`, `ReputationBadge.tsx:86-92`.
5. **Ukuran sentuh** minimal `h-10`/`min-h-[44px]` untuk tombol bawah;
   FAB pola `BottomNav.tsx:53-60`.
6. **Aksesibilitas minimum:** `type="button"` di semua button non-submit,
   `aria-label` untuk tombol ikon saja, `alt` untuk `<img>`.
7. **Animasi masuk** konsisten: `animate-in fade-in duration-150`
   (kadang + `zoom-in-95`) di root view/komponen overlay.
8. **Modal pola `CatatBbmView`**: overlay `fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50
   flex items-center justify-center p-4` + kartu `bg-white rounded-2xl p-5 shadow-2xl`.
9. **List scroll horizontal** (pills/tab) selalu + `no-scrollbar`.
10. **Safe-area:** root memakai `pt-safe` (header) / `pb-safe` (konten bawah + nav).
