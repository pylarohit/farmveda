/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Mic,
  Volume2,
  X,
  Sparkles,
  Radio,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { useUserData } from "@/context/UserDataProvider";
import { useLanguage } from "@/context/LanguageProvider";
import { createClient } from "@/lib/supabase/client";

type AssistantState = "idle" | "listening" | "processing" | "speaking";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export function FarmerAssistantWidget() {
  const router = useRouter();
  const params = useParams();
  const { user } = useUserData();
  const { lang } = useLanguage();
  const supabase = createClient();

  const [assistantState, setAssistantState] = useState<AssistantState>("idle");
  const [transcript, setTranscript] = useState("");
  const [spokenResponse, setSpokenResponse] = useState("");
  const [lastAction, setLastAction] = useState<any>(null);
  const [activeFarm, setActiveFarm] = useState<any>(null);

  // Full Session Memory
  const [conversationHistory, setConversationHistory] = useState<ChatTurn[]>([]);
  const [sessionTurnCount, setSessionTurnCount] = useState<number>(0);
  const [welcomeAudioUrl, setWelcomeAudioUrl] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Determine current active farm ID from URL or Supabase
  const currentFarmId = (params?.farmId as string) || activeFarm?.id;

  // First greeting text (only spoken on turn 0)
  const getFirstGreetingText = useCallback(() => {
    const name = user?.userName ? user.userName.split(" ")[0] : "";
    const crop = activeFarm?.intended_crop || "";

    if (lang === "te") {
      return name
        ? `నమస్తే ${name} గారు! ఫామ్‌వేదాకు స్వాగతం. ఈరోజు మీ ${crop ? crop + " " : ""}పంట కోసం నేను ఏమి సహాయం చేయగలను?`
        : `నమస్తే! ఫామ్‌వేదాకు స్వాగతం. ఈరోజు మీ పంట కోసం ఏమి సహాయం చేయగలను?`;
    }
    if (lang === "hi") {
      return name
        ? `नमस्ते ${name} जी! फार्मवेदा में आपका स्वागत है। आज मैं आपकी ${crop ? crop + " " : ""}खेती के लिए क्या मदद करूँ?`
        : `नमस्ते! फार्मवेदा में आपका स्वागत है। आज मैं आपकी खेती के लिए क्या मदद करूँ?`;
    }
    return name
      ? `Namaste ${name}! Welcome to FarmVeda. What would you like me to do for your ${crop ? crop + " " : ""}farm today?`
      : `Namaste! Welcome to FarmVeda. What would you like me to do for your farm today?`;
  }, [user?.userName, activeFarm?.intended_crop, lang]);

  // Subsequent natural human acknowledgment phrases (turns 1+)
  const getFollowupGreetingText = useCallback(() => {
    const name = user?.userName ? user.userName.split(" ")[0] : "";

    if (lang === "te") {
      return name ? `చెప్పండి ${name} గారు, నేను వింటున్నాను.` : `చెప్పండి, నేను వింటున్నాను.`;
    }
    if (lang === "hi") {
      return name ? `हाँ ${name} जी, मैं सुन रहा हूँ। कहिए।` : `हाँ, मैं सुन रहा हूँ। कहिए।`;
    }

    const naturalPhrases = [
      name ? `Yes ${name}, I'm listening. What's on your mind?` : "Yes, I'm listening. What's on your mind?",
      name ? `I'm here ${name}, go ahead.` : "I'm here, go ahead.",
      "Yes, what else can I help you with?",
      name ? `Go ahead ${name}, I'm listening.` : "Go ahead, I'm listening.",
    ];
    return naturalPhrases[Math.floor(Math.random() * naturalPhrases.length)];
  }, [user?.userName, lang]);

  // Load active farm from Supabase
  useEffect(() => {
    async function loadActiveFarm() {
      try {
        const { data } = await supabase
          .from("farms")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          setActiveFarm(data[0]);
        }
      } catch (err) {
        console.warn("Could not load farm for voice assistant:", err);
      }
    }
    loadActiveFarm();
  }, [supabase]);

  // Pre-generate / cache ElevenLabs welcome audio so turn 0 greets instantly
  useEffect(() => {
    let isCancelled = false;

    async function prefetchWelcomeSpeech() {
      try {
        const greeting = getFirstGreetingText();
        const res = await fetch("/api/ai/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: greeting }),
        });
        const data = await res.json();
        if (!isCancelled && data?.audioUrl) {
          setWelcomeAudioUrl(data.audioUrl);
        }
      } catch (err) {
        console.warn("Could not pre-fetch ElevenLabs welcome audio:", err);
      }
    }

    prefetchWelcomeSpeech();

    return () => {
      isCancelled = true;
    };
  }, [getFirstGreetingText]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = lang === "te" ? "te-IN" : lang === "hi" ? "hi-IN" : "en-IN";

        recognition.onstart = () => {
          setAssistantState("listening");
          setTranscript("");
        };

        recognition.onresult = (event: any) => {
          const currentTranscript = Array.from(event.results)
            .map((r: any) => r[0].transcript)
            .join("");
          setTranscript(currentTranscript);
        };

        recognition.onend = () => {
          setAssistantState((prev) => {
            if (prev === "listening") {
              return "processing";
            }
            return prev;
          });
        };

        recognition.onerror = () => {
          setAssistantState("idle");
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      stopAnyAudio();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [lang]);

  // When speech recognition finishes capturing, process & execute voice action
  useEffect(() => {
    if (assistantState === "processing" && transcript.trim()) {
      handleVoiceQuery(transcript.trim());
    }
  }, [assistantState, transcript]);

  // Stop any active audio or speech synthesis
  const stopAnyAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setAssistantState("idle");
  };

  // Reset conversation session memory
  const handleResetSession = (e: React.MouseEvent) => {
    e.stopPropagation();
    stopAnyAudio();
    setConversationHistory([]);
    setSessionTurnCount(0);
    setSpokenResponse("");
    setLastAction(null);
  };

  // Start listening to the farmer's voice
  const startListening = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setTranscript("");

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {
        recognitionRef.current.stop();
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch {}
        }, 150);
      }
    } else {
      alert("Microphone recognition is supported in Google Chrome, Edge, and Safari.");
      setAssistantState("idle");
    }
  };

  // Stop listening
  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setAssistantState("idle");
  };

  // Play ElevenLabs audio or fallback to WebSpeech
  const playResponseAudio = (
    audioUrl: string | null,
    textFallback: string,
    onComplete?: () => void
  ) => {
    stopAnyAudio();

    if (audioUrl) {
      try {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onplay = () => {
          setAssistantState("speaking");
        };

        audio.onended = () => {
          audioRef.current = null;
          setAssistantState("idle");
          if (onComplete) onComplete();
        };

        audio.onerror = (e) => {
          console.warn("ElevenLabs audio error, falling back to WebSpeech:", e);
          audioRef.current = null;
          speakAloudWebSpeech(textFallback, onComplete);
        };

        audio.play().catch((playErr) => {
          console.warn("Autoplay restricted or error, falling back to WebSpeech:", playErr);
          speakAloudWebSpeech(textFallback, onComplete);
        });
        return;
      } catch (err) {
        console.warn("Audio element setup failed:", err);
      }
    }

    // Direct WebSpeech fallback
    speakAloudWebSpeech(textFallback, onComplete);
  };

  // Web Speech Synthesis Fallback
  const speakAloudWebSpeech = (textToSpeak: string, callback?: () => void) => {
    if (!synthRef.current) {
      if (callback) callback();
      return;
    }

    synthRef.current.cancel();
    const clean = textToSpeak.replace(/[*#_`]/g, "").trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = synthRef.current.getVoices();
    const targetVoice = voices.find(
      (v) =>
        v.lang.includes("en-IN") ||
        v.lang.includes("hi-IN") ||
        v.name.includes("India") ||
        v.name.includes("Natural")
    );
    if (targetVoice) utterance.voice = targetVoice;

    utterance.onstart = () => {
      setAssistantState("speaking");
    };

    utterance.onend = () => {
      setAssistantState("idle");
      if (callback) callback();
    };

    utterance.onerror = () => {
      setAssistantState("idle");
      if (callback) callback();
    };

    synthRef.current.speak(utterance);
  };

  // Conversational click handler: Greets on turn 0, acknowledges like a human on turn 1+
  const handleAssistantClick = async () => {
    if (assistantState === "speaking") {
      stopAnyAudio();
      return;
    }
    if (assistantState === "listening") {
      stopListening();
      return;
    }

    // ── Turn 0: First Click in Session -> Warm Welcome ───────────────────────
    if (sessionTurnCount === 0) {
      const greetingText = getFirstGreetingText();
      setSpokenResponse(greetingText);
      setLastAction(null);
      setAssistantState("speaking");
      setSessionTurnCount(1);

      if (welcomeAudioUrl) {
        playResponseAudio(welcomeAudioUrl, greetingText, () => {
          startListening();
        });
        return;
      }

      try {
        const res = await fetch("/api/ai/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: greetingText }),
        });
        const data = await res.json();
        playResponseAudio(data?.audioUrl || null, greetingText, () => {
          startListening();
        });
      } catch {
        speakAloudWebSpeech(greetingText, () => {
          startListening();
        });
      }
      return;
    }

    // ── Turn 1+: Subsequent Clicks -> Natural Human Acknowledgment ───────────
    const followupText = getFollowupGreetingText();
    setSpokenResponse(followupText);
    setAssistantState("speaking");

    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: followupText }),
      });
      const data = await res.json();
      playResponseAudio(data?.audioUrl || null, followupText, () => {
        startListening();
      });
    } catch {
      speakAloudWebSpeech(followupText, () => {
        startListening();
      });
    }
  };

  // Handle Query Execution with Full Multi-Turn Session Memory
  const handleVoiceQuery = async (queryText: string) => {
    setAssistantState("processing");

    try {
      const res = await fetch("/api/ai/farmer-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: queryText,
          conversationHistory,
          farmData: {
            ...(activeFarm || {}),
            id: currentFarmId || activeFarm?.id,
          },
          userProfile: {
            name: user?.userName || "Farmer",
            location: user ? `${(user as any).village || ""}, ${(user as any).district || "Vizag"}` : "Visakhapatnam",
            language: lang || "en",
          },
          isVoiceMode: true,
        }),
      });

      const data = await res.json();
      const reply = data.spokenReply || "Action performed for your farm.";
      const action = data.action;

      setSpokenResponse(reply);
      setLastAction(action);

      // Save turns into Session Conversation Memory
      setConversationHistory((prev) => [
        ...prev,
        { role: "user", content: queryText },
        { role: "assistant", content: reply },
      ]);
      setSessionTurnCount((prev) => prev + 1);

      // Immediately perform navigation action so the user sees the page / tab open on the spot!
      if (action?.autoExecute && action?.destination) {
        router.push(action.destination);
        if (typeof window !== "undefined") {
          if (action.destination.includes("tab=farmer")) {
            window.dispatchEvent(new CustomEvent("farmveda:switch-tab", { detail: { tab: "farmer" } }));
          } else if (action.destination.includes("tab=govt")) {
            window.dispatchEvent(new CustomEvent("farmveda:switch-tab", { detail: { tab: "govt" } }));
          }
        }
      }

      // Speak human-like answer using ElevenLabs audio
      playResponseAudio(data.audioUrl, reply, () => {
        // If the action asks a follow-up option question (like loans: govt vs farmer),
        // immediately listen for the farmer's answer!
        if (action?.followupListen) {
          setTimeout(() => {
            startListening();
          }, 400);
        }
      });
    } catch (err) {
      console.error("Voice assistant error:", err);
      const fallback = "I could not complete that action right now. Please check your internet connection.";
      setSpokenResponse(fallback);
      speakAloudWebSpeech(fallback);
    }
  };

  // Handle clicking an interactive option chip (e.g. Govt Schemes or Farmer to Farmer)
  const handleOptionSelect = (opt: { label: string; value: string; destination: string }) => {
    stopAnyAudio();
    if (opt.destination) {
      router.push(opt.destination);
      if (typeof window !== "undefined") {
        if (opt.destination.includes("tab=farmer")) {
          window.dispatchEvent(new CustomEvent("farmveda:switch-tab", { detail: { tab: "farmer" } }));
        } else if (opt.destination.includes("tab=govt")) {
          window.dispatchEvent(new CustomEvent("farmveda:switch-tab", { detail: { tab: "govt" } }));
        }
      }
    }
    handleVoiceQuery(`I choose ${opt.value}`);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* ── Compact In-Place Corner Card (NO fullscreen popup) ── */}
      {assistantState !== "idle" && (
        <div className="mb-3 w-72 sm:w-84 bg-slate-950/95 backdrop-blur-xl border border-emerald-500/40 rounded-2xl shadow-2xl p-4 text-white animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Header Row */}
          <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>
                {assistantState === "speaking" && "FarmVeda Speaking"}
                {assistantState === "listening" && "Listening to you..."}
                {assistantState === "processing" && "Thinking & Checking..."}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {conversationHistory.length > 0 && (
                <button
                  onClick={handleResetSession}
                  className="p-1 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-white/10 transition-colors"
                  title="Start fresh conversation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={stopAnyAudio}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Dynamic Content */}
          <div className="py-2.5 text-xs">
            {assistantState === "speaking" && (
              <div className="space-y-2">
                {/* Audio equalizer bars */}
                <div className="flex items-center gap-1 h-3.5">
                  <span className="w-1 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-3.5 bg-teal-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-2.5 bg-emerald-300 rounded-full animate-bounce [animation-delay:-0.45s]" />
                  <span className="w-1 h-3.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.2s]" />
                  <span className="w-1 h-2 bg-teal-400 rounded-full animate-bounce [animation-delay:-0.35s]" />
                  <span className="text-[10px] font-bold text-emerald-300 ml-1">ElevenLabs Audio</span>
                </div>
                <p className="text-white text-xs leading-relaxed font-medium">
                  “{spokenResponse}”
                </p>
              </div>
            )}

            {assistantState === "listening" && (
              <div className="space-y-1.5">
                <p className="text-emerald-300 font-semibold text-[11px]">
                  Listening... Speak your request or say &ldquo;That&apos;s all&rdquo;
                </p>
                <p className="text-slate-300 italic min-h-[24px]">
                  {transcript ? `“${transcript}”` : "Speak now..."}
                </p>
                <div className="pt-1 flex items-center justify-end">
                  <button
                    onClick={() => handleVoiceQuery("No that is all, thank you")}
                    className="text-[10px] text-slate-400 hover:text-emerald-300 underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    That&apos;s all for now
                  </button>
                </div>
              </div>
            )}

            {assistantState === "processing" && (
              <div className="flex items-center gap-2 text-teal-300 py-1">
                <Radio className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Checking full conversation & preparing answer...</span>
              </div>
            )}
          </div>

          {/* Interactive Option Chips (e.g. Govt Schemes vs Farmer-to-Farmer) */}
          {lastAction?.options && lastAction.options.length > 0 && (
            <div className="pt-2 border-t border-white/10 space-y-1.5 mb-2">
              <span className="text-[10px] text-emerald-300 font-bold block uppercase tracking-wider">
                {lastAction.optionsPrompt || "Choose an option or speak aloud:"}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {lastAction.options.map((opt: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => handleOptionSelect(opt)}
                    className="px-2.5 py-2 rounded-xl bg-white/10 hover:bg-emerald-500 hover:text-slate-950 border border-white/15 text-[11px] font-bold text-white transition-all text-left flex items-center justify-between group active:scale-95 cursor-pointer shadow-sm"
                  >
                    <span className="truncate">{opt.label}</span>
                    <ArrowRight className="w-3 h-3 shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Destination Pill (If direct action destination exists and no option choice is pending) */}
          {lastAction?.destination && !lastAction?.options && (
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>{lastAction.autoExecute ? "Opened" : "Ready"}</span>
              </span>
              <button
                onClick={() => {
                  stopAnyAudio();
                  router.push(lastAction.destination);
                }}
                className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] px-2.5 py-1 rounded-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>Go to {lastAction.label || "Action"}</span>
                <ArrowRight className="w-3 h-3 stroke-[2.5]" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── The Corner Voice/Speaking Button ── */}
      <button
        onClick={handleAssistantClick}
        className={`relative p-4 sm:p-4.5 rounded-full shadow-2xl transition-all duration-300 cursor-pointer flex items-center justify-center border active:scale-95 ${
          assistantState === "speaking"
            ? "bg-gradient-to-tr from-teal-500 via-emerald-600 to-cyan-500 text-white border-emerald-300 shadow-teal-400/50 scale-110"
            : assistantState === "listening"
            ? "bg-gradient-to-tr from-emerald-600 to-teal-400 text-white border-white shadow-emerald-400/50 scale-110"
            : assistantState === "processing"
            ? "bg-slate-800 text-emerald-400 border-emerald-400 animate-spin"
            : "bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-400 text-white border-emerald-300/50 hover:shadow-emerald-500/40 hover:scale-105"
        }`}
        aria-label={
          assistantState === "speaking"
            ? "Stop speaking"
            : assistantState === "listening"
            ? "Stop listening"
            : "Speak with FarmVeda"
        }
        title={
          assistantState === "speaking"
            ? "Tap to stop speaking"
            : assistantState === "listening"
            ? "Tap to stop listening"
            : "Tap to speak with FarmVeda"
        }
      >
        {/* Speaking State: Volume / Soundwave Icon */}
        {assistantState === "speaking" && (
          <>
            <span className="absolute inset-0 rounded-full bg-teal-400 opacity-40 animate-ping pointer-events-none" />
            <span className="absolute -inset-2 rounded-full border-2 border-emerald-400/60 animate-pulse pointer-events-none" />
            <div className="relative flex items-center justify-center">
              <Volume2 className="w-6 h-6 sm:w-7 sm:h-7 text-white stroke-[2.5] animate-pulse" />
              {/* Mini equalizer bars inside button */}
              <div className="absolute -bottom-1 flex items-center gap-0.5 pointer-events-none">
                <span className="w-1 h-2 bg-emerald-200 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-3 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-2 bg-teal-200 rounded-full animate-bounce [animation-delay:-0.45s]" />
              </div>
            </div>
          </>
        )}

        {/* Listening State: Pulsing Mic */}
        {assistantState === "listening" && (
          <>
            <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-40 animate-ping pointer-events-none" />
            <span className="absolute -inset-2 rounded-full border border-emerald-400/70 animate-pulse pointer-events-none" />
            <div className="relative flex items-center justify-center">
              <Mic className="w-6 h-6 sm:w-7 sm:h-7 text-white stroke-[2.5] animate-bounce" />
            </div>
          </>
        )}

        {/* Processing State: Spinner */}
        {assistantState === "processing" && (
          <Radio className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400" />
        )}

        {/* Idle State: Standard Mic Icon */}
        {assistantState === "idle" && (
          <>
            <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-25 animate-ping pointer-events-none" />
            <div className="relative flex items-center justify-center">
              <Mic className="w-6 h-6 sm:w-7 sm:h-7 text-white stroke-[2.2]" />
              <Sparkles className="w-3.5 h-3.5 text-amber-300 absolute -top-1.5 -right-1.5" />
            </div>
          </>
        )}
      </button>
    </div>
  );
}
