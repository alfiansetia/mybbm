# Submission — myBBM

## Project Title

**myBBM — Community-Powered Fuel Finder with AI Receipt Scanning**

## Description

### Overview

**The problem: live fuel-availability data does not exist in Indonesia.**
There is no public API for real-time SPBU stock levels — not from operators,
not from map providers. Every driver knows the pain: queuing for 20 minutes
only to learn Pertalite just ran out. myBBM builds this missing data layer
bottom-up: station locations are bootstrapped from public map data, and
live stock/queue status comes from the community — made effortless by AI
receipt scanning and kept honest by a trust-weighted reputation system.

On top of that live layer, myBBM is a complete driver companion:

1. **Live nearby-station map** (Pertamina, Shell, BP, Vivo) with
   community-reported stock and queue status, each stamped "x minutes ago"
   — stations with no reports honestly show "no data yet" instead of
   inventing it.
2. **AI receipt scanning** — a photo of the receipt auto-fills the fuel log
   (station, fuel, liters, price, total, payment method), and every scan
   doubles as a fresh stock report for the community.
3. **Personal analytics** — consumption (km/L), spending breakdowns
   (cash vs cashless), and service reminders.

A reputation system keeps reports honest: reporters earn trust from peer
upvotes, reports start at zero votes (no phantom votes), spammers hit
cooldowns and score penalties, and each station shows a weighted consensus
of recency × reporter trust × votes.

### Architecture

- **Frontend:** React + Vite + Tailwind SPA (Google Maps / Leaflet),
  Firebase Auth + Firestore as backend-as-a-service.
- **Data rules:** user data (vehicles, fuel logs, profiles) is strictly
  owner-scoped via security rules; station data is public-read so community
  reports benefit everyone instantly.
- **Backend:** Express server (`server.ts`) serves the app and hosts the AI
  endpoint. Same codebase runs locally (Express + Vite middleware), in Docker,
  and on Cloud Run (multi-stage `Dockerfile` included).
- **Map caching:** crowdsourced stations discovered from map data are cached
  to Firestore (create-only, never overwriting community data) so subsequent
  users skip slow loads.
- **Server-side enforcement:** Firestore security rules enforce the report
  cooldown even against direct API abuse.

### AI Implementation

- Receipt understanding uses **Google Gemini vision models**
  (`gemini-3.8-flash`) behind our own `/api/scan-receipt` endpoint —
  **the API key stays secret on the server** and is never shipped to the
  client (a direct-call fallback exists only for static hosting).
- Phone photos are downscaled to 1600px client-side before upload
  (faster + cheaper).
- The model is prompted for **strict JSON only** (station, fuel type, liters,
  price/L, total, payment method, timestamp, confidence) with temperature 0
  and explicit instructions to return `null` instead of guessing;
  non-receipt photos (confidence 0) are rejected rather than inventing data.
- Extracted numbers are validated against the vehicle's registered tank
  capacity (liters and total are clamped, never silently accepted), and
  free-text payment methods are normalized into Cash vs Cashless categories
  that feed the spending reports.

### Business Potential (Developer Revenue)

1. **Fuel-availability data API (primary moat).** The live stock/queue/price
   dataset this app crowdsources exists nowhere else. Once city coverage is
   dense, it can be licensed to logistics/fleet operators, map aggregators,
   and station operators themselves — priced per API call or per region.
2. **Fleet subscriptions (fastest cash).** The existing multi-vehicle engine,
   odometer anomaly guards, and CSV export package naturally into a paid
   web dashboard for SMEs running 5–50 vehicles (fuel control, fraud
   detection, per-vehicle cost) — per-vehicle monthly pricing.
3. **Promo placements (aligned ads).** Private fuel brands and workshops pay
   for "nearest promo station" slots and service coupons — advertising that
   helps instead of interrupts.
4. **Consumer freemium (supplement).** Advanced analytics, unlimited history,
   and exports for power users.
5. **AI scan credits (cost-backed).** Every receipt scan incurs real model
   API cost, so scan quotas monetize naturally: free tier includes a monthly
   scan allowance, with top-up credit packs or unlimited scanning bundled
   into Pro/fleet tiers — users pay for measurable AI work, not vague perks.

Sequencing: free consumer app builds the network and the dataset →
fleet dashboard validates revenue → data API monetizes at scale.
