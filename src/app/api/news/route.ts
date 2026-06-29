import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_NEWS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ results: [] });
    }
    
    const url = `https://newsdata.io/api/1/news?apikey=${apiKey}&q=agriculture OR farming OR crops&language=en&image=1`;
    const res = await fetch(url, { cache: "no-store" });
    
    if (!res.ok) {
      console.error("News API returned status:", res.status);
      return NextResponse.json({ results: [] });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch news in API route:", error);
    return NextResponse.json({ results: [] });
  }
}
