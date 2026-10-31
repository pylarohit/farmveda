import { NextResponse } from "next/server";

const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah - clear, reassuring, mature

export async function POST(req: Request) {
  try {
    const { text, voiceId } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const elevenApiKey =
      process.env.ELEVENLABS_API_KEY || process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;

    if (!elevenApiKey) {
      return NextResponse.json(
        { error: "ElevenLabs API key is missing" },
        { status: 500 }
      );
    }

    const cleanText = text.replace(/[*#_`]/g, "").trim();
    const targetVoice = voiceId || DEFAULT_VOICE_ID;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${targetVoice}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs error:", response.status, errText);
      return NextResponse.json(
        { error: `ElevenLabs returned ${response.status}`, details: errText },
        { status: response.status }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = `data:audio/mpeg;base64,${Buffer.from(arrayBuffer).toString("base64")}`;

    return NextResponse.json({
      success: true,
      audioUrl: base64Audio,
      provider: "elevenlabs",
    });
  } catch (error: any) {
    console.error("TTS endpoint error:", error);
    return NextResponse.json(
      { error: "Failed to generate speech", details: error?.message },
      { status: 500 }
    );
  }
}

