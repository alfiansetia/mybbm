# .ai — Panduan AI untuk codebase mybbm

Folder ini adalah sumber kebenaran bagi AI assistant yang mengerjakan repo ini.
Aturan di sini mengikat: bila ragu, ikuti `.ai`, bukan kebiasaan umum.

| File | Isi |
| --- | --- |
| `architecture.md` | Peta modul, alur data, keputusan desain yang tidak boleh dilanggar |
| `components.md` | Katalog komponen reusable + aturan membuat komponen baru |
| `functions.md` | Katalog util/service + konvensi function |
| `styles.md` | Token desain + pola style baku (card, tombol, form, badge, empty state) |

Prinsip global:

1. Data user tidak pernah di-seed. Kosong = kosong + empty state + CTA.
2. Jangan mengarang data di UI maupun API (lihat `docs/API.md`).
3. Mobile-first 480px (`max-w-[480px]`), Bahasa Indonesia di seluruh UI.
4. `tsc --noEmit` harus bersih sebelum selesai.
