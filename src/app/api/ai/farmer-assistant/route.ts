/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ElevenLabs default voice ID: "EXAVITQu4vr4xnSDxMaL" (Sarah - Mature, Reassuring, Clear)
const DEFAULT_ELEVENLABS_VOICE = "EXAVITQu4vr4xnSDxMaL";

// Approved functions that the FarmVeda app executes on behalf of the voice assistant
const TOOLS_CONFIG = [
  {
    functionDeclarations: [
      {
        name: "get_weather",
        description: "Fetch live weather, temperature, humidity, and rain forecast for a location.",
        parameters: {
          type: "OBJECT",
          properties: {
            location: {
              type: "STRING",
              description: "Village, town or district name, e.g. Visakhapatnam, Tuni, Anand.",
            },
          },
          required: [],
        },
      },
      {
        name: "inspect_crop_disease",
        description: "Open the disease scanner when the farmer mentions leaf discoloration, yellow leaves, spots, blight, wilt, or pest damage.",
        parameters: {
          type: "OBJECT",
          properties: {
            crop: { type: "STRING", description: "Crop name, e.g. Tomato, Rice." },
            reason: { type: "STRING", description: "Why inspection is required." },
          },
          required: ["reason"],
        },
      },
      {
        name: "open_roadmap",
        description: "Navigate to the farmer's crop cultivation roadmap and check stage-by-stage tasks.",
        parameters: {
          type: "OBJECT",
          properties: {
            crop: { type: "STRING", description: "Crop name" },
          },
          required: [],
        },
      },
      {
        name: "connect_doctor",
        description: "Navigate to consult verified agricultural specialists and crop doctors.",
        parameters: {
          type: "OBJECT",
          properties: {
            specialization: { type: "STRING", description: "Optional doctor specialization" },
          },
          required: [],
        },
      },
      {
        name: "manage_loans",
        description: "Navigate to agricultural loans or recommend between Government Schemes and Farmer-to-Farmer lending.",
        parameters: {
          type: "OBJECT",
          properties: {
            category: {
              type: "STRING",
              enum: ["general", "govt", "farmer"],
              description: "Choose 'general' if the user asked for loans without specifying, 'govt' for government subsidies/schemes, 'farmer' for peer-to-peer farmer lending.",
            },
          },
          required: ["category"],
        },
      },
      {
        name: "navigate_app",
        description: "Navigate to a specific section of the FarmVeda app.",
        parameters: {
          type: "OBJECT",
          properties: {
            destination: {
              type: "STRING",
              description: "One of: 'community', 'weather', 'loans', 'budget', 'rent_hire', 'sell_crops', 'profile', 'roadmap', 'disease', 'calendar'.",
            },
          },
          required: ["destination"],
        },
      },
    ],
  },
];

/**
 * Format raw conversation history into Gemini's alternating user/model structure
 */
function formatChatHistory(rawHistory: any[]) {
  if (!Array.isArray(rawHistory) || rawHistory.length === 0) return [];

  const formatted: { role: "user" | "model"; parts: { text: string }[] }[] = [];

  for (const item of rawHistory) {
    if (!item || !item.content || typeof item.content !== "string") continue;
    const role = item.role === "assistant" || item.role === "model" ? "model" : "user";
    const text = item.content.trim();
    if (!text) continue;

    // Avoid consecutive messages with the same role
    if (formatted.length > 0 && formatted[formatted.length - 1].role === role) {
      formatted[formatted.length - 1].parts[0].text += " " + text;
    } else {
      formatted.push({
        role,
        parts: [{ text }],
      });
    }
  }

  // History for startChat must start with 'user'
  while (formatted.length > 0 && formatted[0].role !== "user") {
    formatted.shift();
  }

  // If the last message in history is 'user', remove it so current message is sent as the user's turn
  if (formatted.length > 0 && formatted[formatted.length - 1].role === "user") {
    formatted.pop();
  }

  return formatted;
}

/**
 * Generate human-like studio quality speech via ElevenLabs API
 */
