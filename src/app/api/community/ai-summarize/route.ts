import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { postTitle, postContent, comments } = await req.json();

    const discussionContext = `Post Title: ${postTitle || "Untitled"}
Post Content: ${postContent || ""}
Community Comments:
${(comments || []).map((c: any, i: number) => `${i + 1}. [${c.author_name} - ${c.is_expert_response ? "Verified Expert" : "Farmer"}]: ${c.content}`).join("\n")}`;

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        summary: `• The farmer raised a query regarding ${postTitle || "crop management"}.\n• Community members shared practical field experiences and traditional methods.\n• Verified agronomists recommend soil testing and standard cultural practices before chemical intervention.\n\n⚠️ Disclaimer: AI summary reflects community discussion; consult verified specialists for exact diagnosis.`
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are FarmVeda Community AI Assistant. Summarize this farming discussion for an Indian farmer:
${discussionContext}

Guidelines:
1. Provide exactly 3 short bullet points summarizing:
   - The core issue raised by the author.
   - Key solutions or experiences suggested by other farmers.
   - Key recommendations made by experts (if any).
2. Never prescribe specific high-hazard chemical pesticides or declare absolute diagnoses.
3. Keep it simple and practical (under 70 words total).
4. End with: "⚠️ Note: Community AI summary is for knowledge sharing. Consult a verified agronomist for certified advisories."`;

    const res = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const summary = res.response.text().trim();
    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error("AI summarize error:", error);
    return NextResponse.json({
      summary: "• Community discussion focuses on practical crop care and problem troubleshooting.\n• Farmers suggest localized soil and moisture management.\n\n⚠️ Note: Consult a verified crop specialist before making agricultural decisions."
    });
  }
}

