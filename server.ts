import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));

// Initialize Google GenAI client if API key is provided
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Receipt OCR API using Gemini Multimodal
// Model bisa dioverride via env GEMINI_MODEL (default: gemini-3.8-flash)
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

app.post('/api/scan-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        source: 'validation',
        isFallback: false,
        error: 'Data gambar struk diperlukan (base64 string)',
        data: null,
      });
    }

    // Clean base64 header if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    if (!aiClient) {
      // Jujur: AI tidak tersedia, jangan kirim data palsu seolah hasil OCR.
      // Pesan ramah-user (tanpa istilah env/key); detail dev hanya di log server.
      console.warn('[scan-receipt] GEMINI_API_KEY belum dikonfigurasi di environment server.');
      return res.status(503).json({
        success: false,
        source: 'heuristic-unavailable',
        isFallback: true,
        error: 'Layanan scan AI belum aktif. Silakan isi manual atau pakai contoh struk.',
        data: null,
      });
    }

    try {
      const prompt = `Kamu adalah sistem OCR AI presisi tinggi untuk struk pengisian bahan bakar (SPBU) di Indonesia (Pertamina, Shell, Vivo, BP, atau Kios Eceran/Pertamini).
Analisis gambar struk ini dan ekstrak data berikut dalam format JSON strictly valid:
- stationName: string | null (contoh: "SPBU Pertamina 31.12802" atau "Shell MT Haryono")
- stationBrand: string | null ("Pertamina", "Shell", "Vivo", "BP", "Other (Toko Madura)", atau "Lainnya")
- address: string | null (alamat singkat jika terbaca)
- dateTime: string | null (tanggal dan waktu pengisian, contoh: "17 Okt 2026, 08:45 WIB" atau format ISO)
- fuelType: string | null ("Pertalite", "Pertamax", "Pertamax Turbo", "Solar", "Bio Solar", "Dexlite", "Shell Super", "Shell V-Power", "BP 92", dll)
- liters: number | null (jumlah liter terisi dengan desimal, misal 3.80)
- pricePerLiter: number | null (harga satuan per liter dalam rupiah, misal 10000)
- totalAmount: number | null (total bayar dalam rupiah, misal 38000)
- paymentMethod: string | null ("QRIS / MyPertamina", "Tunai", "Debit BCA", "Kartu Kredit", dll)
- confidence: number | null (perkiraan akurasi pembacaan 0-100)
- transactionNumber: string | null (nomor transaksi atau invoice jika ada)

Jika bagian teks buram atau tidak terbaca, isi dengan null — JANGAN mengarang. Kembalikan HANYA JSON.`;

      const response = await aiClient.models.generateContent({
        model: GEMINI_MODEL,
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
        },
      });

      const rawText = response.text?.trim() || '{}';
      const parsed = JSON.parse(rawText);

      const toNumberOrNull = (v: unknown) => {
        if (v === null || v === undefined || v === '') return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };

      return res.json({
        success: true,
        source: 'gemini-ai',
        isFallback: false,
        data: {
          stationName: parsed.stationName ?? null,
          stationBrand: parsed.stationBrand ?? null,
          address: parsed.address ?? null,
          dateTime: parsed.dateTime ?? null,
          fuelType: parsed.fuelType ?? null,
          liters: toNumberOrNull(parsed.liters),
          pricePerLiter: toNumberOrNull(parsed.pricePerLiter),
          totalAmount: toNumberOrNull(parsed.totalAmount),
          paymentMethod: parsed.paymentMethod ?? null,
          confidence: toNumberOrNull(parsed.confidence),
          transactionNumber: parsed.transactionNumber ?? null,
        },
      });
    } catch (geminiError: any) {
      console.warn('Gemini vision API error:', geminiError?.message);
      // Jujur: gagal AI, bukan data palsu.
      return res.status(502).json({
        success: false,
        source: 'gemini-error',
        isFallback: true,
        error: 'Gagal membaca struk via AI. Coba lagi atau isi manual.',
        data: null,
      });
    }
  } catch (error: any) {
    console.error('Scan error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Gagal memproses struk BBM',
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'mybbm-backend',
    hasGeminiKey: Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY'),
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Mount Vite dev server in middleware mode
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, () => {
    console.log(`mybbm server running on port ${port}`);
  });
}

startServer();
