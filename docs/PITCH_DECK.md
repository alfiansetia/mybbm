# Pitch Deck Outline myBBM — Road to DevFest Jakarta 2026

12 slide. Feed file ini ke generator slide (Gamma/Canva/AI slides) atau
jadikan speaker notes. Export final: PDF + PPTX, backup di flashdisk.
Rasio 16:9, font Plus Jakarta Sans, warna utama `#006194`, aksen `#ee2737`.

---

## Slide 1 — Cover

- Judul: **myBBM — Peta Stok BBM Live + Scan Struk AI**
- Sub: Road to DevFest Jakarta 2026 · Solo
- Visual: logo pompa (favicon.svg) + QR ke `/landing` + QR ke Live URL
- Notes: "Jangan antre 20 menit untuk SPBU yang kosong."

## Slide 2 — Problem (Impact 20%)

- Tidak ada API publik stok BBM real-time di Indonesia
- Antre 15–20 menit → ternyata Pertalite habis (waktu + bensin terbuang)
- Catat konsumsi manual merepotkan, struk langsung dibuang
- Visual: foto antrean SPBU + kutip keluhan komuter/ojek

## Slide 3 — Solution & MVP

- Peta live SPBU (cap "x menit lalu", jujur "belum ada data")
- Scan struk AI → form otomatis + jadi laporan stok
- Analitik km/L, tren 6 bulan, servis reminder, CSV armada
- Trust: mulai 0 vote, cooldown + penalti spam
- Visual: 3 screenshot HP (peta / scan / statistik)

## Slide 4 — Live Demo Flow (Demo Readiness 15%)

- `/landing` → `/` (guest, Lihat peta dulu) → Cek SPBU → Scan struk → Vote → Statistik → CSV
- Catatan: full live, tanpa video; siapkan akun demo + struk contoh
- Visual: flowchart 5 langkah + URL live besar

## Slide 5 — Architecture (Feasibility 20%)

- Frontend: React 19 + Vite + Tailwind SPA, PWA installable
- Backend: Express (`server.ts`) serve `dist/` + `/api/scan-receipt`, `/api/health`
- Data: Firebase Auth + Firestore (user strictly owner-scoped, stations public-read)
- Deploy: Cloud Run `asia-southeast2` scale-to-zero via `cloudbuild.yaml`
- Visual: diagram client → Cloud Run → Firebase/Gemini

## Slide 6 — AI Implementation (Feasibility + Innovation 25%)

- Gemini Flash vision, server-side only (key tidak ke klien)
- Downscale 1600px, strict-JSON-only, temp 0, null-bukan-tebakan
- Validasi vs kapasitas tangki, payment → Cash/Cashless
- Gagal jujur: 503/502/400 + fallback manual
- Visual: contoh JSON in/out + badge confidence

## Slide 7 — Secure: Guardrails & Token

- Firestore default-deny; stations tulis wajib login; delete dilarang
- Cooldown server-enforced + penalti net ≤ −3
- PII: struk tanpa identitas; `.env` gitignored; Secret Manager runtime-only
- Token opt: downscale, temp 0, no history, field minimal
- Visual: tabel guardrail vs risiko

## Slide 8 — Market & Validation

- Target: 100JT+ motor; awal Jabodetabek komuter + ojek/logistik
- Fleet SME 5–50 kendaraan; lalu konsumen data (logistik, agregator)
- Metrik: % SPBU fresh <60 mnt, scan-to-report rate, DAU/WAU, fleet MRR
- Validasi: pilot komunitas + fleet (rencana 4–8 minggu)

## Slide 9 — Business Model

1. Data API stok BBM (per-call / per-wilayah) — moat utama
2. Fleet dashboard per-kendaraan/bulan
3. Promo placement terkurasi
4. Freemium + scan-credit packs (cover biaya model)
- Sequence: gratis → network → fleet bayar → API monetize

## Slide 10 — Competition (Uniqueness 5%)

| Kompetitor | Tahu lokasi | Tahu stok live | Scan AI | Analitik |
| --- | --- | --- | --- | --- |
| Google Maps | ✅ | ❌ | ❌ | ❌ |
| MyPertamina | parsial | ❌ | ❌ | ❌ |
| Catat-BBM manual | ❌ | ❌ | ❌ | parsial |
| **myBBM** | ✅ | ✅ | ✅ | ✅ |

## Slide 11 — Roadmap (Novelty 5%)

- Q4 2026: stabilisasi + 3 fleet pilot + coverage Jabodetabek
- Q1 2027: agregasi wilayah, skor SPBU, data API beta
- Q2 2027: monetisasi API + ekspansi Jawa
- Visual: timeline 3 kuartal

## Slide 12 — Ask & Links

- Butuh: fleet pilot + validator komunitas + mentor data partnership
- Link: Live URL · Landing · Repo · Demo 3' · Deep-dive 15' · Deck PDF
- Penutup: "Mari buka data BBM Indonesia." + kontak
- Visual: QR semua link + logo DevFest

---

## Appendix (cadangan Q&A)

- A1: Contoh request/response `/api/scan-receipt` + error matrix
- A2: Skema Firestore + rules ringkas
- A3: Estimasi biaya Cloud Run + Gemini per 1K scan
- A4: Screenshot cooldown + penalti + ekspor CSV
