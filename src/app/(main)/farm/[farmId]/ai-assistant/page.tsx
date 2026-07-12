"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserData } from "@/context/UserDataProvider";
import {
  Sparkles,
  Send,
  Plus,
  X,
  Loader2,
  Brain,
  BookOpen,
  ChevronDown,
  ChevronUp,
  User,
  AlertCircle,
  BarChart3,
  ClipboardList,
  TrendingUp,
  Globe,
  Library,
  RefreshCw,
  Edit3,
  ChevronRight
} from "lucide-react";
import { LuBot, LuMic, LuSend } from "react-icons/lu";
import { toast } from "react-hot-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  mode?: "normal" | "reasoning" | "research";
  file?: {
    name: string;
    mimeType: string;
  };
}

export default function AIAssistantPage() {
  const params = useParams();
  const router = useRouter();
  const farmId = params.farmId as string;
  const { user } = useUserData();
  const supabase = createClient();

  const [farm, setFarm] = useState<any>(null);
  const [loadingFarm, setLoadingFarm] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<"normal" | "reasoning" | "research">("normal");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // File Upload State
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    mimeType: string;
    base64: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(",")[1];
      setAttachedFile({
        name: file.name,
        mimeType: file.type,
        base64: base64String,
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read file.");
    };
    reader.readAsDataURL(file);
  };

  // Load farm details
  useEffect(() => {
    async function loadFarm() {
      if (!farmId) return;
      try {
        const { data, error } = await supabase
          .from("farms")
          .select("*")
          .eq("id", farmId)
          .single();

        if (error) throw error;
        setFarm(data);
      } catch (err: any) {
        console.error("Error loading farm details:", err.message || err);
        toast.error("Failed to load farm context.");
      } finally {
        setLoadingFarm(false);
      }
    }
    loadFarm();
  }, [farmId]);

  // Load chat history from localStorage
  useEffect(() => {
    if (farmId) {
      const saved = localStorage.getItem(`farm_chat_${farmId}`);
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
        } catch (e) {
          console.error("Error parsing local chat history:", e);
        }
      } else {
        setMessages([]);
      }
    }
  }, [farmId]);

  // Load search history from localStorage
  useEffect(() => {
    if (farmId) {
      const savedHistory = localStorage.getItem(`farm_search_history_${farmId}`);
      if (savedHistory) {
        try {
          setSearchHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.error("Error parsing search history:", e);
        }
      } else {
        setSearchHistory([]);
      }
    }
  }, [farmId]);

  // Save chat history
  const saveMessages = (newMsgs: Message[]) => {
    setMessages(newMsgs);
    if (farmId) {
      localStorage.setItem(`farm_chat_${farmId}`, JSON.stringify(newMsgs));
    }
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Setup Web Speech API for voice typing
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "en-US";

        rec.onstart = () => {
          setIsListening(true);
        };

        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
          toast.success("Voice transcribed!");
        };

        rec.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          toast.error(`Voice error: ${event.error}`);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error("Speech-to-text recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // Build suggestion pills
  const getSuggestions = () => {
    if (farm) {
      const crop = farm.intended_crop || "my crop";
      const soil = farm.soil_type || "the field";
      return [
        {
          label: `🌱 Optimize Fertilizer for ${crop}`,
          subText: "Get customized N-P-K ratios.",
          prompt: `How can I optimize the fertilizer application and N-P-K ratios for my crop of ${crop} growing on ${soil} soil?`
        },
        {
          label: "💧 Irrigation Plan",
          subText: `Watering schedules for ${soil} soil.`,
          prompt: `Can you create a custom irrigation and watering schedule for my ${farm.area_size || "10"}-acre field of ${crop} which has ${soil} soil?`
        },
        {
          label: "🐛 Pest Defense",
          subText: `Preventative protocols for ${crop}.`,
          prompt: `What are the most common pests and diseases affecting ${crop} and how do I prevent them?`
        },
        {
          label: "📅 Crop Timeline",
          subText: `Sowing to harvest guide.`,
          prompt: `Please provide a step-by-step timeline from sowing to harvest for my field of ${crop} under the weather conditions of: ${farm.weather_conditions || "typical seasonal weather"}.`
        }
      ];
    }
    return [
      {
        label: "🌱 Fertilizer Ratios",
        subText: "Calculate ratios for key crops.",
        prompt: "What are the recommended N-P-K fertilizer ratios for main field crops?"
      },
      {
        label: "💧 Smart Irrigation",
        subText: "Modern water conservation.",
        prompt: "What are the best smart irrigation techniques for saving water?"
      },
      {
        label: "🐛 Organic Pesticides",
        subText: "Prepare eco-friendly sprays.",
        prompt: "How can I make natural organic pesticides at home?"
      },
      {
        label: "📅 Crop Rotation",
        subText: "Restore soil nutrients.",
        prompt: "Explain the benefits and standard layouts for crop rotation."
      }
    ];
  };

  const handleSuggestionClick = (promptText: string) => {
    setInput(promptText);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleNewChat = () => {
    saveMessages([]);
    toast.success("Conversation reset.");
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachedFile) || sending) return;

    const textToSend = input.trim() || `Analyze the attached file: ${attachedFile?.name}`;

    // Save to search history
    if (input.trim()) {
      const newQuery = input.trim();
      setSearchHistory((prev) => {
        const filtered = prev.filter((q) => q !== newQuery);
        const updated = [newQuery, ...filtered].slice(0, 5);
        if (farmId) {
          localStorage.setItem(`farm_search_history_${farmId}`, JSON.stringify(updated));
        }
        return updated;
      });
    }

    const userMsg: Message = {
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode,
      file: attachedFile ? { name: attachedFile.name, mimeType: attachedFile.mimeType } : undefined
    };

    const currentHistory = [...messages];
    const newMessages = [...currentHistory, userMsg];
    saveMessages(newMessages);

    const filePayload = attachedFile ? { mimeType: attachedFile.mimeType, data: attachedFile.base64 } : undefined;

    setInput("");
    setAttachedFile(null);
    setSending(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          history: currentHistory,
          farmData: farm,
          mode,
          file: filePayload
        })
      });

      if (!response.ok) {
        throw new Error("Failed to load response from API.");
      }

      const data = await response.json();

      const assistantMsg: Message = {
        role: "assistant",
        content: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode
      };

      saveMessages([...newMessages, assistantMsg]);
    } catch (err: any) {
      console.error("Chat error:", err);
      toast.error(err.message || "Failed to get AI response.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-125px)] w-full gap-2 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">

      {/* Dynamic Keyframes injected locally */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>

      {/* Main Chat Interface Container */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-transparent">

        {/* Top right corner new chat button after one search */}
        {messages.length > 0 && (
          <div className="px-4 md:px-8 pt-4 pb-2 flex justify-end">
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition-all duration-200 active:scale-95 shadow-sm"
            >
              <Plus size={14} className="text-slate-500" />
              <span>New Chat</span>
            </button>
          </div>
        )}

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-slate-200">
          {loadingFarm ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 font-inter text-sm gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              <span>Loading workspace...</span>
            </div>
          ) : messages.length === 0 ? (
            /* Empty Chat / Welcome State */
            <div className="h-full w-full flex flex-col items-center justify-center max-w-4xl mx-auto animate-in fade-in duration-700 pb-10">
              {/* Orb */}


              {/* Headings */}
              <h1 className="text-3xl md:text-[32px] font-sora font-semibold text-slate-900 text-center tracking-tight mb-2">
                Hi! I'm your Assistant.
              </h1>
              <h2 className="text-2xl md:text-[28px] font-sora font-medium text-slate-800 text-center mb-4">
                How can I help you today?
              </h2>
              <p className="text-slate-400 font-inter text-[15px] text-center mb-12">
                Ask me anything about your farm and I'll provide real-time insights
              </p>
            </div>
          ) : (
            /* Active Message List */
            <div className="space-y-6 max-w-4xl mx-auto">
              {messages.map((msg, index) => {
                const isUser = msg.role === "user";
                return (
                  <div key={index} className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}>

                    {/* Icon Column */}
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isUser ? "bg-slate-100 text-slate-700" : "bg-indigo-50 text-indigo-600"}`}>
                      {isUser ? <User size={16} /> : <Sparkles size={16} />}
                    </div>

                    {/* Chat Bubble */}
                    <div className="flex flex-col gap-1">
                      <div className={`rounded-2xl px-5 py-3.5 shadow-sm border ${isUser
                        ? "bg-slate-900 border-slate-950 text-white rounded-tr-none"
                        : "bg-white border-slate-200 text-slate-800 rounded-tl-none shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                        }`}>
                        {isUser ? (
                          <div className="flex flex-col gap-2">
                            {msg.file && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 w-fit font-mono font-medium">
                                <span>📎 {msg.file.name}</span>
                              </div>
                            )}
                            <div className="text-[15px] font-inter whitespace-pre-line leading-relaxed">{msg.content}</div>
                          </div>
                        ) : (
                          <AssistantMessage content={msg.content} isLatest={index === messages.length - 1} />
                        )}
                      </div>
                      {/* Timestamp */}
                      <span className={`text-[10px] text-slate-400 font-inter mt-0.5 ${isUser ? "text-right" : "text-left"}`}>
                        {msg.timestamp}
                      </span>
                    </div>

                  </div>
                );
              })}

              {/* Typing Loader Indicator */}
              {sending && (
                <div className="flex gap-3 max-w-[80%] mr-auto items-start">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Sparkles size={16} />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" />
                    <span className="h-2 w-2 rounded-full bg-slate-300 animate-bounce [animation-delay:0.2s]" />
                    <span className="h-2 w-2 rounded-full bg-slate-300 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar Area */}
        <div className="px-4 md:px-8 pb-8 pt-2 bg-transparent shrink-0 relative z-10">
          <div className="w-full max-w-4xl mx-auto flex flex-col bg-white border border-slate-100 shadow-[0_8px_40px_rgb(0,0,0,0.06)] rounded-[24px] p-3 focus-within:shadow-[0_8px_40px_rgb(99,102,241,0.1)] transition-all duration-300">

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Staged file attachment preview */}
            {attachedFile && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-150 rounded-xl w-fit mb-2 ml-3 text-xs text-slate-600 font-inter font-medium">
                <span>📎 {attachedFile.name}</span>
                <button
                  onClick={() => setAttachedFile(null)}
                  className="hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full p-0.5"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Input field */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Need quick insights...."
              rows={1}
              className="w-full bg-transparent border-0 outline-none focus:ring-0 text-slate-800 placeholder-slate-300 font-inter text-[15px] resize-none px-3 pt-3 pb-2 leading-relaxed"
              style={{ maxHeight: "200px" }}
            />

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between px-1 pb-1">

              {/* Left Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload File"
                  className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-400 transition-colors border border-slate-100 shadow-sm"
                >
                  <Plus size={18} />
                </button>
                <button
                  onClick={toggleListening}
                  className={`h-9 px-3.5 flex items-center gap-2 rounded-xl transition-colors border shadow-sm font-semibold font-inter text-[13px] ${isListening
                    ? "bg-rose-50 border-rose-100 text-rose-600 animate-pulse"
                    : "bg-white hover:bg-slate-50 border-slate-100 text-slate-600"
                    }`}
                >
                  <LuMic size={15} />
                  <span>Voice Record</span>
                </button>
              </div>

              {/* Right Action (Send) */}
              <button
                onClick={handleSend}
                disabled={sending || (!input.trim() && !attachedFile)}
                className={`h-10 w-10 flex items-center justify-center rounded-[12px] transition-all ${(input.trim() || attachedFile) && !sending
                  ? "bg-[#1C1F2E] text-white hover:bg-black hover:scale-105 shadow-md cursor-pointer"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <LuSend className="text-[18px] ml-0.5" />
                )}
              </button>
            </div>
          </div>

          {/* Latest Prompts / Recent Searches (Only show if empty) */}
          {messages.length === 0 && (
            <div className="w-full max-w-4xl mx-auto mt-6 flex flex-col gap-3 px-2">
              <div className="flex items-center justify-between">
                <span className="font-bold font-inter text-slate-800 text-[14px]">
                  {searchHistory.length > 0 ? "Recent Searches" : "Latest Prompts"}
                </span>
                {searchHistory.length > 0 ? (
                  <button
                    onClick={() => {
                      setSearchHistory([]);
                      if (farmId) {
                        localStorage.removeItem(`farm_search_history_${farmId}`);
                      }
                    }}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-rose-500 transition-colors text-[11px] font-semibold font-inter"
                  >
                    Clear History
                  </button>
                ) : (
                  <button className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 transition-colors text-[11px] font-medium font-inter">
                    <RefreshCw size={12} />
                    Refresh Prompts
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                {searchHistory.length > 0 ? (
                  searchHistory.map((query, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(query)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-[13px] font-semibold font-inter transition-all shadow-sm"
                    >
                      <Sparkles size={14} className="text-slate-400" />
                      {query}
                    </button>
                  ))
                ) : (
                  <>
                    <button onClick={() => handleSuggestionClick(`What's the best performing fertilizer for ${farm?.intended_crop || "my crop"}?`)} className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-[13px] font-semibold font-inter transition-all shadow-sm">
                      <Sparkles size={14} className="text-slate-400" />
                      What's the best performing fertilizer this month?
                    </button>
                    <button onClick={() => handleSuggestionClick("Give me a crop yield drop overview")} className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-[13px] font-semibold font-inter transition-all shadow-sm">
                      <Sparkles size={14} className="text-slate-400" />
                      Crop yield drop overview
                    </button>
                    <button onClick={() => handleSuggestionClick("Which fields are performing the best?")} className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-[13px] font-semibold font-inter transition-all shadow-sm">
                      <Sparkles size={14} className="text-slate-400" />
                      Fields are performing the best
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Simulated streaming typewriter effect for AI responses */
function StreamingText({ text, onComplete }: { text: string; onComplete?: () => void }) {
  const [displayedText, setDisplayedText] = useState("");
  const tokensRef = useRef<string[]>([]);
  const indexRef = useRef(0);

  useEffect(() => {
    tokensRef.current = text.match(/(\s+|\S+)/g) || [];
    indexRef.current = 0;
    setDisplayedText("");

    const interval = setInterval(() => {
      if (indexRef.current < tokensRef.current.length) {
        const nextText = tokensRef.current.slice(0, indexRef.current + 1).join("");
        setDisplayedText(nextText);
        indexRef.current++;
      } else {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 20); // 20ms per token for word-by-word streaming animation

    return () => clearInterval(interval);
  }, [text]);

  return <FormattedText text={displayedText} />;
}

/* Assistant Message Parser Subcomponent */
function AssistantMessage({ content, isLatest }: { content: string; isLatest?: boolean }) {
  const { thinking, body } = parseMessage(content);
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);

  return (
    <div className="flex flex-col gap-1 w-full max-w-full">
      {thinking && (
        <div className="border border-indigo-150 bg-indigo-50/10 rounded-xl overflow-hidden mb-2 max-w-full">
          <button
            onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
            className="w-full flex items-center justify-between px-3 py-1.5 bg-indigo-50/40 hover:bg-indigo-50/70 text-indigo-600 font-bold text-[10px] font-mono transition-colors"
          >
            <div className="flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 animate-pulse text-indigo-500" />
              <span>{isThinkingExpanded ? "COLLAPSE THINKING PROCESS" : "EXPAND THINKING PROCESS"}</span>
            </div>
            {isThinkingExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {isThinkingExpanded && (
            <div className="px-4 py-3 bg-white text-indigo-500/80 font-mono text-[10.5px] leading-relaxed border-t border-indigo-100/50 whitespace-pre-line max-h-48 overflow-y-auto">
              {thinking}
            </div>
          )}
        </div>
      )}

      {isLatest ? (
        <StreamingText text={body} />
      ) : (
        <FormattedText text={body} />
      )}
    </div>
  );
}

/* Inline text parser and structured block renderer */
function FormattedText({ text }: { text: string }) {
  if (!text) return null;

  // Split by line breaks to handle paragraphs and lists
  const lines = text.split("\n");

  return (
    <div className="space-y-2 text-slate-800 font-inter text-sm leading-relaxed max-w-full">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Handle Headings
        if (trimmed.startsWith("### ")) {
          return <h4 key={idx} className="text-sm font-bold text-slate-900 mt-3 mb-1 font-sora">{trimmed.replace("### ", "")}</h4>;
        }
        if (trimmed.startsWith("## ")) {
          return <h3 key={idx} className="text-base font-bold text-slate-900 mt-4 mb-2 font-sora">{trimmed.replace("## ", "")}</h3>;
        }
        if (trimmed.startsWith("# ")) {
          return <h2 key={idx} className="text-lg font-bold text-slate-900 mt-4 mb-2 font-sora">{trimmed.replace("# ", "")}</h2>;
        }

        // Handle Bullet Lists
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const content = trimmed.substring(2);
          return (
            <ul key={idx} className="list-disc pl-5 my-1 space-y-1">
              <li dangerouslySetInnerHTML={{ __html: formatInline(content) }} />
            </ul>
          );
        }

        // Handle Numbered Lists
        const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
        if (numMatch) {
          const num = numMatch[1];
          const content = numMatch[2];
          return (
            <ol key={idx} className="list-decimal pl-5 my-1 space-y-1">
              <li dangerouslySetInnerHTML={{ __html: formatInline(content) }} />
            </ol>
          );
        }

        // Standard paragraph
        return (
          <p
            key={idx}
            dangerouslySetInnerHTML={{ __html: formatInline(line) }}
            className={line.trim() === "" ? "h-2" : ""}
          />
        );
      })}
    </div>
  );
}

// Helper to format inline bold text
function formatInline(str: string): string {
  let formatted = str.replace(/\*\*(.*?)\*\*/g, "<strong class='font-bold text-slate-950'>$1</strong>");
  formatted = formatted.replace(/\*(.*?)\*/g, "<em class='italic'>$1</em>");
  formatted = formatted.replace(/`(.*?)`/g, "<code class='bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs text-rose-600'>$1</code>");
  return formatted;
}

// Split thinking from main text
const parseMessage = (content: string) => {
  const thinkingRegex = /\[THINKING\]([\s\S]*?)\[\/THINKING\]/i;
  const match = content.match(thinkingRegex);
  if (match) {
    const thinking = match[1].trim();
    const body = content.replace(thinkingRegex, "").trim();
    return { thinking, body };
  }
  return { thinking: undefined, body: content };
};
