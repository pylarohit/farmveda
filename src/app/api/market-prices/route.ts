import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const apiKey = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b";
    const url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&limit=50`;
    const res = await fetch(url, { cache: "no-store" });
    
    if (!res.ok) {
      console.error("Market prices API returned status:", res.status);
      return NextResponse.json({ records: [] });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch market prices in API route:", error);
    return NextResponse.json({ records: [] });
  }
}
