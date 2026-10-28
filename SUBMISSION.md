# Submission — myBBM

## Project Title

**myBBM — Community-Powered Fuel Finder with AI Receipt Scanning**

## Project Summary

### Problem & Audience

**Live fuel-availability data does not exist in Indonesia.** No public API
for real-time SPBU stock levels — not from operators, not from map providers.
Every driver knows the pain: queuing 20 minutes only to learn Pertalite just
ran out. Target: 100M+ Indonesian motorists (first: Jabodetabek commuters and
ojek/logistics drivers), fleet SMEs (5–50 vehicles), later data consumers
(logistics, map aggregators, station operators).

myBBM builds this missing data layer bottom-up: station locations bootstrapped
from public map data, live stock/queue status from the community — made
effortless by AI receipt scanning, kept honest by a trust-weighted reputation
system. On top: live nearby-station map (Pertamina, Shell, BP, Vivo, each
stamped "x minutes ago", "no data yet" instead of invented data), receipt
photo → auto-filled fuel log that doubles as a stock report, and personal
analytics (km/L, cash vs cashless, service reminders, CSV export). Reports
start at zero votes, spammers hit cooldowns and score penalties, stations show
a weighted consensus of recency × trust × votes.

### Architecture

React + Vite + Tailwind SPA (Google Maps / Leaflet, PWA) with Firebase Auth +
Firestore: user data strictly owner-scoped via security rules, station data
public-read so reports benefit everyone instantly. Express (`server.ts`) serves
the app and hosts the AI endpoint — same codebase runs locally, in Docker, and
on Cloud Run (`asia-southeast2`, scale-to-zero). Discovered stations are cached
create-only, never overwriting community data; report cooldown is enforced
server-side even against direct API abuse.

### AI Tools

Google Gemini vision (`gemini-3.8-flash`) behind our own `/api/scan-receipt`
endpoint — key stays secret on the server, never shipped to the client. Photos
downscaled to 1600px before upload (faster + cheaper); model prompted strict
JSON-only at temperature 0 with `null`-instead-of-guessing, non-receipt photos
rejected. Numbers are clamped against registered tank capacity; payment text
normalized to Cash vs Cashless for spending reports.

### Impact & Business

Success metrics: report coverage (% stations with fresh <60-min data),
scan-to-report conversion, DAU/WAU retention, fleet pilot MRR. Revenue path:
(1) fuel-availability data API licensed per call/region (primary moat);
(2) fleet dashboard subscriptions per vehicle; (3) aligned promo placements;
(4) consumer freemium + AI scan-credit packs covering real model cost.
Sequence: free app builds network and dataset → fleet validates revenue →
data API monetizes at scale.
