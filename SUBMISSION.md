# Submission — myBBM

## Project Title

**myBBM — Community-Powered Fuel Finder with AI Receipt Scanning**

## Description

### Overview

Finding fuel in Indonesia is harder than it should be: prices differ per station,
stock runs out without notice, and drivers still track spending in notebooks.
myBBM is a mobile-first web app that solves this with three pillars:

1. **Live nearby-station map** (Pertamina, Shell, BP, Vivo) with
   community-reported stock and queue status.
2. **AI receipt scanning** — a photo of the receipt auto-fills the fuel log
   (station, fuel, liters, price, total, payment method).
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
