"use client";

import { useState, useRef, useEffect } from "react";
import {
  Leaf,
  Search,
  ArrowRight,
  CheckCircle2,
  Loader2,
  CalendarDays,
  Target,
  Sparkles,
  Calendar as CalendarIcon,
  Plus,
  Minus,
  Menu,
  MoreHorizontal,
  PlayCircle,
  Mic,
  Send,
  UploadCloud
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DiaTextReveal } from "@/components/ui/dia-text-reveal";
import { SparklesText } from "@/components/ui/sparkles-text";
import { DotPattern } from "@/components/ui/dot-pattern";
import confetti from "canvas-confetti";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";

interface Step {
  title: string;
  description: string;
  duration: string;
  status: "completed" | "upcoming";
  estimatedDate?: Date;
  photoUrl?: string;
  aiReview?: string;
  isReviewing?: boolean;
}

interface RoadmapData {
  title: string;
  totalSteps: number;
  requirements: string;
  steps: Step[];
  startDate?: Date;
}

const addDurationToDate = (date: Date, durationStr: string): Date => {
  const match = durationStr.toLowerCase().match(/(\d+)\s*(day|week|month)s?/);
  if (!match) return new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
  const num = parseInt(match[1]);
  const unit = match[2];

  const newDate = new Date(date);
  if (unit === "day") newDate.setDate(newDate.getDate() + num);
  if (unit === "week") newDate.setDate(newDate.getDate() + (num * 7));
  if (unit === "month") newDate.setMonth(newDate.getMonth() + num);

  return newDate;
};

const cardColors = [
  "bg-blue-50 border-blue-100 text-blue-900",
  "bg-purple-50 border-purple-100 text-purple-900",
  "bg-amber-50 border-amber-100 text-amber-900",
  "bg-green-50 border-green-100 text-green-900"
];

