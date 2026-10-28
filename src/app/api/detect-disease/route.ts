import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ detail: "No image file provided." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      console.error("GEMINI_API_KEY is not configured.");
      return NextResponse.json(
        { detail: "Gemini API key is not configured on the server." },
        { status: 500 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64Image = Buffer.from(bytes).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const promptText = `
You are Farmveda AI, an expert agricultural pathologist, agronomist, and crop health specialist.

TASK:
Examine the uploaded image very carefully to determine if it shows a real farm crop, agricultural plant, leaf, crop fruit/vegetable, field, or farm vegetation.

STRICT VALIDATION RULES:
1. ACCEPT ONLY: Living crops, farm plants, leaves, stems, flowers, roots, or agricultural produce (e.g. rice, wheat, corn, tomato, cotton, potato, chili, sugarcane, legumes, etc.).
2. REJECT IMMEDIATELY: Random non-crop images, humans, faces, animals, pets, vehicles, buildings, electronics, screenshots, logos, graphics, icons, abstract digital art, documents, household items, cooked food dishes, or anything that is NOT a real crop/plant.

CASE 1: THE IMAGE IS NOT A REAL CROP OR PLANT (isValidCrop = false)
Return strictly valid JSON with this exact structure:
{
  "isValidCrop": false,
  "isHealthy": false,
  "cropName": "Not a Crop",
  "diseaseName": "Invalid Photo (Not a Crop or Plant)",
  "confidence": 0,
  "severity": "None",
  "reason": "The uploaded photo is not recognized as a crop, plant, or farm leaf. It appears to show [brief description of what is actually in the image, e.g. digital icon/graphic, human, vehicle, household item].",
  "farmerMessage": "Please provide a valid, clear photo of a crop, plant, or leaf to detect disease."
}

CASE 2: THE IMAGE IS A REAL CROP OR PLANT (isValidCrop = true)
Carefully diagnose whether the plant is healthy or suffering from any fungal, bacterial, viral, pest, or nutrient deficiency condition.

If the crop is HEALTHY:
- "isValidCrop": true
- "isHealthy": true
- "cropName": "[Specific identified crop name, e.g. Rice, Tomato, Wheat, etc.]"
- "diseaseName": "Healthy Crop (No Disease Detected)"
- "confidence": [Confidence percentage between 90.0 and 99.0]
- "severity": "Healthy"
- "whatHappened": "[Explain in 2 simple sentences that the crop is healthy and growing well]"
- "whyItHappened": "[Explain that good soil nutrition, water management, and care kept the crop healthy]"
- "simpleDescription": "[Simple, friendly explanation for a village farmer]"
- "visibleSymptoms": ["Healthy green foliage", "No pest or pathogen lesions", "Strong leaf turgor and vitality"]
- "doToday": ["Maintain regular irrigation schedule", "Inspect lower leaves weekly for early pest signs"]
- "organicTreatment": ["Apply organic compost or bio-fertilizers periodically to nourish soil microbes"]
- "chemicalTreatment": []
- "prevention": ["Avoid waterlogging", "Maintain proper plant spacing for air circulation"]
- "wateringAdvice": "[Crop-specific watering advice]"
- "fertilizerAdvice": "[Balanced fertilizer advice for current stage]"
- "canSpread": false
- "estimatedRecovery": "N/A"
- "farmerMessage": "Great news! Your crop is healthy and thriving. Keep following your daily care routine."

If the crop has a DISEASE or PEST INFESTATION:
- "isValidCrop": true
- "isHealthy": false
- "cropName": "[Specific identified crop name, e.g. Rice, Tomato, Wheat, Potato, etc.]"
- "diseaseName": "[Exact disease or pest name, e.g. Rice Blast, Early Blight, Powdery Mildew, Brown Spot, etc.]"
- "confidence": [Calculated confidence percentage, e.g. 92.5]
- "severity": "Low" | "Moderate" | "High"
- "whatHappened": "[Explain in 2-3 simple sentences what happened to the crop leaf/plant]"
- "whyItHappened": "[Explain in very simple language why this disease occurs (humidity, fungal spores, soil moisture, etc.)]"
- "simpleDescription": "[Explain simply as if talking to a rural farmer in easy, everyday words]"
- "visibleSymptoms": [
    "[Observed leaf/plant symptom 1]",
    "[Observed leaf/plant symptom 2]"
  ]
- "doToday": [
    "[Immediate practical action 1, e.g. isolate infected foliage]",
    "[Immediate practical action 2]"
  ]
- "organicTreatment": [
    "[Specific practical organic remedy, e.g. Neem oil spray 5ml/L of water in early morning, Trichoderma, etc.]",
    "[Second organic remedy]"
  ]
- "chemicalTreatment": [
    {
      "medicine": "[Standard agricultural fungicide/chemical name, e.g. Mancozeb 75% WP, Tricyclazole, Copper Oxychloride]",
      "dosage": "[Exact dosage, e.g. 2 grams per liter of water]",
      "howToUse": "[How and when to spray safely]"
    }
  ]
- "prevention": [
    "[Prevention step 1]",
    "[Prevention step 2]"
  ]
- "wateringAdvice": "[Actionable watering advice for this condition]"
- "fertilizerAdvice": "[Specific fertilizer advice (e.g. avoid excess nitrogen if fungal)]"
- "canSpread": true | false
- "estimatedRecovery": "[Realistic recovery time, e.g. 7-10 days]"
- "farmerMessage": "[A supportive, encouraging message to the farmer]"

IMPORTANT: Return ONLY valid, parseable JSON matching one of the schemas above. Do not output markdown fences or conversational preambles outside the JSON.
`;

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Priority order: latest stable multimodal flash models
    const modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-3.5-flash-lite"];
    let rawText = "";

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([
          promptText,
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
        ]);
        rawText = result.response.text();
        if (rawText) break;
      } catch (geminiError: any) {
        console.warn(`[Disease Detection] Model ${modelName} failed:`, geminiError?.message || geminiError);
      }
    }

    if (!rawText) {
      throw new Error("Unable to analyze crop image with Gemini Vision models. Please verify API configuration or try again.");
    }

    let cleanText = rawText.trim();
    if (cleanText.startsWith("```json")) cleanText = cleanText.substring(7);
    if (cleanText.startsWith("```")) cleanText = cleanText.substring(3);
    if (cleanText.endsWith("```")) cleanText = cleanText.substring(0, cleanText.length - 3);

    const parsed = JSON.parse(cleanText.trim());
    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error("API Route error:", error);
    return NextResponse.json(
      { detail: error.message || "Failed to analyze image." },
      { status: 500 }
    );
  }
}
