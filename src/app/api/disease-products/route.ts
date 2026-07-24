import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const serpApiKey = process.env.SERPAPI_KEY;
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
    }

    if (!serpApiKey) {
      console.warn("SERPAPI_KEY is missing from environment. Returning fallback mock products.");
      return NextResponse.json({ products: getFallbackProducts(query) });
    }

    const serpUrl = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&hl=en&gl=in&api_key=${serpApiKey}`;
    
    const response = await fetch(serpUrl, { next: { revalidate: 3600 } });
    if (!response.ok) {
      throw new Error(`SerpApi responded with status ${response.status}`);
    }

    const data = await response.json();
    const shoppingResults = data.shopping_results || [];

    // Map to a clean, simple product structure
    const products = shoppingResults.slice(0, 8).map((item: any) => ({
      title: item.title,
      link: item.link,
      price: item.price,
      thumbnail: item.thumbnail,
      source: item.source || "Google Shopping"
    }));

    return NextResponse.json({ products });
  } catch (error: any) {
    console.error("SerpApi Product Search Error:", error);
    // Return high quality mock fallback products so it doesn't crash if SerpApi fails or quota runs out
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    return NextResponse.json({ products: getFallbackProducts(query) });
  }
}

function getFallbackProducts(query: string) {
  const lower = query.toLowerCase();
  if (lower.includes("neem") || lower.includes("organic")) {
    return [
      {
        title: "Pure Cold Pressed Neem Oil Spray for Plants (250ml)",
        link: "https://www.google.com/search?tbm=shop&q=neem+oil+spray+for+plants",
        price: "₹180",
        thumbnail: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80&w=200",
        source: "Amazon.in"
      },
      {
        title: "TrustBasket Organic Neem Kernel Powder (900g)",
        link: "https://www.google.com/search?tbm=shop&q=neem+powder+fertilizer",
        price: "₹249",
        thumbnail: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=200",
        source: "TrustBasket"
      },
      {
        title: "Organic Neem Oil Foliar Spray Ready-To-Use (500ml)",
        link: "https://www.google.com/search?tbm=shop&q=ready+to+use+neem+oil+spray",
        price: "₹299",
        thumbnail: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=200",
        source: "Ugaoo"
      }
    ];
  } else if (lower.includes("copper") || lower.includes("fungicide") || lower.includes("chemical")) {
    return [
      {
        title: "Tata Blitox Copper Oxychloride Fungicide (500g)",
        link: "https://www.google.com/search?tbm=shop&q=tata+blitox+copper+oxychloride",
        price: "₹340",
        thumbnail: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80&w=200",
        source: "Bighaat"
      },
      {
        title: "Katyayani Copper Oxychloride 50% WP (250g)",
        link: "https://www.google.com/search?tbm=shop&q=katyayani+copper+oxychloride",
        price: "₹210",
        thumbnail: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=200",
        source: "Amazon.in"
      },
      {
        title: "Saaf Systemic and Contact Fungicide (100g)",
        link: "https://www.google.com/search?tbm=shop&q=saaf+fungicide",
        price: "₹120",
        thumbnail: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=200",
        source: "AgriBegri"
      }
    ];
  } else {
    return [
      {
        title: "Organic Multi-Purpose Pest Control Neem Spray",
        link: "https://www.google.com/search?tbm=shop&q=organic+pest+control+spray+plants",
        price: "₹220",
        thumbnail: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80&w=200",
        source: "Amazon.in"
      },
      {
        title: "Broad Spectrum Bio-Fungicide for Plants",
        link: "https://www.google.com/search?tbm=shop&q=bio+fungicide+plants",
        price: "₹260",
        thumbnail: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=200",
        source: "Bighaat"
      }
    ];
  }
}