export default function RoadmapPage() {
  const params = useParams();
  const [crop, setCrop] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadIndex, setActiveUploadIndex] = useState<number | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<(Step & { index: number }) | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"upcoming" | "history">("upcoming");

  const supabase = createClient();

  // 1. Fetch existing roadmap on mount
  useEffect(() => {
    async function fetchRoadmap() {
      const { data, error } = await supabase
        .from('farm_roadmaps')
        .select('*')
        .eq('farm_id', params.farmId)
        .single();
      if (data) {
        setRoadmap({
          title: data.crop ? `Roadmap for growing ${data.crop}` : "Roadmap",
          totalSteps: data.total_steps,
          requirements: data.requirements || "",
          steps: data.steps.map((s: any) => ({
            ...s,
            estimatedDate: s.estimatedDate ? new Date(s.estimatedDate) : undefined
          })),
          startDate: new Date(data.start_date)
        });
        setCrop(data.crop);
      }
      setInitialLoading(false);
    }
    fetchRoadmap();
  }, [params.farmId, supabase]);

  // Helper to sync roadmap steps to DB
  const saveRoadmapProgress = async (newSteps: Step[]) => {
    await supabase
      .from('farm_roadmaps')
      .update({ steps: newSteps, updated_at: new Date().toISOString() })
      .eq('farm_id', params.farmId);
  };

  const generateRoadmap = async () => {
    if (!crop.trim() || !startDate) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crop, farmData: { field_name: "your field" } })
      });
      if (res.ok) {
        const data = await res.json();

        let currentDate = new Date(startDate!);
        const stepsWithDates = data.steps.map((step: Step) => {
          currentDate = addDurationToDate(currentDate, step.duration);
          return { ...step, estimatedDate: new Date(currentDate) };
        });

        setRoadmap({
          ...data,
          startDate: new Date(startDate!),
          steps: stepsWithDates
        });

        // 2. Save generated roadmap to DB
        await supabase.from('farm_roadmaps').insert({
          farm_id: params.farmId,
          crop: crop,
          start_date: startDate.toISOString(),
          total_steps: data.totalSteps,
          requirements: data.requirements,
          steps: stepsWithDates
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#22C55E', '#3B82F6', '#F59E0B', '#A855F7']
    });
  };

  const toggleStepStatus = (index: number) => {
    if (!roadmap) return;
    const newRoadmap = { ...roadmap };
    const currentStatus = newRoadmap.steps[index].status;
    const nextStatus = currentStatus === "completed" ? "upcoming" : "completed";
    newRoadmap.steps[index].status = nextStatus;

    if (nextStatus === "completed") {
      triggerConfetti();
    }

    setRoadmap(newRoadmap);
    // 3. Sync status toggle
    saveRoadmapProgress(newRoadmap.steps);
  };

  const handlePhotoUploadClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveUploadIndex(index);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!roadmap || activeUploadIndex === null) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    const newRoadmap = { ...roadmap };
    newRoadmap.steps[activeUploadIndex].isReviewing = true;
    newRoadmap.steps[activeUploadIndex].photoUrl = localUrl;
    setRoadmap({ ...newRoadmap });

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("stepTitle", roadmap.steps[activeUploadIndex].title);
      formData.append("crop", crop);

      const res = await fetch("/api/ai/photo-review", {
        method: "POST",
        body: formData,
      });

      let review = "Photo uploaded successfully. Keep up the great work!";
      if (res.ok) {
        const data = await res.json();
        review = data.review || review;
      }

      setRoadmap(prev => {
        if (!prev) return prev;
        const updated = { ...prev };
        updated.steps[activeUploadIndex!].isReviewing = false;
        updated.steps[activeUploadIndex!].aiReview = review;
        // 4. Sync AI review to DB
        saveRoadmapProgress(updated.steps);
        return { ...updated };
      });
    } catch (err) {
      console.error(err);
      setRoadmap(prev => {
        if (!prev) return prev;
        const updated = { ...prev };
        updated.steps[activeUploadIndex!].isReviewing = false;
        updated.steps[activeUploadIndex!].aiReview = "Photo saved. AI review unavailable right now.";
        saveRoadmapProgress(updated.steps);
        return { ...updated };
      });
    } finally {
      setActiveUploadIndex(null);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ─── Initial screen ────────────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="min-h-full flex flex-col p-6 lg:p-12 relative font-sans bg-transparent overflow-hidden">
        <DotPattern
          className={cn("[mask-image:radial-gradient(600px_circle_at_center,white,transparent)]")}
          glow={true}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 w-full max-w-3xl mx-auto flex flex-col justify-center text-center space-y-8 pb-12"
        >
          <div>
            <SparklesText
              className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 mx-auto w-fit"
              colors={{ first: '#22C55E', second: '#16A34A' }}
              sparklesCount={8}
            >
              <DiaTextReveal text="Plan Your Season" textColor="#0F172A" />
            </SparklesText>
            <p className="text-[#64748B] text-base md:text-lg font-medium">
              Enter your crop and start date to generate a smart, step-by-step roadmap.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl mx-auto w-full flex flex-col gap-4 mt-auto relative z-10"
        >
          {/* Recommendations */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 px-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2 shrink-0">Try:</span>
            {["Tomatoes", "Rice", "Wheat", "Cotton", "Maize"].map(rec => (
              <button
                key={rec}
                onClick={() => setCrop(rec)}
                className="px-4 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-[#E8F6F0] hover:border-[#22C55E] hover:text-[#16A34A] text-sm font-semibold text-gray-700 transition-colors whitespace-nowrap shadow-sm"
              >
                {rec}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-[24px] p-2 border border-gray-100 text-left shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
            <input
              type="text"
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && crop.trim() && startDate && !loading) {
                  generateRoadmap();
                }
              }}
              placeholder="What crop are you planning to grow? (e.g. Tomatoes, Rice)"
              className="w-full bg-transparent px-5 py-4 outline-none text-[#0F172A] placeholder:text-gray-400 font-medium text-base"
            />
            <div className="flex items-center justify-between px-3 pb-2 mt-2">
              <div className="flex items-center gap-3">
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button className="h-10 px-5 rounded-full bg-gray-50 flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-colors gap-2 text-sm font-bold border border-gray-200 shadow-sm">
                      <CalendarIcon className="w-4 h-4" />
                      {startDate ? format(startDate, "PPP") : "Add Start Date"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-3xl overflow-hidden border-gray-100 shadow-xl" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date);
                        setIsCalendarOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <button
                onClick={generateRoadmap}
                disabled={loading || !crop.trim() || !startDate}
                className="w-12 h-12 rounded-full bg-[#16A34A] flex items-center justify-center text-white hover:bg-[#15803d] transition-colors disabled:opacity-50 shadow-md"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 -ml-0.5" />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Roadmap view ──────────────────────────────────────────────────────────
  const completedSteps = roadmap.steps.filter(s => s.status === "completed");
  const upcomingSteps = roadmap.steps.filter(s => s.status === "upcoming");
  const progressPercent = Math.round((completedSteps.length / roadmap.steps.length) * 100);
  const allCompleted = completedSteps.length === roadmap.steps.length;

  const toBullets = (text: string): string[] => {
    const raw = text.replace(/([.;])/g, '$1|').split('|').map(s => s.trim()).filter(s => s.length > 10);
    return raw.slice(0, 6);
  };

  return (
    <div className="flex flex-col xl:flex-row bg-transparent font-sans h-full w-full">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

      {/* ── Step Detail Popup ─────────────────────────────────────────────── */}
      {selectedStep && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedStep(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedStep(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${selectedStep.status === 'completed' ? 'bg-[#22C55E]/15' : 'bg-gray-100'}`}>
                {selectedStep.status === 'completed' ? '✅' : ['🌱', '💧', '🌾', '🪴', '🌿', '🍃'][selectedStep.index % 6]}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Step {selectedStep.index + 1}</p>
                <h2 className="text-xl font-extrabold text-[#0F172A] leading-tight">{selectedStep.title}</h2>
              </div>
            </div>

            {selectedStep.estimatedDate && (
              <div className="flex items-center gap-2 mb-5 text-xs font-semibold text-gray-500 bg-gray-50 w-fit px-3 py-1.5 rounded-full">
                <CalendarDays className="w-3.5 h-3.5" />
                Target: {selectedStep.estimatedDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            )}

            <div className="space-y-3 mb-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">What to do:</p>
              {toBullets(selectedStep.description).map((bullet, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#E8F6F0] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-extrabold text-[#16A34A]">{i + 1}</span>
                  </div>
                  <p className="text-sm text-[#334155] leading-relaxed">{bullet}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => { toggleStepStatus(selectedStep.index); setSelectedStep(null); }}
              className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all ${selectedStep.status === 'completed'
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-[#0F172A] text-white hover:bg-gray-800'
                }`}
            >
              {selectedStep.status === 'completed' ? 'Mark as Upcoming' : '✓ Mark as Completed'}
            </button>
          </motion.div>
        </div>
      )}

      {/* ── Main Timeline ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-8 lg:p-12">
        <div className="w-full">
          <div className="relative py-4">

            {/* Center spine */}
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-[2px] transform md:-translate-x-1/2 flex flex-col items-center">
              {roadmap.steps.map((step, idx) => {
                const isCompleted = step.status === "completed";
                const isFirst = idx === 0;
                const isLast = idx === roadmap.steps.length - 1;
                return (
                  <div key={idx} className="flex-1 w-full relative">
                    {!isFirst && (
                      <div className={cn("absolute top-0 h-1/2 w-full", isCompleted ? "bg-[#16A34A]" : "border-l-[2px] border-dashed border-[#CBD5E1]")} />
                    )}
                    {!isLast && (
                      <div className={cn("absolute top-1/2 bottom-0 w-full", isCompleted ? "bg-[#16A34A]" : "border-l-[2px] border-dashed border-[#CBD5E1]")} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Alternating step cards */}
            <div className="space-y-12 md:space-y-20 relative z-10">
              {roadmap.steps.map((step, index) => {
                const isEven = index % 2 === 0;
                const isCompleted = step.status === "completed";
                const dateStr = step.estimatedDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const cardBg = isCompleted ? "bg-[#F0FDF4] border border-[#BBF7D0]" : "bg-white border border-gray-100";
                const statusBadge = isCompleted ? "bg-[#22C55E]/10 text-[#16A34A]" : "bg-gray-100 text-gray-500";

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className={`flex flex-col md:flex-row items-start md:items-center ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} relative`}
                  >
                    {/* Mobile dot */}
                    <div className="absolute left-4 -translate-x-1/2 z-20 flex items-center justify-center w-6 h-6 bg-white rounded-full md:hidden">
                      <div className={`w-3 h-3 rounded-full ${isCompleted ? 'bg-[#16A34A]' : 'bg-[#CBD5E1]'}`}></div>
                    </div>

                    {/* Desktop SVG connector */}
                    <div className="hidden md:block absolute z-20 top-1/2"
                      style={{
                        left: isEven ? '50%' : 'auto',
                        right: isEven ? 'auto' : '50%',
                        transform: isEven ? 'translate(-1px, -50%)' : 'translate(1px, -50%)'
                      }}>
                      <svg width="80" height="60" viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x={isEven ? -5 : 75} y="0" width="10" height="60" fill="white" />
                        <path
                          d={isEven
                            ? (index === 0
                              ? "M 0,60 C 0,45 10,30 25,30 L 65,30"
                              : "M 0,0 C 0,15 10,30 25,30 L 65,30 M 0,60 C 0,45 10,30 25,30")
                            : (index === 0
                              ? "M 80,60 C 80,45 70,30 55,30 L 15,30"
                              : "M 80,0 C 80,15 70,30 55,30 L 15,30 M 80,60 C 80,45 70,30 55,30")}
                          stroke={isCompleted ? '#16A34A' : '#CBD5E1'}
                          strokeWidth="2"
                          strokeDasharray={isCompleted ? "none" : "4 4"}
                        />
                        <circle cx={isEven ? "70" : "10"} cy="30" r="6" fill={isCompleted ? '#16A34A' : '#CBD5E1'} />
                      </svg>
                    </div>

                    {/* Spacer */}
                    <div className="hidden md:block md:w-1/2"></div>

                    {/* Card — clickable */}
                    <div className={cn("w-full md:w-1/2 pl-12 md:pl-0", isEven ? "md:pl-16 md:pr-4" : "md:pr-16 md:pl-4")}>
                      <div
                        className={`p-6 rounded-3xl transition-all duration-300 relative text-left shadow-sm hover:shadow-lg cursor-pointer ${cardBg}`}
                        onClick={() => setSelectedStep({ ...step, index })}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-base ${isCompleted ? 'bg-[#22C55E]/15' : 'bg-gray-100'}`}>
                              {isCompleted ? '✅' : ['🌱', '💧', '🌾', '🪴', '🌿', '🍃'][index % 6]}
                            </div>
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${statusBadge}`}>
                              {isCompleted ? 'Completed 👋' : `Step ${index + 1}`}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-gray-400 bg-white/80 px-2 py-1 rounded-lg border border-gray-100">
                            {dateStr}
                          </span>
                        </div>

                        <h3 className="text-[17px] font-bold text-[#0F172A] mb-1.5 leading-snug">{step.title}</h3>
                        <p className="text-[#64748B] text-sm leading-relaxed line-clamp-3 mb-5">{step.description}</p>

                        <div className="flex items-center justify-between">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleStepStatus(index); }}
                            className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${isCompleted
                                ? 'bg-[#22C55E]/10 text-[#16A34A] border border-[#22C55E]/20'
                                : 'bg-[#0F172A] text-white hover:bg-gray-800'
                              }`}
                          >
                            {isCompleted ? 'Completed ✓' : 'Mark Done'}
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all shadow-sm"
                            >
                              <span className="text-xs">···</span>
                            </button>
                            {!isCompleted && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedStep({ ...step, index }); }}
                                className="w-8 h-8 rounded-full bg-[#0F172A] flex items-center justify-center text-white hover:bg-gray-800 transition-all shadow-sm"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {isCompleted && (
                          <div className="pt-4 mt-4 border-t border-[#22C55E]/10">
                            {step.photoUrl ? (
                              <div className="flex gap-3 items-start">
                                <img src={step.photoUrl} alt="Progress" className="w-14 h-14 rounded-2xl object-cover shadow-sm flex-shrink-0" />
                                <div className="flex-1 bg-white/70 p-3 rounded-2xl border border-[#E2E8F0]">
                                  {step.isReviewing ? (
                                    <div className="flex items-center gap-2 h-full text-[#16A34A]">
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      <span className="text-xs font-medium">AI is analyzing...</span>
                                    </div>
                                  ) : (
                                    <>
                                      <h4 className="text-[11px] font-bold text-[#334155] mb-1 flex items-center gap-1">
                                        <Sparkles className="w-3 h-3 text-[#22C55E]" /> AI Review
                                      </h4>
                                      <p className="text-[11px] text-[#475569] leading-snug line-clamp-3">{step.aiReview}</p>
                                    </>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                className="w-full rounded-2xl py-4 border-dashed border-2 border-[#22C55E]/30 text-[#16A34A] hover:border-[#22C55E] hover:bg-[#F0FDF4] bg-transparent text-xs font-bold gap-2"
                                onClick={(e) => handlePhotoUploadClick(index, e)}
                                disabled={step.isReviewing}
                              >
                                {step.isReviewing ? (
                                  <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                                ) : (
                                  <><UploadCloud className="w-4 h-4" /> Upload Progress Photo</>
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Connector to Sell Crop bar */}
            <div className="flex flex-col items-center mt-16">
              <div className={cn("w-[2px] h-12", allCompleted ? "bg-[#16A34A]" : "border-l-[2px] border-dashed border-[#CBD5E1]")} />
              <div className={cn("w-3 h-3 rounded-full mb-4", allCompleted ? "bg-[#16A34A]" : "bg-[#CBD5E1]")} />
            </div>
          </div>

          {/* ── Sell Crop full-width bar ────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={cn(
              "w-full rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 border-2 transition-all duration-500",
              allCompleted
                ? "bg-gradient-to-r from-[#16A34A] to-[#22C55E] border-transparent shadow-lg shadow-green-200"
                : "bg-white border-dashed border-gray-200"
            )}
          >
            <div className="flex items-center gap-4">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0", allCompleted ? "bg-white/20" : "bg-gray-50")}>
                🛒
              </div>
              <div>
                <p className={cn("text-xs font-bold uppercase tracking-widest mb-0.5", allCompleted ? "text-green-100" : "text-gray-400")}>
                  Final Step
                </p>
                <h3 className={cn("text-xl font-extrabold", allCompleted ? "text-white" : "text-gray-300")}>
                  Sell Your Crop
                </h3>
                <p className={cn("text-sm mt-0.5", allCompleted ? "text-green-100" : "text-gray-400")}>
                  {allCompleted
                    ? `Your ${crop} is ready! List it on the marketplace and connect with buyers.`
                    : `Complete all ${roadmap.steps.length} steps to unlock the marketplace.`}
                </p>
              </div>
            </div>

            <button
              disabled={!allCompleted}
              className={cn(
                "px-8 py-3.5 rounded-2xl font-bold text-sm transition-all whitespace-nowrap flex-shrink-0",
                allCompleted
                  ? "bg-white text-[#16A34A] hover:bg-green-50 shadow-md"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              {allCompleted ? '🚀 Go to Marketplace' : `${completedSteps.length}/${roadmap.steps.length} Steps Done`}
            </button>
          </motion.div>
        </div>
      </div>

      {/* ── Right Sidebar ─────────────────────────────────────────────────── */}
      <div className="hidden xl:flex flex-col w-[380px] flex-shrink-0 border-l border-gray-100 bg-white overflow-y-auto">
        <div className="p-6 pt-8">

          {/* Progress Card */}
          <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-base font-bold text-[#0F172A]">My Progress</h2>
              <span className="text-base font-extrabold text-[#16A34A]">{progressPercent}%</span>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 bg-[#F8FAFC] p-4 rounded-2xl flex flex-col items-center justify-center border border-gray-50">
                <div className="text-2xl font-bold text-[#0F172A]">{roadmap.steps.length}</div>
                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mt-1">Total</div>
              </div>
              <div className="flex-1 bg-[#E8F6F0] p-4 rounded-2xl flex flex-col items-center justify-center border border-[#DCFCE7]">
                <div className="text-2xl font-bold text-[#16A34A] relative">
                  {completedSteps.length}
                  <div className="absolute -top-1 -right-3 text-[10px]">🎉</div>
                </div>
                <div className="text-[10px] font-bold text-[#15803D] uppercase tracking-wider mt-1">Done</div>
              </div>
              <div className="flex-1 bg-[#F8FAFC] p-4 rounded-2xl flex flex-col items-center justify-center border border-gray-50">
                <div className="text-2xl font-bold text-[#64748B]">{upcomingSteps.length}</div>
                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mt-1">Left</div>
              </div>
            </div>
          </div>

          {/* History / Upcoming Tabs */}
          <div>
            {/* Tab Buttons */}
            <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-2xl mb-5">
              <button
                onClick={() => setSidebarTab("upcoming")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                  sidebarTab === "upcoming"
                    ? "bg-white text-[#0F172A] shadow-sm"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setSidebarTab("history")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                  sidebarTab === "history"
                    ? "bg-white text-[#0F172A] shadow-sm"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                History
              </button>
            </div>

            {/* Upcoming Tab — shows only the next upcoming task */}
            {sidebarTab === "upcoming" && (() => {
              const nextStep = roadmap.steps.find(s => s.status === "upcoming");
              const nextIdx = roadmap.steps.findIndex(s => s.status === "upcoming");
              if (!nextStep) {
                return (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                    <span className="text-3xl">🎉</span>
                    <p className="text-sm font-bold text-[#16A34A]">All steps completed!</p>
                    <p className="text-xs text-[#64748B]">You've finished every task on the roadmap.</p>
                  </div>
                );
              }
              const colorClass = cardColors[nextIdx % cardColors.length];
              const dateStr = nextStep.estimatedDate?.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: '2-digit' });
              return (
                <motion.div
                  key={nextIdx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${colorClass} rounded-[24px] p-5 shadow-sm border relative cursor-pointer hover:shadow-md transition-shadow`}
                  onClick={() => setSelectedStep({ ...nextStep, index: nextIdx })}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-white/60 rounded-lg">
                        <Target className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wide">Next Task</span>
                    </div>
                    <span className="text-xs font-bold uppercase">{dateStr}</span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed mb-4">
                    {nextStep.title} — {nextStep.description.slice(0, 80)}...
                  </p>
                  <div className="bg-white/60 px-3 py-1.5 rounded-full w-fit flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">{nextStep.duration}</span>
                  </div>
                </motion.div>
              );
            })()}

            {/* History Tab — shows all completed tasks */}
            {sidebarTab === "history" && (
              <div className="space-y-3">
                {completedSteps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                    <span className="text-3xl">📋</span>
                    <p className="text-sm font-bold text-[#64748B]">No completed tasks yet</p>
                    <p className="text-xs text-[#94A3B8]">Mark steps as done to see them here.</p>
                  </div>
                ) : (
                  roadmap.steps.map((step, idx) => {
                    if (step.status !== "completed") return null;
                    const dateStr = step.estimatedDate?.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: '2-digit' });
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[20px] p-4 flex items-start gap-3 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedStep({ ...step, index: idx })}
                      >
                        <div className="w-8 h-8 rounded-xl bg-[#22C55E]/15 flex items-center justify-center flex-shrink-0 text-base">
                          ✅
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#0F172A] leading-snug truncate">{step.title}</p>
                          <p className="text-[11px] text-[#16A34A] font-semibold mt-0.5">{dateStr}</p>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
