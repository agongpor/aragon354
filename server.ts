import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini AI client helper to avoid crashes if API key is not present initially
let aiInstance: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required for Gemini AI features.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// API endpoint for Gemini translation
app.post("/api/translate-gemini", async (req: Request, res: Response) => {
  try {
    const { text, preset, customRules, direction } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Input teks tidak boleh kosong." });
    }

    const ai = getGemini();
    const isReverse = direction === "pegon-to-latin";

    const systemPrompt = isReverse
      ? `Anda adalah ahli bahasa linguistik Indonesia dan daerah (Jawa/Sunda) yang menguasai sistem penulisan abjad Arab Pegon dan Arab Melayu (Jawi).
Tugas Anda adalah melakukan transliterasi balik dari teks bertulisan aksara Arab Pegon (atau Jawi) menjadi teks Latin bahasa Indonesia yang tepat, baku, dan natural.
Silakan tebak dan kembalikan vokal tersembunyi seperti pepet (e), perbaiki ejaan sesuai KBBI (Kamus Besar Bahasa Indonesia), dan pisahkan kata dengan benar.

ATURAN REFERENSI KUSTOM:
Prioritaskan aturan penulisan kustom ini jika ada kecocokan kata:
${JSON.stringify(customRules || [], null, 2)}

Harap berikan respons sebagai objek JSON dengan format schema berikut:
{
  "translation": "teks latin hasil pembacaan",
  "explanation": "penjelasan mengenai perakitan kata, pembacaan vokal pepet, atau arti serapan kata"
}`
      : `Anda adalah ahli bahasa linguistik dan kaligrafi tradisional Indonesia yang menguasai sistem penulisan Arab Melayu (Jawi) dan Arab Pegon Jawa/Sunda.
Tugas Anda adalah melakukan transliterasi teks Latin bahasa Indonesia menjadi tulisan Arab yang sesuai dengan standar pilihan pengguna secara akurat, kontekstual, dan rapi.

PILIHAN FORMAT:
- "jawi" (Arab Melayu): Gunakan kaidah baku Arab Melayu. Perhatikan penggunaan huruf saksi (alif, ya, wawu), penghapusan vokal di suku kata tertutup, huruf k ganda/glottal stop sebagai qaf di akhir kata (seperti 'bapak' -> 'باڤق'), imbuhan terikat (di-, se-, ke-) yang disatukan, serta penulisan kata serapan Arab kustom.
- "pegon" (Arab Pegon Jawa/Sunda): Tulis secara fonetis lengkap menggunakan huruf saksi Pegon tradisional, termasuk menyemir vokal i, u, o, dan e secara jelas.

ATURAN REFERENSI KUSTOM:
Pengguna telah memasukkan aturan referensi kustom di bawah ini. Prioritaskan aturan dan kesepakatan penulisan kata ini jika diberikan:
${JSON.stringify(customRules || [], null, 2)}

Harap berikan respons sebagai objek JSON dengan format schema berikut:
{
  "translation": "teks arab terjemahan",
  "explanation": "penjelasan aturan penulisan yang diterapkan"
}`;

    const prompt = isReverse
      ? `Lakukan transliterasi teks Arab Pegon/Jawi berikut kembali menjadi teks alfabet Latin Bahasa Indonesia yang baku.

Teks Arab:
"${text}"`
      : `Lakukan transliterasi teks Latin Indonesia berikut menjadi tulisan Arab berformat "${preset || "pegon"}".

Teks Latin:
"${text}"

Tulis hasilnya dalam bahasa Arab yang rapi dengan arah Right-to-Left (RTL) yang sempurna menggunakan huruf-huruf Arab Jawi/Pegon seperti چ, ڠ, ݢ, ڽ, ڤ.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translation: {
              type: Type.STRING,
              description: isReverse ? "Hasil pembacaan aksara ke teks Latin biasa." : "Hasil transliterasi Arab Melayu / Pegon.",
            },
            explanation: {
              type: Type.STRING,
              description: "Penjelasan linguistik dan detail ejaan yang digunakan.",
            },
          },
          required: ["translation", "explanation"],
        },
        temperature: 0.2, // Low temperature for high accuracy deterministic translations
      },
    });

    const resultText = response.text ? response.text.trim() : "";
    if (resultText) {
      const parsed = JSON.parse(resultText);
      return res.json(parsed);
    } else {
      throw new Error("Tidak mendapat respons teks dari AI.");
    }
  } catch (err: any) {
    console.error("Gemini API Error:", err);
    return res.status(500).json({
      error: "Gagal menghubungkan ke Asisten AI.",
      details: err.message,
    });
  }
});

// Setup Vite development server or production static files serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
  });
}

startServer();