async function generateElevenLabsAudio(text: string): Promise<string | null> {
  const elevenApiKey =
    process.env.ELEVENLABS_API_KEY || process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
  if (!elevenApiKey) return null;

  try {
    const cleanText = text.replace(/[*#_`]/g, "").trim();
    if (!cleanText) return null;

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_ELEVENLABS_VOICE}`,
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

    if (!res.ok) {
      console.warn("ElevenLabs TTS responded with status:", res.status);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const base64Audio = `data:audio/mpeg;base64,${Buffer.from(arrayBuffer).toString("base64")}`;
    return base64Audio;
  } catch (err) {
    console.warn("Failed to generate ElevenLabs audio:", err);
    return null;
  }
}

async function fetchLiveWeather(locationName: string) {
  try {
    const query = encodeURIComponent(locationName.trim() || "Visakhapatnam");
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=1`
    );
    const geoData = await geoRes.json();
    const result = geoData.results?.[0];

    const lat = result?.latitude || 17.68;
    const lon = result?.longitude || 83.20;
    const resolvedName = result
      ? `${result.name}, ${result.admin1 || "India"}`
      : locationName || "Visakhapatnam";

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
    );
    const wData = await weatherRes.json();

    const currentTemp = Math.round(wData.current?.temperature_2m ?? 31);
    const humidity = Math.round(wData.current?.relative_humidity_2m ?? 72);
    const rainProb = Math.round(wData.daily?.precipitation_probability_max?.[0] ?? 20);
    const code = wData.current?.weather_code ?? 1;

    let condition = "clear and sunny";
    if (code >= 2 && code <= 3) condition = "partly cloudy";
    else if (code >= 51 && code <= 67) condition = "light rain";
    else if (code >= 80) condition = "rain showers";
    else if (code >= 95) condition = "thunderstorms";

    return {
      success: true,
      location: resolvedName,
      temperature: `${currentTemp}°C`,
      condition,
      humidity: `${humidity}%`,
      rain_probability: `${rainProb}%`,
      advisory:
        rainProb > 45
          ? "Rain is expected today, so hold off on spraying fertilizers or pesticides."
          : "Skies are clear and dry today, excellent for fieldwork and watering.",
    };
  } catch {
    return {
      success: true,
      location: locationName || "Visakhapatnam",
      temperature: "31°C",
      condition: "partly cloudy",
      humidity: "70%",
      rain_probability: "20%",
      advisory: "Warm seasonal conditions. Check soil moisture before irrigating.",
    };
  }
}

