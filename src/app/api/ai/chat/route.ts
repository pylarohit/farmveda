import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { message, history, farmData, mode, file } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "No message provided" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // ── Parse farm details ────────────────────────────────────────────────────
    let farmLocation = "India";
    let farmName = "your farm";
    if (farmData?.field_name) {
      const parts = farmData.field_name.split("|||");
      farmName = parts[0] || "your farm";
      if (parts[1]) farmLocation = parts[1];
    }

    const crop    = farmData?.intended_crop     || "your crop";
    const soil    = farmData?.soil_type         || "your soil";
    const area    = farmData?.area_size ? `${farmData.area_size} acres` : "your field";
    const weather = farmData?.weather_conditions || "normal weather";

    const modeInstruction =
      mode === "reasoning"
        ? "First, write your thinking inside [THINKING]...[/THINKING] tags. Then give the final simple answer."
        : mode === "research"
        ? "Give a complete, step-by-step answer. Cover what to do, when, how much, and what to watch out for."
        : "Keep your answer short — 3 to 6 bullet points or sentences only.";

    // ── System prompt ─────────────────────────────────────────────────────────
    const systemPrompt = `You are AgriBot, a friendly farming assistant for Indian farmers.

FARMER'S FIELD:
- Name: ${farmName}
- Location: ${farmLocation}
- Crop: ${crop}
- Area: ${area}
- Soil: ${soil}
- Weather: ${weather}

YOUR RULES:
1. Answer EVERY farming question — crops, soil, pests, diseases, fertilizers, irrigation, weather, livestock, government schemes, market prices, organic farming, post-harvest, anything a farmer needs.
2. Use very simple words. Imagine talking to a farmer who never went to school. No big scientific words.
3. If you must use a technical word, explain it simply right after. Example: "Urea (a fertilizer that helps plants grow green)".
4. Always connect your answer to this farmer's crop (${crop}), soil (${soil}), and location (${farmLocation}).
5. Use Indian context — Kharif/Rabi seasons, Indian fertilizer names (Urea, DAP, MOP), Indian units (acre, kg, quintal), Indian schemes (PM-KISAN, PMFBY, KCC) where relevant.
6. Be practical — tell WHAT to do, WHEN to do it, HOW MUCH to use.
7. End every answer with: 💡 Quick Tip: (one short useful tip)
8. ${modeInstruction}
9. Only refuse if the question is completely unrelated to farming (movies, politics, sports). For anything farming-related, always answer fully.`;

    // ── Call Gemini ───────────────────────────────────────────────────────────
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });

    // Build conversation history
    const contents = [];
    if (Array.isArray(history)) {
      for (const msg of history.slice(-8)) {
        if (msg.role && msg.content) {
          contents.push({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }],
          });
        }
      }
    }
    const userParts: any[] = [{ text: message }];
    if (file && file.data && file.mimeType) {
      userParts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.data
        }
      });
    }
    contents.push({ role: "user", parts: userParts });

    const result = await model.generateContent({ contents });
    const text = result.response.text();

    return NextResponse.json({ text }, { status: 200 });

  } catch (error: any) {
    console.error("[AgriBot Error]:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Failed to generate response" },
      { status: 500 }
    );
  }
}
