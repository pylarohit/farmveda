import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const CATEGORIES = [
  "Crop Diseases",
  "Farming Advice",
  "Irrigation",
  "Fertilizers",
  "Pest Management",
  "Harvesting",
  "Success Stories",
  "General Discussion"
];

const COMMON_CROPS = [
  "Rice", "Wheat", "Cotton", "Maize", "Chilli", "Tomato", "Sugarcane", 
  "Soybean", "Groundnut", "Mustard", "Potato", "Onion", "Mango", "Banana", "General"
];

export async function POST(req: Request) {
  try {
    const { title, content } = await req.json();

    const textToAnalyze = `${title || ""} ${content || ""}`.trim();
    if (!textToAnalyze) {
      return NextResponse.json({
        category: "General Discussion",
        cropType: "General"
      });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      // Heuristic fallback
      let category = "General Discussion";
      let cropType = "General";

      const lower = textToAnalyze.toLowerCase();
      if (lower.includes("disease") || lower.includes("blight") || lower.includes("rot") || lower.includes("spot") || lower.includes("fungus")) {
        category = "Crop Diseases";
      } else if (lower.includes("pest") || lower.includes("worm") || lower.includes("borer") || lower.includes("whitefly") || lower.includes("spray")) {
        category = "Pest Management";
      } else if (lower.includes("water") || lower.includes("irrigation") || lower.includes("drip") || lower.includes("borewell") || lower.includes("sprinkler")) {
        category = "Irrigation";
      } else if (lower.includes("urea") || lower.includes("dap") || lower.includes("fertilizer") || lower.includes("compost") || lower.includes("manure")) {
        category = "Fertilizers";
      } else if (lower.includes("yield") || lower.includes("harvest") || lower.includes("profit") || lower.includes("success") || lower.includes("quintal")) {
        category = "Success Stories";
      }

      for (const c of COMMON_CROPS) {
        if (lower.includes(c.toLowerCase())) {
          cropType = c;
          break;
        }
      }

      return NextResponse.json({ category, cropType });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Analyze this agricultural post draft from an Indian farmer:
Text: "${textToAnalyze}"

Available Categories: ${JSON.stringify(CATEGORIES)}
Available Crops: ${JSON.stringify(COMMON_CROPS)}

Return a JSON object with strictly these two fields:
{
  "category": "One exact matching category from available list",
  "cropType": "One exact matching crop or General"
}`;

    const res = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });

    const parsed = JSON.parse(res.response.text());
    return NextResponse.json({
      category: parsed.category || "General Discussion",
      cropType: parsed.cropType || "General"
    });
  } catch (error: any) {
    console.warn("AI Suggest error, returning defaults:", error);
    return NextResponse.json({
      category: "General Discussion",
      cropType: "General"
    });
  }
}

