# API backend mybbm (`server.ts`)

Base URL lokal: `http://localhost:3000`. Model default `gemini-2.0-flash`,
bisa dioverride via env `GEMINI_MODEL`.

## `GET /api/health`

Cek status + apakah kunci Gemini terpasang.

```json
{ "status": "ok", "service": "mybbm-backend", "hasGeminiKey": false,
  "timestamp": "2026-10-28T13:30:50.385Z" }
```

## `POST /api/scan-receipt`

OCR struk SPBU via Gemini multimodal.

Request:

```json
{ "imageBase64": "data:image/jpeg;base64,...", "mimeType": "image/jpeg" }
```

Sukses (`200`) — selalu dari AI asli, tanpa karangan:

```json
{ "success": true, "source": "gemini-ai", "isFallback": false,
  "data": { "stationName": "SPBU ...", "stationBrand": "Pertamina",
    "address": null, "dateTime": null, "fuelType": "Pertalite",
    "liters": 3.8, "pricePerLiter": 10000, "totalAmount": 38000,
    "paymentMethod": null, "confidence": 96, "transactionNumber": null } }
```

- Field yang tidak terbaca = `null` (bukan tebakan harga resmi).
- Frontend (`CatatBbmView`) hanya mengisi form bila `success && data &&
  !isFallback`; angka dicek `!= null` sebelum dipakai.

Gagal:

| Status | Arti |
| --- | --- |
| `400` | `imageBase64` kosong (`source: validation`) |
| `502` | AI error saat membaca (`source: gemini-error`) |
| `503` | `GEMINI_API_KEY` belum dikonfigurasi (`source: heuristic-unavailable`) |

Semua respons gagal berbentuk:

```json
{ "success": false, "source": "heuristic-unavailable", "isFallback": true,
  "error": "GEMINI_API_KEY belum dikonfigurasi. ...", "data": null }
```

UI menampilkan `error` sebagai peringatan kuning dan membiarkan user isi
manual / pakai contoh struk. Tidak ada lagi "OCR lokal" berdata palsu.