export async function POST(req: Request) {
  try {
    const { message, farmData, userProfile, conversationHistory = [] } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "No voice query received" }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    let farmLocation = userProfile?.location || "Visakhapatnam, Andhra Pradesh";
    if (farmData?.field_name) {
      const parts = farmData.field_name.split("|||");
      if (parts[1]) farmLocation = parts[1];
    }
    const crop = farmData?.intended_crop || "Rice";
    const farmerName = userProfile?.name || "Farmer";
    const farmId = farmData?.id || "";

    const cleanQuery = message.toLowerCase().trim();

    let spokenReply = "";
    let action: any = null;

    // ── 0. Check for polite closing / "no more" phrases ────────────────────────
    const isDoneQuery =
      cleanQuery === "no" ||
      cleanQuery === "nope" ||
      cleanQuery === "nothing" ||
      cleanQuery === "no thanks" ||
      cleanQuery === "no thank you" ||
      cleanQuery === "that is all" ||
      cleanQuery === "that's all" ||
      cleanQuery === "thats all" ||
      cleanQuery === "nothing else" ||
      cleanQuery === "all good" ||
      cleanQuery === "thank you" ||
      cleanQuery === "thanks" ||
      cleanQuery === "bye";

    if (isDoneQuery) {
      spokenReply = `You're very welcome, ${farmerName}! I am always here whenever you need guidance for your ${crop} field. Have a wonderful day in the field!`;
      action = {
        type: "complete",
        autoExecute: false,
        followupListen: false,
      };
    } else {
      // ── 1. Direct Pattern Matchers for Fast Interactive Routing ──────────────
      const isGovtLoanQuery =
        cleanQuery.includes("govt") ||
        cleanQuery.includes("government") ||
        cleanQuery.includes("subsidy") ||
        cleanQuery.includes("subsidies") ||
        cleanQuery.includes("kcc") ||
        cleanQuery.includes("pm kisan") ||
        cleanQuery.includes("yojana") ||
        cleanQuery.includes("nabard") ||
        cleanQuery.includes("first option") ||
        cleanQuery.includes("1st option") ||
        cleanQuery === "schemes";

      const isFarmerLendingQuery =
        cleanQuery.includes("farmer to farmer") ||
        cleanQuery.includes("peer to peer") ||
        cleanQuery.includes("p2p") ||
        cleanQuery.includes("farmer loan") ||
        cleanQuery.includes("farmer lending") ||
        cleanQuery.includes("community loan") ||
        cleanQuery.includes("other farmer") ||
        cleanQuery.includes("second option") ||
        cleanQuery.includes("2nd option") ||
        cleanQuery === "farmer" ||
        cleanQuery === "farmers" ||
        (cleanQuery.includes("farmer") && (cleanQuery.includes("lend") || cleanQuery.includes("borrow") || cleanQuery.includes("loan")));

      const isGeneralLoanQuery =
        (cleanQuery.includes("loan") || cleanQuery.includes("credit") || cleanQuery.includes("borrow money")) &&
        !isGovtLoanQuery &&
        !isFarmerLendingQuery;

      if (isGovtLoanQuery) {
        spokenReply = `Opening Government agricultural schemes and subsidies for your farm. You can browse Kisan Credit Card, interest subvention, and state subsidies here. Is there anything else you would like me to help you with?`;
        action = {
          type: "navigate",
          destination: "/home/loans?tab=govt",
          label: "Government Schemes",
          autoExecute: true,
          followupListen: true,
        };
      } else if (isFarmerLendingQuery) {
        spokenReply = `Opening Farmer-to-Farmer lending. Here you can connect with verified local farmers to lend or borrow funds at low interest. What else can I guide you with?`;
        action = {
          type: "navigate",
          destination: "/home/loans?tab=farmer",
          label: "Farmer Lending",
          autoExecute: true,
          followupListen: true,
        };
      } else if (isGeneralLoanQuery) {
        spokenReply = `Opening agricultural loans for you. Would you like to explore Government Schemes and subsidies, or Farmer-to-Farmer lending?`;
        action = {
          type: "navigate",
          destination: "/home/loans",
          label: "Agricultural Loans",
          autoExecute: true,
          followupListen: true,
          optionsPrompt: "Would you like Government Schemes or Farmer to Farmer lending?",
          options: [
            {
              label: "🏛️ Govt Schemes",
              value: "government schemes",
              destination: "/home/loans?tab=govt",
            },
            {
              label: "🤝 Farmer to Farmer",
              value: "farmer to farmer lending",
              destination: "/home/loans?tab=farmer",
            },
          ],
        };
      } else if (cleanQuery.includes("roadmap") || cleanQuery.includes("growth stage") || cleanQuery.includes("stage")) {
        spokenReply = `Opening your ${crop} cultivation roadmap. You can view your current growth stage and planned field tasks. What else would you like me to help you with, ${farmerName}?`;
        action = {
          type: "navigate",
          destination: farmId ? `/farm/${farmId}/roadmap` : "/home",
          label: "Cultivation Roadmap",
          autoExecute: true,
          followupListen: true,
        };
      } else if (cleanQuery.includes("weather") || cleanQuery.includes("rain") || cleanQuery.includes("temperature")) {
        const weatherData = await fetchLiveWeather(farmLocation);
        spokenReply = `Today in ${weatherData.location}, the temperature is ${weatherData.temperature} and skies are ${weatherData.condition}, with a ${weatherData.rain_probability} chance of rain. ${weatherData.advisory} Is there anything else you would like to check for your field?`;
        action = {
          type: "weather",
          data: weatherData,
          destination: farmId ? `/farm/${farmId}/weather` : "/home",
          autoExecute: false,
          followupListen: true,
        };
      } else if (
        cleanQuery.includes("yellow") ||
        cleanQuery.includes("spot") ||
        cleanQuery.includes("blight") ||
        cleanQuery.includes("disease") ||
        cleanQuery.includes("pest") ||
        cleanQuery.includes("curl") ||
        cleanQuery.includes("wilt")
      ) {
        spokenReply = `Leaf discoloration or yellowing can indicate nutrient deficiency or early fungal infection. Opening the crop scanner so you can take a leaf photo for safe diagnosis. Would you like me to guide you with anything else?`;
        action = {
          type: "navigate",
          destination: farmId ? `/farm/${farmId}/disease` : "/farm",
          label: "Crop Disease Scanner",
          autoExecute: true,
          followupListen: true,
        };
      } else if (cleanQuery.includes("doctor") || cleanQuery.includes("specialist") || cleanQuery.includes("consult")) {
        spokenReply = `Connecting you with verified crop doctors Dr. Santhi Pyla and Dr. Vinay Ashish. Taking you to Doctor Connect now. What else would you like me to guide you with?`;
        action = {
          type: "navigate",
          destination: "/home/doctor-connect",
          label: "Doctor Connect",
          autoExecute: true,
          followupListen: true,
        };
      } else if (cleanQuery.includes("community") || cleanQuery.includes("kisan") || cleanQuery.includes("discussion")) {
        spokenReply = `Opening FarmVeda Community where you can share crop photos and discuss farming with fellow farmers. Is there anything else you need me to do?`;
        action = {
          type: "navigate",
          destination: "/home/community",
          label: "Community",
          autoExecute: true,
          followupListen: true,
        };
      } else if (cleanQuery.includes("tractor") || cleanQuery.includes("rent") || cleanQuery.includes("hire") || cleanQuery.includes("equipment")) {
        spokenReply = `Opening Rent and Hire service where you can book tractors, harvesters, and sprayers. Is there any specific equipment you need help finding?`;
        action = {
          type: "navigate",
          destination: "/home/rent-hire",
          label: "Rent Farm Equipment",
          autoExecute: true,
          followupListen: true,
        };
      } else if (cleanQuery.includes("sell") || cleanQuery.includes("market") || cleanQuery.includes("price") || cleanQuery.includes("mandi")) {
        spokenReply = `Opening crop marketplace where you can list and sell your harvest at good market rates. Would you like to check anything else for your farm?`;
        action = {
          type: "navigate",
          destination: "/home/sell-crops",
          label: "Sell Crops",
          autoExecute: true,
          followupListen: true,
        };
      } else if (cleanQuery.includes("budget") || cleanQuery.includes("expense") || cleanQuery.includes("finance")) {
        spokenReply = `Opening your farm budget and financial tracker so you can monitor your seasonal costs. What else can I guide you with?`;
        action = {
          type: "navigate",
          destination: "/home/budget",
          label: "Farm Budget",
          autoExecute: true,
          followupListen: true,
        };
      } else if (cleanQuery.includes("calendar") || cleanQuery.includes("schedule")) {
        spokenReply = `Opening your farm calendar and scheduled tasks. What else can I do for you today?`;
        action = {
          type: "navigate",
          destination: farmId ? `/farm/${farmId}/calender` : "/home",
          label: "Farm Calendar",
          autoExecute: true,
          followupListen: true,
        };
      } else if (geminiKey) {
        // ── Conversational Multi-Turn Gemini LLM ────────────────────────────────
        try {
          const genAI = new GoogleGenerativeAI(geminiKey);
          const systemPrompt = `You are FarmVeda Voice Assistant, a dedicated, knowledgeable personal agricultural assistant for an Indian farmer (${farmerName}, Crop: ${crop}, Location: ${farmLocation}).
YOUR CORE MISSION:
You are the farmer's personal guide. Guide them step-by-step through their field problems, cultivation roadmap, weather decisions, and app navigation.
CRITICAL ASSISTANT RULES:
1. Always guide the farmer warmly and practically, and ALWAYS end your response with a gentle follow-up question, such as:
   "Is there anything else you would like me to help you with, ${farmerName}?" or "What else can I check for your farm today?"
2. If the farmer says "no", "nothing else", "that is all", or "thank you", respond warmly:
   "You are very welcome, ${farmerName}! I am always here whenever you need anything for your ${crop} farm. Have a wonderful day!"
3. When the user asks for loans in general, navigate to '/home/loans' and ask: "Opening agricultural loans for you. Would you like Government Schemes or Farmer to Farmer lending?"
4. Maximum 2 to 3 concise spoken sentences. Never use asterisks (*), markdown, hashes (#), bullet points, or robotic phrases.
5. When an app action is needed (weather, roadmap, doctor, loans, disease scanner, rent equipment, sell crop), call the appropriate function tool.`;

          const modelNames = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-flash-latest"];
          let model: any = null;

          for (const mName of modelNames) {
            try {
              model = genAI.getGenerativeModel({
                model: mName,
                systemInstruction: systemPrompt,
                tools: TOOLS_CONFIG as any,
              });
              break;
            } catch {}
          }

          if (model) {
            const formattedHistory = formatChatHistory(conversationHistory);
            const chat = model.startChat({
              history: formattedHistory,
            });

            const result = await chat.sendMessage(message);
            const response = result.response;
            const calls = response.functionCalls();

            if (calls && calls.length > 0) {
              const call = calls[0];
              const name = call.name;
              const args: any = call.args || {};

              if (name === "manage_loans") {
                const cat = args.category || "general";
                if (cat === "govt") {
                  spokenReply = `Opening Government agricultural schemes and subsidies for your farm. Is there anything else you need guidance on?`;
                  action = {
                    type: "navigate",
                    destination: "/home/loans?tab=govt",
                    label: "Government Schemes",
                    autoExecute: true,
                    followupListen: true,
                  };
                } else if (cat === "farmer") {
                  spokenReply = `Opening Farmer-to-Farmer lending where you can connect with local peer lenders. What else can I help you with?`;
                  action = {
                    type: "navigate",
                    destination: "/home/loans?tab=farmer",
                    label: "Farmer Lending",
                    autoExecute: true,
                    followupListen: true,
                  };
                } else {
                  spokenReply = `Opening agricultural loans for you. Would you prefer Government Schemes and subsidies, or Farmer-to-Farmer lending?`;
                  action = {
                    type: "navigate",
                    destination: "/home/loans",
                    label: "Agricultural Loans",
                    autoExecute: true,
                    followupListen: true,
                    options: [
                      { label: "🏛️ Govt Schemes", value: "government schemes", destination: "/home/loans?tab=govt" },
                      { label: "🤝 Farmer to Farmer", value: "farmer to farmer lending", destination: "/home/loans?tab=farmer" },
                    ],
                  };
                }
              } else if (name === "get_weather") {
                const w = await fetchLiveWeather(args.location || farmLocation);
                spokenReply = `Today in ${w.location}, it is ${w.temperature} and ${w.condition}, with a ${w.rain_probability} chance of rain. ${w.advisory} Is there anything else you would like to check for your field?`;
                action = {
                  type: "weather",
                  data: w,
                  destination: farmId ? `/farm/${farmId}/weather` : "/home",
                  autoExecute: false,
                  followupListen: true,
                };
              } else if (name === "inspect_crop_disease") {
                spokenReply = `Leaf discoloration or yellowing can be caused by nutrient deficiency or early blight. Opening the crop scanner so you can take a leaf photo for safe diagnosis. What else can I do for you, ${farmerName}?`;
                action = {
                  type: "navigate",
                  destination: farmId ? `/farm/${farmId}/disease` : "/farm",
                  label: "Crop Disease Scanner",
                  autoExecute: true,
                  followupListen: true,
                };
              } else if (name === "open_roadmap") {
                spokenReply = `Opening your ${crop} cultivation roadmap so you can review your active stage and next tasks. Is there anything else I can guide you with today?`;
                action = {
                  type: "navigate",
                  destination: farmId ? `/farm/${farmId}/roadmap` : "/home",
                  label: "Cultivation Roadmap",
                  autoExecute: true,
                  followupListen: true,
                };
              } else if (name === "connect_doctor") {
                spokenReply = `Connecting you with verified crop doctors Dr. Santhi Pyla and Dr. Vinay Ashish. Taking you to Doctor Connect now. What else would you like me to help you with?`;
                action = {
                  type: "navigate",
                  destination: "/home/doctor-connect",
                  label: "Doctor Connect",
                  autoExecute: true,
                  followupListen: true,
                };
              } else if (name === "navigate_app") {
                const d = (args.destination || "home").toLowerCase();
                let destUrl = "/home";
                let label = "Dashboard";
                if (d.includes("community")) {
                  destUrl = "/home/community";
                  label = "Community";
                } else if (d.includes("roadmap")) {
                  destUrl = farmId ? `/farm/${farmId}/roadmap` : "/home";
                  label = "Roadmap";
                } else if (d.includes("disease")) {
                  destUrl = farmId ? `/farm/${farmId}/disease` : "/farm";
                  label = "Disease Scanner";
                } else if (d.includes("weather")) {
                  destUrl = farmId ? `/farm/${farmId}/weather` : "/home";
                  label = "Weather";
                } else if (d.includes("loan")) {
                  destUrl = "/home/loans";
                  label = "Loans";
                } else if (d.includes("budget")) {
                  destUrl = "/home/budget";
                  label = "Budget";
                } else if (d.includes("rent")) {
                  destUrl = "/home/rent-hire";
                  label = "Rent Equipment";
                } else if (d.includes("sell")) {
                  destUrl = "/home/sell-crops";
                  label = "Sell Crops";
                }
                spokenReply = `Opening ${label} for you now. Is there anything else you would like me to check?`;
                action = {
                  type: "navigate",
                  destination: destUrl,
                  label,
                  autoExecute: true,
                  followupListen: true,
                };
              }
            } else {
              spokenReply = response.text().replace(/[*#_`]/g, "").trim();
              if (
                !spokenReply.toLowerCase().includes("anything else") &&
                !spokenReply.toLowerCase().includes("what else") &&
                !spokenReply.toLowerCase().includes("help you with")
              ) {
                spokenReply += ` Is there anything else you would like me to help you with, ${farmerName}?`;
              }
            }
          }
        } catch (geminiErr: any) {
          console.warn("Gemini chat error:", geminiErr?.message || geminiErr);
        }
      }
    }

    if (!spokenReply) {
      spokenReply = `I understand, ${farmerName}. What else can I guide you with for your ${crop} field today?`;
    }

    // ── High-Fidelity Voice Synthesis via ElevenLabs ──────────────────────────
    let audioUrl: string | null = null;
    let audioProvider: "elevenlabs" | "webspeech" = "webspeech";

    try {
      audioUrl = await generateElevenLabsAudio(spokenReply);
      if (audioUrl) {
        audioProvider = "elevenlabs";
      }
    } catch (audioErr) {
      console.warn("Could not generate audio with ElevenLabs:", audioErr);
    }

    return NextResponse.json({
      spokenReply,
      action,
      audioUrl,
      audioProvider,
    });
  } catch (error: any) {
    console.error("[VoiceAssistant Error]:", error?.message || error);
    return NextResponse.json({
      spokenReply:
        "I am here to help you. Is there anything else you would like me to check for your farm?",
      action: null,
      audioUrl: null,
      audioProvider: "webspeech",
    });
  }
}
