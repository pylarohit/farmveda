import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { farmData } = await req.json();

    if (!farmData) {
      return NextResponse.json({ error: "No farm data provided" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("No Gemini API key found");
      return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are an expert agronomist AI assisting a farmer. The farmer has provided the following details about their field:
      - Field Name: ${farmData.field_name || "New Field"}
      - Location: ${farmData.location || "Unknown"}
      - Crop to Grow: ${farmData.intended_crop}
      - Area Size: ${farmData.area_size} acres
      - Soil Type: ${farmData.soil_type}
      - Expected Weather: ${farmData.weather_conditions}
      - Water Availability: ${farmData.water_availability}

      Please provide extremely concise, punchy, single-line points. 
      Return a STRICT JSON object with EXACTLY the following keys:
      {
        "decision": "1-line verdict on the crop decision",
        "expenses": "Short cost estimate summary for seeds, irrigation, and labor",
        "recommendations": "1-2 short tips for soil prep and water",
        "risks": "1-line weather or pest risk"
      }
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const responseText = result.response.text();
    const insights = JSON.parse(responseText);

    return NextResponse.json({ insights }, { status: 200 });
  } catch (error: any) {
    console.error("Error in /api/ai/farm-feedback:", error.message || error);
    return NextResponse.json({ error: "Failed to generate AI insights" }, { status: 500 });
  }
}
