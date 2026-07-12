import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { crop, farmData } = await req.json();

    if (!crop) {
      return NextResponse.json({ error: "No crop provided" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    let farmLocation = "India";
    let soil = "normal soil";
    let area = "the field";
    let weather = "normal weather";

    if (farmData) {
      if (farmData.field_name) {
        const parts = farmData.field_name.split("|||");
        if (parts[1]) farmLocation = parts[1];
      }
      if (farmData.soil_type) soil = farmData.soil_type;
      if (farmData.area_size) area = `${farmData.area_size} acres`;
      if (farmData.weather_conditions) weather = farmData.weather_conditions;
    }

    const systemPrompt = `You are an expert agronomist AI for FarmVeda. 
Your task is to create a detailed, step-by-step roadmap for growing ${crop}.
The user's farm context is: Location: ${farmLocation}, Soil: ${soil}, Area: ${area}, Weather: ${weather}.
Provide a chronological roadmap of steps from start (preparation) to finish (harvesting and post-harvest).
You must reply with valid JSON adhering to this schema:
{
  "title": "Roadmap for growing <Crop>",
  "totalSteps": <number>,
  "requirements": "<A short paragraph summarizing what is needed (climate, soil, water)>",
  "steps": [
    {
      "title": "<Step Title>",
      "description": "<Detailed step description>",
      "duration": "<Estimated duration (e.g., Week 1, Month 1-2)>",
      "status": "upcoming"
    }
  ]
}
Ensure the output is clean JSON without any markdown formatting wrappers.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    let text = response.text();
    
    if (text.startsWith("\`\`\`json")) {
      text = text.replace(/^\`\`\`json\s*/, "").replace(/\s*\`\`\`$/, "");
    } else if (text.startsWith("\`\`\`")) {
      text = text.replace(/^\`\`\`\s*/, "").replace(/\s*\`\`\`$/, "");
    }

    const roadmapData = JSON.parse(text);

    return NextResponse.json(roadmapData);

  } catch (error) {
    console.error("[ROADMAP_API_ERROR]", error);
    return NextResponse.json({ error: "Failed to generate roadmap" }, { status: 500 });
  }
}
