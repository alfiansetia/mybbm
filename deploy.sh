#!/usr/bin/env bash
# Deploy myBBM ke Cloud Run TANPA paste key ke console.
# Pakai:  isi .env seperti biasa (lihat .env.example) → bash deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
  echo "Belum ada .env — duplikat dulu: cp .env.example .env lalu isi."
  exit 1
fi
set -a
# shellcheck disable=SC1091
source .env
set +a

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-asia-southeast2}"
if [[ -z "${PROJECT_ID:-}" ]]; then
  echo "PROJECT_ID kosong — isi di .env.deploy atau via: gcloud config set project ID_KAMU"
  exit 1
fi
gcloud config set project "$PROJECT_ID" >/dev/null

# API + izin yang dibutuhkan sekali saja (idempotent).
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com >/dev/null
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Rahasia server → Secret Manager (rotasi tiap deploy, tak tampil di log).
if gcloud secrets describe mybbm-gemini-key --project="$PROJECT_ID" >/dev/null 2>&1; then
  printf '%s' "$GEMINI_API_KEY" | gcloud secrets versions add mybbm-gemini-key --data-file=- --project="$PROJECT_ID" >/dev/null
else
  printf '%s' "$GEMINI_API_KEY" | gcloud secrets create mybbm-gemini-key --data-file=- --replication-policy=automatic --project="$PROJECT_ID" >/dev/null
fi
for SA in "$CLOUDBUILD_SA" "$COMPUTE_SA"; do
  gcloud secrets add-iam-policy-binding mybbm-gemini-key \
    --member="serviceAccount:${SA}" --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT_ID" >/dev/null 2>&1 || true
done

# Build + deploy. Hanya VITE_* (publik) yang lewat substitutions;
# GEMINI_API_KEY diambil Cloud Run langsung dari Secret Manager.
gcloud builds submit --config cloudbuild.yaml --project="$PROJECT_ID" \
  --substitutions="_REGION=${REGION},_GEMINI_MODEL=${GEMINI_MODEL:-gemini-3.8-flash},"\
"_VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY},"\
"_VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN},"\
"_VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID},"\
"_VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET},"\
"_VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID},"\
"_VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID},"\
"_VITE_FIRESTORE_DATABASE_ID=${VITE_FIRESTORE_DATABASE_ID},"\
"_VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY},"\
"_VITE_GOOGLE_PLACES_API_KEY=${VITE_GOOGLE_PLACES_API_KEY},"\
"_VITE_GOOGLE_MAPS_MAP_ID=${VITE_GOOGLE_MAPS_MAP_ID:-DEMO_MAP_ID}" .

echo "Selesai — cek URL layanan di atas, lalu verifikasi /api/health."
