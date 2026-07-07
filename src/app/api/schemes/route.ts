import { NextResponse } from "next/server";

export async function GET() {
  try {
    const serpApiKey = process.env.SERPAPI_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!serpApiKey) {
      console.warn("SERPAPI_KEY is missing from environment. Using fallback mode.");
      return NextResponse.json({ error: "SERPAPI_KEY is not configured" }, { status: 500 });
    }

    if (!geminiApiKey) {
      console.warn("GEMINI_API_KEY is missing from environment. Using fallback mode.");
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
    }

    // 1. Fetch live agricultural schemes from SerpAPI
    const query = encodeURIComponent("government schemes subsidies loans for farmers India 2025 2026");
    // num=100 requests up to 100 results from Google Search via SerpAPI
    const serpUrl = `https://serpapi.com/search.json?q=${query}&hl=en&gl=in&num=100&api_key=${serpApiKey}`;
    
    const serpRes = await fetch(serpUrl, { next: { revalidate: 3600 } }); // Cache for 1 hour
    if (!serpRes.ok) {
      throw new Error(`SerpAPI search failed with status ${serpRes.status}`);
    }
    
    const serpData = await serpRes.json();
    const organicResults = serpData.organic_results || [];
    
    // Map key search fields to pass to Gemini (increase slice to 60 to extract up to 50 schemes)
    const searchSnippets = organicResults.slice(0, 60).map((r: any) => ({
      title: r.title,
      link: r.link,
      snippet: r.snippet,
      date: r.date || ""
    }));

    if (searchSnippets.length === 0) {
      throw new Error("No search results returned from SerpAPI");
    }

    // 2. Prompt Gemini to parse and structure this data into our specific schema
    const promptText = `
      You are an expert Indian agriculture financial advisor. Given the following raw Google Search results about farmer schemes, loans, and subsidies, parse and structure them into a valid JSON array of schemes.
      
      Rules:
      1. Output a JSON array containing all the unique active schemes/loans/subsidies found in the search results (aim to extract 35 to 50 unique items). Do not omit or limit to a small count. Extract up to 50 unique schemes.
      2. Ensure all schemes are genuine and active in India (e.g. PM-Kisan, Kisan Credit Card, state specific subsidies, solar pumps, micro-irrigation, crop insurance).
      3. For each scheme, map it to this strict structure:
         - id: unique string (e.g., "live-1", "live-2", etc.)
         - title: full official name of the scheme/loan/subsidy (e.g., "Kisan Credit Card (KCC) Scheme")
         - provider: governing body (e.g., "Ministry of Agriculture", "NABARD", "State Government")
         - type: MUST be exactly one of: "Loan", "Subsidy", "Govt Scheme"
         - publishDate: date/year string from the search result or a reasonable active period (e.g., "12 Feb, 2026" or "2026")
         - eligibility: array of strings describing eligible persons (e.g., ["Small & Marginal Farmers", "Landholders"])
         - crops: array of crop eligibility strings. Choose only from: ["Paddy", "Cotton", "Wheat", "Sugarcane", "Horticulture", "General"]
         - interestRate: interest rate string if a loan (e.g., "4% Per Year"), otherwise omit or set to null
         - subsidyRate: subsidy percentage string if a subsidy (e.g., "60% - 90% Subsidy"), otherwise omit or set to null
         - benefitAmount: cash benefits string if a welfare scheme (e.g., "₹6,000 / Year"), otherwise omit or set to null
         - description: a clear, simple 1-sentence overview of the scheme
         - details: a detailed 2-3 sentence explanation of how the scheme works, rates, and benefits
         - documents: array of strings of necessary documents (e.g., ["Aadhaar Card", "Land Patta Proof", "Bank Passbook"])
         - applyLink: the official URL of the scheme from the search results, or a valid portal domain
         - color: assign one of these card styling background classes: "bg-[#FFEADB]", "bg-[#D8F3DC]", "bg-[#E2F0FD]", "bg-[#F0E6FF]", "bg-[#FFE5EC]", "bg-[#E8F8F5]", "bg-[#FFF9E6]", "bg-[#F4F9F1]"

      Raw Google Search Results:
      ${JSON.stringify(searchSnippets, null, 2)}

      Important: Return ONLY a valid JSON array. Do not wrap it in markdown block quotes (do not include \`\`\`json). Output raw valid JSON.
    `;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: promptText
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!geminiRes.ok) {
      throw new Error(`Gemini parsing failed with status ${geminiRes.status}`);
    }

    const geminiData = await geminiRes.json();
    const rawJson = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawJson) {
      throw new Error("Gemini returned an empty structure");
    }

    const schemes = JSON.parse(rawJson.trim());
    return NextResponse.json(schemes);

  } catch (error: any) {
    console.error("Error in schemes search API:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch live search schemes" }, { status: 500 });
  }
}
