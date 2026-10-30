import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { district, state, village, pincode, soilType, farmCategory } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("No Gemini API key found, returning regional fallback crops");
      return NextResponse.json({
        suggestions: getFallbackSuggestions(state || district || "India", soilType),
        source: "fallback",
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are an expert Indian agricultural economist and agronomist with access to real-time Mandi market trends, Agmarknet price patterns, and Indian government agricultural advisories.

      Location details of the farm:
      - District: ${district || "General Region"}
      - State: ${state || "India"}
      - Village/Town: ${village || "Local Area"}
      - Pin Code: ${pincode || "N/A"}
      - Soil Type: ${soilType || "Alluvial/Loamy"}
      - Farm Category: ${farmCategory || "Grains & Vegetables"}

      Analyze the current demand, market prices, local climate, soil suitability, and agricultural news for this specific region in India.
      Suggest the TOP 4-5 high-profit, high-demand crops suitable for this farm right now.

      Return ONLY a strict JSON object with this exact structure:
      {
        "locationSummary": "1-line summary of agricultural outlook for this region",
        "marketHeadline": "Key current market trend or high-demand news in this district",
        "suggestions": [
          {
            "crop": "Crop Name (e.g., Basmati Rice / Cotton / Chilli)",
            "localName": "Hindi/Regional name if applicable",
            "demandLevel": "High" | "Very High" | "Surging",
            "profitPotential": "High" | "Moderate" | "Exceptional",
            "marketPriceTrend": "Brief info on recent mandi prices or MSP (e.g. ₹2,400 - ₹3,100/qtl)",
            "demandReason": "Why this crop is in high demand right now based on local market & soil conditions",
            "duration": "e.g., 90-120 days",
            "soilCompatibility": "High" | "Ideal" | "Moderate"
          }
        ]
      }
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);

    return NextResponse.json({
      ...parsed,
      source: "gemini-ai",
    });
  } catch (error: any) {
    console.error("Error in /api/ai/crop-suggestions:", error?.message || error);
    return NextResponse.json({
      suggestions: getFallbackSuggestions("India", "Loamy"),
      source: "fallback",
    });
  }
}

function getFallbackSuggestions(location: string, soil: string = "Alluvial") {
  return [
    {
      crop: "Paddy / Rice (धान)",
      localName: "Dhan / Chawal",
      demandLevel: "Very High",
      profitPotential: "High",
      marketPriceTrend: "₹2,300 - ₹2,800/qtl (Stable MSP)",
      demandReason: "Consistent high domestic mandi demand and assured MSP procurement.",
      duration: "110-130 days",
      soilCompatibility: "Ideal",
    },
    {
      crop: "Cotton (कपास)",
      localName: "Kapas",
      demandLevel: "High",
      profitPotential: "Exceptional",
      marketPriceTrend: "₹7,200 - ₹8,500/qtl",
      demandReason: "High textile export demand and premium prices in regional APMC mandis.",
      duration: "150-180 days",
      soilCompatibility: "Ideal",
    },
    {
      crop: "Soybean (सोयाबीन)",
      localName: "Soybean",
      demandLevel: "High",
      profitPotential: "High",
      marketPriceTrend: "₹4,600 - ₹5,200/qtl",
      demandReason: "Strong demand from oil extraction plants and poultry feed industry.",
      duration: "90-105 days",
      soilCompatibility: "High",
    },
    {
      crop: "Chilli / Mirchi (मिर्च)",
      localName: "Mirchi",
      demandLevel: "Surging",
      profitPotential: "Exceptional",
      marketPriceTrend: "₹14,000 - ₹22,000/qtl",
      demandReason: "Spike in spice exports and strong local spot market demand.",
      duration: "120-150 days",
      soilCompatibility: "High",
    },
    {
      crop: "Maize / Corn (मक्का)",
      localName: "Makka",
      demandLevel: "High",
      profitPotential: "Moderate",
      marketPriceTrend: "₹2,100 - ₹2,500/qtl",
      demandReason: "Surging ethanol blending policy demand and poultry sector requirements.",
      duration: "85-100 days",
      soilCompatibility: "Ideal",
    },
  ];
}

