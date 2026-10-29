# myBBM — Community-Powered Fuel Finder with AI Receipt Scanning

- **Tagline:** Live fuel-stock map crowdsourced + AI receipt scan for Indonesian drivers.
- **Live URL:** https://mybbm-773235037448.asia-southeast2.run.app
- **Landing Page URL:** https://mybbm-773235037448.asia-southeast2.run.app/landing (static checkpoint; onboarding in-app tetap di `/` untuk guest via `src/views/LandingView.tsx`)
- **Repository:** https://github.com/alfiansetia/mybbm
- **Short Demo Video (<= 3 min):** https://youtu.be/KHxfjD562pA
- **Technical Deep-Dive Video (<= 15 min):** [TODO]
- **Presentation Deck:** [myBBM Pitch Deck (PDF)](<./myBBM — Pitch Deck Ringkas _ Road to DevFest Jakarta 2026.pdf>) + [HTML Slides](./pitch-deck.html)

## 1. Problem Statement

Indonesia has no public real-time fuel-availability API — not from operators, not from map providers. Drivers queue 20 minutes only to learn Pertalite just ran out. Station locations exist on maps, but live stock/queue status does not. myBBM builds this missing data layer bottom-up: station base from public map data, live status from the community, made effortless by AI receipt scanning and kept honest by a trust-weighted reputation system.

Target audience: 100M+ Indonesian motorists (priority: daily commuters & ojek/logistics drivers in Jabodetabek), fleet SMEs (5–50 vehicles), and later data consumers (logistics, map aggregators, station operators).

## 2. Solution & Core Features

| Area | MVP |
| --- | --- |
| Live map | Nearby SPBU (Pertamina, Shell, BP, Vivo) with community stock/queue status stamped "x minutes ago"; no report = honest "no data yet" |
| AI scan (FAB Catat) | Photo of receipt → auto-fill fuel log (station, fuel, liters, price/L, total, payment) via Gemini vision; every scan doubles as fresh stock report |
| Personal analytics | Consumption km/L, 6-month trends, cash vs cashless breakdown, service reminders, CSV export |
| Trust system | Reporter reputation from peer votes, reports start at 0 votes, cooldown + score penalties for spam, weighted consensus (recency × trust × votes) |
| Offline baseline | `localStorage` cache, realtime Firestore sync when online; PWA installable |

## 3. Architecture & Tech Stack

- **Frontend / Client:** React 19 + Vite 8 + Tailwind 4 SPA (`src/`), Recharts, Leaflet + Google Maps; PWA (`manifest` + Workbox).
- **Backend / Microservices:** Express (`server.ts`) serves `dist/` + JSON API (`POST /api/scan-receipt`, `GET /api/health`); same codebase runs locally, in Docker, on Cloud Run.
- **Data:** Firebase Auth (Google) + Firestore. User data (vehicles, logs, profiles) strictly owner-scoped; `stations` public-read, write only when logged in. Map discoveries cached create-only, never overwriting community data.
- **AI / LLM Integration:** Gemini vision (`gemini-3.8-flash`, `GEMINI_MODEL` overridable) behind server-side `/api/scan-receipt` — API key never ships to client. Client downscales photos to 1600px (cheaper+faster), model prompted strict-JSON-only with temperature 0 and `null`-instead-of-guessing; non-receipt photos (confidence 0) rejected. Numbers clamped against registered tank capacity; payment text normalized to Cash vs Cashless.
- **Security & Guardrails:** Firestore default-deny rules + server-enforced report cooldown; token optimization (1600px downscale, temp 0, strict JSON, no chat history); PII: receipts contain no owner identity, user data never leaves owner scope, `.env` gitignored + `.dockerignore`d; `GEMINI_API_KEY` runtime-only (Secret Manager recommended for serious prod).
- **Deployment & Ops:** Google Cloud Run (`asia-southeast2`, scale-to-zero) via `cloudbuild.yaml` (bake `VITE_*` as `--build-arg`, set `GEMINI_*` as runtime vars). Trigger `mybbm-with-env` (manual). See `DEPLOY.md`.

## 4. Local Setup & Reproduction Steps

```bash
# Clone the repo
git clone https://github.com/alfiansetia/mybbm.git
cd mybbm

# Setup environment variables
cp .env.example .env   # isi VITE_FIREBASE_*, VITE_GOOGLE_MAPS/PLACES_API_KEY, GEMINI_API_KEY

# Run locally (butuh --legacy-peer-deps karena vite@8 vs esbuild peer conflict)
npm install --legacy-peer-deps
npm run dev            # http://localhost:3000
```

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `GEMINI_API_KEY` | Opsional | Tanpa ini scan return 503 jujur + isi manual |
| `GEMINI_MODEL` | Opsional | Default `gemini-3.8-flash` |
| `VITE_FIREBASE_*` | Wajib utk login/data | Dari Firebase Console → Project settings |
| `VITE_GOOGLE_MAPS_API_KEY` / `VITE_GOOGLE_PLACES_API_KEY` | Opsional | Tanpa ini peta fallback Leaflet/OSM |
| `PORT` | Opsional | Default `3000` (Cloud Run inject `8080` otomatis) |

Skrip: `npm run dev` (Express+Vite), `npm run build` (ke `dist/`), `npm run start` (serve prod), `npm run lint` (`tsc --noEmit`).

Deploy produksi: ikut `DEPLOY.md` (Cloud Build trigger + substitutions) atau satu perintah Cloud Shell — lihat `docs/PENGEMBANGAN.md`.

## Docs

- `docs/ARSITEKTUR.md`, `docs/FIRESTORE.md`, `docs/API.md`, `docs/PENGEMBANGAN.md`, `DEPLOY.md`, `SUBMISSION.md`
