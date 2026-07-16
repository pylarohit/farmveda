"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

export async function askFarmAi(question: string, weatherContext: any) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are Farmveda's AI Agriculture Assistant. Your goal is to give accurate, data-driven farming advice based on current weather conditions. 
Keep your answer concise (2-3 sentences), professional, and highly actionable. Do not use markdown like asterisks or bold text, just provide plain conversational text.
    
--- CURRENT WEATHER CONTEXT ---
Location: ${weatherContext.location || "Unknown"}
Temperature: ${weatherContext.current?.temp}°C
Humidity: ${weatherContext.current?.humidity}%
Wind Speed: ${weatherContext.current?.windSpeed} km/h
Rain Probability: ${weatherContext.current?.rainProb}%
-------------------------------

User Question: "${question}"

Answer:`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return { success: true, text: responseText };
  } catch (error: any) {
    console.error("AI Action Error:", error);
    return { success: false, text: "Sorry, I am unable to analyze the weather data at the moment. Please try again." };
  }
}
