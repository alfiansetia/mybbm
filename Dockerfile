# ---- Build stage: frontend + compile server ----
FROM node:20-slim AS build
WORKDIR /app

# VITE_* dibake ke bundle saat build — oper via --build-arg.
ARG VITE_FIREBASE_API_KEY=""
ARG VITE_FIREBASE_AUTH_DOMAIN=""
ARG VITE_FIREBASE_PROJECT_ID=""
ARG VITE_FIREBASE_STORAGE_BUCKET=""
ARG VITE_FIREBASE_MESSAGING_SENDER_ID=""
ARG VITE_FIREBASE_APP_ID=""
ARG VITE_FIRESTORE_DATABASE_ID=""
ARG VITE_GOOGLE_MAPS_API_KEY=""
ARG VITE_GOOGLE_PLACES_API_KEY=""
ARG VITE_GOOGLE_MAPS_MAP_ID=""
ARG VITE_GEMINI_MODEL="gemini-3.8-flash"
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_FIRESTORE_DATABASE_ID=$VITE_FIRESTORE_DATABASE_ID \
    VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY \
    VITE_GOOGLE_PLACES_API_KEY=$VITE_GOOGLE_PLACES_API_KEY \
    VITE_GOOGLE_MAPS_MAP_ID=$VITE_GOOGLE_MAPS_MAP_ID \
    VITE_GEMINI_MODEL=$VITE_GEMINI_MODEL

COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build
RUN npx esbuild server.ts --bundle --platform=node --format=esm \
    --outfile=server.js \
    --external:express --external:dotenv --external:@google/genai --external:vite

# ---- Runtime stage: server.js + dist + prod deps ----
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js ./server.js
EXPOSE 8080
CMD ["node", "server.js"]
