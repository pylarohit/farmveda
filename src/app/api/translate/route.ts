/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

// In-memory server cache to ensure lightning-fast responses
const translationCache = new Map<string, string>();

async function translateSingle(text: string, targetLang: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed || targetLang === "en") return text;

  const cacheKey = `${targetLang}:::${trimmed}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // Primary: Google Translate Fast Engine
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
      targetLang
    )}&dt=t&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json) && Array.isArray(json[0])) {
        const result = json[0].map((item: any) => item[0]).join("");
        if (result) {
          translationCache.set(cacheKey, result);
          return result;
        }
      }
    }
  } catch (err) {
    console.warn("Primary translate failed, trying Gemini fallback:", err);
  }

  // Fallback: Gemini AI
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (apiKey) {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Translate this text accurately into language code "${targetLang}". Output ONLY the translated text without quotes or explanations:\n${trimmed}`,
                  },
                ],
              },
            ],
          }),
        }
      );
      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (candidate) {
          const clean = candidate.replace(/^["']|["']$/g, "").trim();
          translationCache.set(cacheKey, clean);
          return clean;
        }
      }
    }
  } catch (err) {
    console.error("Gemini fallback translation failed:", err);
  }

  return text;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, texts, targetLang } = body;

    if (!targetLang) {
      return NextResponse.json({ error: "Missing targetLang" }, { status: 400 });
    }

    // Batch translation
    if (Array.isArray(texts)) {
      const results = await Promise.all(
        texts.map((t: string) => (typeof t === "string" ? translateSingle(t, targetLang) : t))
      );
      return NextResponse.json({ translatedTexts: results });
    }

    // Single text translation
    if (typeof text === "string") {
      const result = await translateSingle(text, targetLang);
      return NextResponse.json({ translatedText: result });
    }

    return NextResponse.json({ error: "Provide text or texts array" }, { status: 400 });
  } catch (error: any) {
    console.error("Translate API error:", error);
    return NextResponse.json({ error: error.message || "Translation error" }, { status: 500 });
  }
}
