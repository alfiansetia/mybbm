import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ReceiptScanResult {
  stationName?: string;
  stationBrand?: string;
  fuelType?: string;
  liters?: number;
  pricePerLiter?: number;
  totalAmount?: number;
  paymentMethod?: string;
  dateTime?: string;
  /** 0–100, seberapa yakin AI membaca struk ini. */
  confidence?: number;
}

export type ReceiptScanErrorCode = 'NO_KEY' | 'BAD_IMAGE' | 'AI_ERROR' | 'NO_DATA';

export class ReceiptScanError extends Error {
  code: ReceiptScanErrorCode;
  constructor(code: ReceiptScanErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-3.8-flash';

export function isReceiptAiConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GEMINI_API_KEY);
}

/**
 * Kecilkan foto struk HP (umumnya 3–12 MP) jadi max 1600px JPEG.
 * Lebih cepat diupload, lebih murah, dan cukup jelas untuk dibaca AI.
 */
export function prepareReceiptImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1600;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const base64 = dataUrl.split(',')[1];
      if (!base64) {
        reject(new ReceiptScanError('BAD_IMAGE', 'Foto tidak bisa diproses. Coba foto lain.'));
        return;
      }
      resolve({ base64, mimeType: 'image/jpeg' });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ReceiptScanError('BAD_IMAGE', 'File bukan gambar yang valid.'));
    };
    img.src = url;
  });
}

const PROMPT = `Baca foto struk/bukti pembayaran SPBU Indonesia ini dan kembalikan HANYA JSON valid (tanpa markdown, tanpa penjelasan) dengan field:
{
  "stationName": "nama SPBU persis seperti di struk, cth 'SPBU 31.12802 MT Haryono'",
  "stationBrand": "salah satu: Pertamina, Shell, Vivo, BP, atau Lainnya",
  "fuelType": "nama BBM, cth Pertalite/Pertamax/Turbo/Dexlite/Shell Super",
  "liters": angka volume liter (cth 3.8),
  "pricePerLiter": angka rupiah per liter tanpa titik/koma (cth 10000),
  "totalAmount": angka total bayar rupiah (cth 38000),
  "paymentMethod": "salah satu: Tunai, QRIS, E-Wallet, Kartu Debit, Kartu Kredit, MyPertamina",
  "dateTime": "waktu transaksi ISO bila terbaca, kalau tidak ada null",
  "confidence": "0-100: keyakinanmu hasil bacaan ini benar"
}
Field yang tidak terbaca = null. Jangan mengarang angka. Kalau foto BUKAN struk SPBU, kembalikan {"confidence": 0}.`;

/** Kirim struk ke Gemini dan kembalikan data terstruktur. Throw ReceiptScanError bila gagal. */
export async function scanReceiptImage(
  base64: string,
  mimeType: string
): Promise<ReceiptScanResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    // Pesan ramah-user; instruksi dev hanya masuk console + .env.example.
    console.warn(
      '[Gemini] VITE_GEMINI_API_KEY kosong — scan AI nonaktif. ' +
        'Dev: isi di .env lalu restart vite (lihat .env.example).'
    );
    throw new ReceiptScanError(
      'NO_KEY',
      'Scan AI belum aktif di aplikasi ini. Isi manual atau pakai contoh struk di bawah.'
    );
  }

  let text: string;
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: { responseMimeType: 'application/json', temperature: 0 },
    });
    const res = await model.generateContent([
      { text: PROMPT },
      { inlineData: { data: base64, mimeType } },
    ]);
    text = res.response.text();
  } catch (err) {
    console.warn('[Gemini] scan gagal:', err);
    throw new ReceiptScanError(
      'AI_ERROR',
      'AI gagal membaca struk (koneksi/key/quota). Coba lagi atau isi manual.'
    );
  }

  let parsed: ReceiptScanResult;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.warn('[Gemini] respons bukan JSON:', text?.slice(0, 200));
    throw new ReceiptScanError('AI_ERROR', 'AI mengembalikan jawaban aneh. Coba foto ulang yang lebih jelas.');
  }

  if (!parsed || (parsed.confidence ?? 0) <= 0) {
    throw new ReceiptScanError(
      'NO_DATA',
      'Foto ini sepertinya bukan struk SPBU. Pastikan struk terlihat jelas lalu coba lagi.'
    );
  }
  return parsed;
}
