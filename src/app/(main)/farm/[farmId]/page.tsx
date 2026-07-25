"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserData } from "@/context/UserDataProvider";
import {
  CloudRain,
  Leaf,
  Mic,
  CalendarDays,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  AlertOctagon,
  FileText,
  MapPin,
  Info,
  Clock,
  Languages,
  ChevronDown,
  Map,
  Bot,
  ChevronRight,
  UploadCloud,
  Sparkles,
  Loader2,
  ImageIcon,
  MoreVertical,
  Play,
  Sprout,
  Droplet,
  Home
} from "lucide-react";
import { LuYoutube } from "react-icons/lu";

export default function FarmHomePage() {
  const params = useParams();
  const farmId = params.farmId as string;
  const supabase = createClient();
  const { user } = useUserData();

  const [farmData, setFarmData] = useState<any>(null);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [latestPhoto, setLatestPhoto] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>("Analyzing crop conditions...");
  const [loadingAnalysis, setLoadingAnalysis] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  
  const [localTasks, setLocalTasks] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState<boolean>(true);
  const [visibleCount, setVisibleCount] = useState<number>(6);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const handleVideoScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    // Check if scrolled near the right end
    const isNearEnd = target.scrollWidth - target.scrollLeft - target.clientWidth < 120;
    if (isNearEnd && visibleCount < videos.length && !loadingMore) {
      setLoadingMore(true);
      setTimeout(() => {
        setVisibleCount(prev => Math.min(prev + 3, videos.length));
        setLoadingMore(false);
      }, 750); // Beautiful mock loading delay
    }
  };

  const formatLocalDate = (dateInput: any) => {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  useEffect(() => {
    async function fetchDashboardData() {
      // Fetch farm details
      const { data: farm } = await supabase.from("farms").select("*").eq("id", farmId).single();
      if (farm) setFarmData(farm);

      // Fetch crop videos via SerpAPI
      try {
        const res = await fetch(`/api/crop-videos?crop=${encodeURIComponent(farm?.intended_crop || "Rice")}`);
        if (res.ok) {
          const videoData = await res.json();
          setVideos(videoData.videos || []);
        }
      } catch (err) {
        console.error("Video fetch error:", err);
      } finally {
        setLoadingVideos(false);
      }

      // Fetch calendar events
      const stored = localStorage.getItem(`farm_cal_events_${farmId}`);
      let localEvents: any[] = stored ? JSON.parse(stored) : [];

      // Fetch roadmap
      const { data: rmap } = await supabase.from("farm_roadmaps").select("*").eq("farm_id", farmId).single();
      if (rmap) {
        setRoadmap(rmap);
        if (rmap.steps) {
          const roadmapEvents: any[] = rmap.steps
            .filter((s: any) => s.estimatedDate)
            .map((s: any) => ({
              id: `rm_${s.title}`,
              date: formatLocalDate(s.estimatedDate),
              title: s.title,
              category: "task",
              done: s.status === "completed",
              fromRoadmap: true,
            }));

          // Merge roadmap steps: do not duplicate IDs
          const roadmapIds = new Set(roadmapEvents.map(e => e.id));
          const nonRoadmap = localEvents.filter((e) => !e.fromRoadmap && !roadmapIds.has(e.id));
          
          // Filter out roadmap events from localEvents that might have updated status
          const existingRoadmap = localEvents.filter((e) => e.fromRoadmap);
          const mergedRoadmap = roadmapEvents.map(re => {
            const match = existingRoadmap.find(er => er.id === re.id);
            return match ? { ...re, done: match.done } : re;
          });
          
          localEvents = [...nonRoadmap, ...mergedRoadmap];
        }
      }

      // Save initial loaded list back to localStorage to keep it set
      localStorage.setItem(`farm_cal_events_${farmId}`, JSON.stringify(localEvents));

      // Filter events to show only tasks of today's date
      const todayStr = formatLocalDate(new Date());
      
      const todayEvents = localEvents.filter((e) => e.date === todayStr);
      
      // Map to localTasks state structure
      setLocalTasks(todayEvents.map((e: any) => ({
        id: e.id,
        text: e.title,
        time: e.category.charAt(0).toUpperCase() + e.category.slice(1), // Category name like "Task", "Irrigation" etc.
        done: e.done
      })));

      // Fetch latest scan photo for the crop card
      const { data: latestScan } = await supabase
        .from("disease_scans")
        .select("image_data, created_at")
        .eq("farm_id", farmId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      let uploadedToday = false;
      if (latestScan) {
        if (latestScan.image_data) {
          setLatestPhoto(latestScan.image_data);
        }
        if (latestScan.created_at) {
          const scanDate = new Date(latestScan.created_at).toDateString();
          const todayDate = new Date().toDateString();
          uploadedToday = scanDate === todayDate;
        }
      }
      
      // Fetch Gemini Crop Analysis only if photo was uploaded today
      if (!uploadedToday) {
        setAiAnalysis("NO_TODAY_UPLOAD");
        setLoadingAnalysis(false);
      } else {
        try {
          const prompt = `Based on the farm data: Crop: ${farm?.intended_crop || "Rice"}, Soil: ${farm?.soil_type || "Alluvial"}, Area: ${farm?.area_size || "3"} acres. Provide a short summary of how the crop condition is right now and what is the exact next step the farmer should take. Keep it concise (under 60 words total). Format it with clear bullet points.`;
          
          const response = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: prompt,
              history: [],
              farmData: farm,
              mode: "normal"
            })
          });

          if (response.ok) {
            const resData = await response.json();
            setAiAnalysis(resData.text);
          } else {
            setAiAnalysis("Unable to retrieve AI analysis. Make sure your farm details are complete.");
          }
        } catch (err) {
          console.error("Analysis fetch error:", err);
          setAiAnalysis("Error loading analysis. Please check connection.");
        } finally {
          setLoadingAnalysis(false);
        }
      }
      
      setLoading(false);
    }
    fetchDashboardData();
  }, [farmId, supabase]);

  // Reactive listener to capture localStorage changes from the Calendar page
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `farm_cal_events_${farmId}`) {
        const stored = localStorage.getItem(`farm_cal_events_${farmId}`);
        if (stored) {
          const localEvents = JSON.parse(stored);
          const todayStr = formatLocalDate(new Date());
          const todayEvents = localEvents.filter((evt: any) => evt.date === todayStr);
          setLocalTasks(todayEvents.map((evt: any) => ({
            id: evt.id,
            text: evt.title,
            time: evt.category.charAt(0).toUpperCase() + evt.category.slice(1),
            done: evt.done
          })));
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [farmId]);

  const toggleTask = (id: string) => {
    // 1. Get all events from local storage
    const stored = localStorage.getItem(`farm_cal_events_${farmId}`);
    let allEvents: any[] = stored ? JSON.parse(stored) : [];
    
    // 2. Map and update the matched event
    const updatedEvents = allEvents.map(evt => evt.id === id ? { ...evt, done: !evt.done } : evt);
    
    // 3. Save back to local storage
    localStorage.setItem(`farm_cal_events_${farmId}`, JSON.stringify(updatedEvents));
    
    // 4. Update local tasks state
    setLocalTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const getStepIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("nursery") || t.includes("seed") || t.includes("selection")) return Sprout;
    if (t.includes("sow") || t.includes("plant") || t.includes("field") || t.includes("prep")) return Leaf;
    if (t.includes("water") || t.includes("irrigation") || t.includes("flow")) return Droplet;
    if (t.includes("harvest") || t.includes("store") || t.includes("storage")) return Home;
    return Leaf;
  };

  const cropName = farmData?.intended_crop || "Unknown Crop";
  
  // Safely parse farm name and location from the combined field_name column
  const rawFieldName = farmData?.field_name || "Your Farm";
  const farmName = rawFieldName.includes("|||") ? rawFieldName.split("|||")[0] : rawFieldName;
  const farmLocation = rawFieldName.includes("|||") ? rawFieldName.split("|||")[1] : "Location Not Set";

  // Calculate expected end date from roadmap
  const lastStep = roadmap?.steps?.[roadmap.steps.length - 1];
  const expectedEndDate = lastStep?.estimatedDate 
    ? new Date(lastStep.estimatedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : (roadmap?.start_date 
        ? new Date(new Date(roadmap.start_date).getTime() + 120 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
        : "Not Set");

  // Farmer-centric Mock Data based on cropName
  const mandiPrices = [
    { market: "Local APMC Mandi", price: "₹2,150/q", trend: "up", change: "+₹50", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { market: "District Central Market", price: "₹2,100/q", trend: "down", change: "-₹20", icon: TrendingDown, color: "text-rose-600", bg: "bg-rose-50" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50/50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full h-full overflow-y-auto overflow-x-hidden bg-slate-50 pb-24">
      
      {/* Main split grid */}
      <div className="grid grid-cols-1 xl:grid-cols-10 gap-6">
        
        {/* LEFT COLUMN (7 COLS - 70%) */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          
          {/* 1. NEW FARMER PROFILE BANNER (Split Design matching reference) */}
          <div className="w-full min-h-[320px] rounded-[24px] bg-white border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-10">
                 {/* Left Side (Farm Details Pane) */}
            <div className="col-span-10 md:col-span-6 p-8 md:p-10 flex flex-col justify-between bg-gradient-to-br from-white via-white to-blue-50/20">
              
              {/* Top part: Name & Farm Title */}
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <span className="text-lg font-black text-slate-800 tracking-wide">
                    Namaste, {user?.userName?.split(" ")[0] || "Farmer"} 👋
                  </span>
                  <span className="text-[10px] uppercase font-black tracking-widest text-[#7B92FF] bg-blue-50 px-2.5 py-1 rounded-full">
                    Active Farm Record
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-1">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight truncate">
                    {farmName}
                  </h1>
                  <span className="text-xs text-slate-400 font-bold max-w-[180px] truncate">
                    ({farmLocation})
                  </span>
                </div>

                {/* Farm Details Row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs text-slate-500 font-bold">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">Crop:</span>
                    <span className="text-slate-800 font-extrabold">{cropName}</span>
                  </div>
                  <span className="text-slate-300">|</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">Area:</span>
                    <span className="text-slate-800 font-extrabold">{farmData?.area_size || '0'} Acres</span>
                  </div>
                  <span className="text-slate-300">|</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">End Date:</span>
                    <span className="text-slate-800 font-extrabold">{expectedEndDate}</span>
                  </div>
                  <span className="text-slate-300">|</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">Soil:</span>
                    <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Optimal
                    </span>
                  </div>
                </div>
                         {/* Bottom part: Progress Line */}
              <div className="mt-8 mb-6 pr-4">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block mb-4">
                  Cultivation Progress
                </span>
                {roadmap?.steps && roadmap.steps.length > 0 ? (
                  <div className="relative flex items-center justify-between mt-6">
                    {/* Thick Gray track background */}
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 bg-slate-100 z-0 rounded-full" />
                    
                    {/* Thick Completed track progress */}
                    {(() => {
                      const visibleSteps = roadmap.steps.slice(0, 5);
                      const firstUpcomingIdx = visibleSteps.findIndex((s: any) => s.status === "upcoming");
                      const percent = firstUpcomingIdx === -1 
                        ? 100 
                        : firstUpcomingIdx === 0 
                          ? 0
                          : (firstUpcomingIdx / (visibleSteps.length - 1)) * 100;
                      return (
                        <div 
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-2 bg-blue-600 transition-all duration-500 z-0 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      );
                    })()}

                    {roadmap.steps.slice(0, 5).map((step: any, index: number) => {
                      const firstUpcomingIdx = roadmap.steps.findIndex((s: any) => s.status === "upcoming");
                      const isCompleted = step.status === "completed" || (firstUpcomingIdx !== -1 && index < firstUpcomingIdx);
                      const isCurrent = firstUpcomingIdx !== -1 && index === firstUpcomingIdx;
                      const StepIcon = getStepIcon(step.title);
                      
                      return (
                        <div key={index} className="relative z-10 flex flex-col items-center group">
                          
                          {/* Floating Hover Tooltip */}
                          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col bg-slate-900 text-white text-xs rounded-xl p-3 shadow-xl z-30 w-48 text-left transition-all duration-200">
                            <div className="flex items-center gap-1.5">
                              <StepIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span className="font-extrabold text-white text-sm truncate">{step.title}</span>
                            </div>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full mt-1.5 w-max ${
                              isCompleted ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'
                            }`}>
                              {isCompleted ? 'Completed' : isCurrent ? 'Active Stage' : 'Upcoming'}
                            </span>
                            {step.estimatedDate && (
                              <p className="text-[10px] text-slate-300 mt-2 font-semibold">
                                Target Date: {new Date(step.estimatedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            )}
                            {step.description && (
                              <p className="text-[10px] text-slate-400 mt-1 leading-normal font-medium line-clamp-3">
                                {step.description}
                              </p>
                            )}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                          </div>

                          {/* Node Dot */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border-2 cursor-pointer transform group-hover:scale-110 ${
                            isCompleted 
                              ? "bg-blue-600 border-blue-600 text-white shadow-md ring-4 ring-blue-50" 
                              : isCurrent
                                ? "bg-blue-600 border-white ring-4 ring-blue-100 animate-pulse text-white shadow-md"
                                : "bg-white border-slate-300 text-slate-400"
                          }`}>
                            {isCompleted ? (
                              <svg className="w-4 h-4 stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : isCurrent ? (
                              <span className="w-2 h-2 rounded-full bg-white" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                            )}
                          </div>

                          {/* Inline Icon + Label below dot point */}
                          <div className="absolute top-9 flex items-center gap-1 w-24 left-1/2 -translate-x-1/2 justify-center">
                            <StepIcon className={`w-3.5 h-3.5 shrink-0 ${isCompleted || isCurrent ? 'text-blue-600' : 'text-slate-400'}`} />
                            <span className={`text-[9px] font-black leading-tight text-left truncate max-w-[65px] ${
                              isCompleted 
                                ? "text-slate-800" 
                                : isCurrent
                                  ? "text-blue-600"
                                  : "text-slate-400"
                            }`}>
                              {step.title}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Fallback General Progress Dots */
                  <div className="relative flex items-center justify-between mt-6">
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 bg-slate-100 z-0 rounded-full" />
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-2 bg-blue-600 z-0 rounded-full w-[66.6%]" />
                    
                    {[
                      { title: "Sowing", done: true, current: false, icon: Leaf },
                      { title: "Nursery", done: true, current: false, icon: Sprout },
                      { title: "Growth", done: false, current: true, icon: Droplet },
                      { title: "Harvesting", done: false, current: false, icon: Home }
                    ].map((step, index) => {
                      const StepIcon = step.icon;
                      return (
                        <div key={index} className="relative z-10 flex flex-col items-center group">
                          
                          {/* Floating Hover Tooltip for Fallback */}
                          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col bg-slate-900 text-white text-xs rounded-xl p-3 shadow-xl z-30 w-40 text-left transition-all duration-200">
                            <div className="flex items-center gap-1.5">
                              <StepIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span className="font-extrabold text-white text-sm truncate">{step.title}</span>
                            </div>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full mt-1.5 w-max ${
                              step.done ? 'bg-emerald-500 text-white' : step.current ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'
                            }`}>
                              {step.done ? 'Completed' : step.current ? 'Active Stage' : 'Upcoming'}
                            </span>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                          </div>

                          {/* Node Dot */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border-2 cursor-pointer transform group-hover:scale-110 ${
                            step.done 
                              ? "bg-blue-600 border-blue-600 text-white shadow-md ring-4 ring-blue-50" 
                              : step.current
                                ? "bg-blue-600 border-white ring-4 ring-blue-100 animate-pulse text-white shadow-md"
                                : "bg-white border-slate-300 text-slate-400"
                          }`}>
                            {step.done ? (
                              <svg className="w-4 h-4 stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : step.current ? (
                              <span className="w-2 h-2 rounded-full bg-white" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                            )}
                          </div>

                          {/* Inline Icon + Label below dot point */}
                          <div className="absolute top-9 flex items-center gap-1 w-24 left-1/2 -translate-x-1/2 justify-center">
                            <StepIcon className={`w-3.5 h-3.5 shrink-0 ${step.done || step.current ? 'text-blue-600' : 'text-slate-400'}`} />
                            <span className={`text-[9px] font-black leading-tight text-left truncate max-w-[65px] ${
                              step.done 
                                ? "text-slate-800" 
                                : step.current
                                  ? "text-blue-600"
                                  : "text-slate-400"
                            }`}>
                              {step.title}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>     </div>
            </div>

            {/* Right Side (Image Upload Area) */}
            <div className="col-span-10 md:col-span-4 relative min-h-[250px] md:min-h-full overflow-hidden flex flex-col group cursor-pointer bg-black">
              <Link href={`/farm/${farmId}/disease`} className="absolute inset-0 w-full h-full bg-[#18181B] flex flex-col items-center justify-center p-6 text-center">
                
                {/* Default State (Visible when NOT hovered) */}
                <div className="flex flex-col items-center justify-center transition-all duration-300 group-hover:opacity-0 group-hover:scale-95">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                    <ImageIcon className="w-6 h-6 text-slate-500" />
                  </div>
                  <h3 className="text-[#D4D4D8] font-extrabold text-sm tracking-tight mb-1">
                    No thumbnail uploaded
                  </h3>
                  <p className="text-slate-400 text-[10px] max-w-[200px] leading-relaxed">
                    Note: This thumbnail is useful for project in community for others to preview project.
                  </p>
                </div>

                {/* Hover State (Visible ONLY when hovered) */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-95 group-hover:scale-100 bg-[#121214] border-2 border-dashed border-slate-700 rounded-[24px] m-2">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-3">
                    <UploadCloud className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-white font-extrabold text-sm tracking-tight mb-0.5">
                    Click to Upload Thumbnail
                  </h3>
                  <p className="text-slate-400 text-[10px]">
                    1280 × 300 Recommended (Max 1MB)
                  </p>
                </div>

              </Link>
            </div>
          </div>
          


          {/* QUICK ACTIONS (From reference image) */}
          <div className="flex flex-col gap-4 mt-2">
            <h2 className="text-xl font-medium text-slate-800 flex items-center gap-1.5">
              Quick Actions <ChevronDown className="w-4 h-4 text-blue-500" />
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Detect Disease (Lavender Folder) */}
              <Link href={`/farm/${farmId}/disease`} className="relative pt-4 group block select-none">
                {/* Folder Tab */}
                <div className="absolute top-0 left-0 h-[18px] w-28 bg-[#F3E8FF] border border-[#E9D5FF] border-b-0 rounded-t-xl transition-colors group-hover:bg-[#E9D5FF]/80" />
                
                {/* Folder Body */}
                <div className="relative z-10 bg-gradient-to-br from-[#FAF5FF] via-white to-[#F3E8FF]/30 border border-[#E9D5FF] rounded-2xl rounded-tl-none p-5 min-h-[145px] flex flex-col justify-between shadow-sm group-hover:shadow-md transition-all">
                  
                  {/* Title & Three Dots */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">Detect Disease</h3>
                    <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-600 transition-colors">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Horizontal Line */}
                  <div className="w-full h-px bg-slate-100 my-2" />

                  {/* Footer (Avatar and Items Count) */}
                  <div className="flex items-center justify-between mt-auto">
                    {/* Avatars */}
                    <div className="flex -space-x-1.5 overflow-hidden">
                      <div className="w-6 h-6 rounded-full bg-purple-100 border border-white flex items-center justify-center text-[10px] font-black text-purple-600">
                        🌱
                      </div>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-purple-600">
                      Scan Crop
                    </span>
                  </div>

                </div>
              </Link>
              
              {/* Card 2: AI Roadmap Maker (Amber Folder) */}
              <Link href={`/farm/${farmId}/roadmap`} className="relative pt-4 group block select-none">
                {/* Folder Tab */}
                <div className="absolute top-0 left-0 h-[18px] w-28 bg-[#FEF3C7] border border-[#FDE68A] border-b-0 rounded-t-xl transition-colors group-hover:bg-[#FDE68A]/80" />
                
                {/* Folder Body */}
                <div className="relative z-10 bg-gradient-to-br from-[#FFFBEB] via-white to-[#FEF3C7]/30 border border-[#FDE68A] rounded-2xl rounded-tl-none p-5 min-h-[145px] flex flex-col justify-between shadow-sm group-hover:shadow-md transition-all">
                  
                  {/* Title & Three Dots */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">AI Roadmap Maker</h3>
                    <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-600 transition-colors">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Horizontal Line */}
                  <div className="w-full h-px bg-slate-100 my-2" />

                  {/* Footer (Avatar and Items Count) */}
                  <div className="flex items-center justify-between mt-auto">
                    {/* Avatars */}
                    <div className="flex -space-x-1.5 overflow-hidden">
                      <div className="w-6 h-6 rounded-full bg-amber-100 border border-white flex items-center justify-center text-[10px] font-black text-amber-600">
                        📅
                      </div>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-600">
                      Roadmap
                    </span>
                  </div>

                </div>
              </Link>

              {/* Card 3: Ask AI Assistant (Sky Blue Folder) */}
              <Link href={`/farm/${farmId}/ai-assistant`} className="relative pt-4 group block select-none">
                {/* Folder Tab */}
                <div className="absolute top-0 left-0 h-[18px] w-28 bg-[#E0F2FE] border border-[#BAE6FD] border-b-0 rounded-t-xl transition-colors group-hover:bg-[#BAE6FD]/80" />
                
                {/* Folder Body */}
                <div className="relative z-10 bg-gradient-to-br from-[#F0F9FF] via-white to-[#E0F2FE]/30 border border-[#BAE6FD] rounded-2xl rounded-tl-none p-5 min-h-[145px] flex flex-col justify-between shadow-sm group-hover:shadow-md transition-all">
                  
                  {/* Title & Three Dots */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">Ask AI Assistant</h3>
                    <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-600 transition-colors">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Horizontal Line */}
                  <div className="w-full h-px bg-slate-100 my-2" />

                  {/* Footer (Avatar and Items Count) */}
                  <div className="flex items-center justify-between mt-auto">
                    {/* Avatars */}
                    <div className="flex -space-x-1.5 overflow-hidden">
                      <div className="w-6 h-6 rounded-full bg-sky-100 border border-white flex items-center justify-center text-[10px] font-black text-sky-600">
                        🤖
                      </div>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-sky-600">
                      Ask Gemini
                    </span>
                  </div>

                </div>
              </Link>

            </div>
          </div>

          {/* Weather Alert */}
          <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center shrink-0">
              <CloudRain className="w-8 h-8 text-sky-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                Weather Action Alert
                <span className="bg-sky-100 text-sky-700 text-[10px] uppercase font-black px-2 py-1 rounded-lg tracking-wider">Today</span>
              </h3>
              <p className="text-slate-600 text-base md:text-lg font-medium mt-1 leading-snug">
                Heavy rainfall is expected this afternoon. <strong className="text-rose-600">Do not spray pesticides or fertilizers today</strong> as they will wash away. Ensure field drainage is clear.
              </p>
            </div>
          </div>




        </div>

        {/* RIGHT COLUMN (3 COLS - 30%) */}
        <div className="xl:col-span-3 flex flex-col gap-6">
          
          {/* GEMINI CROP ANALYSIS */}
          <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm flex flex-col min-h-[320px]">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
              <h2 className="text-lg font-black text-slate-900">Gemini Crop Analysis</h2>
            </div>
            
            {loadingAnalysis ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 my-auto">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                <span className="text-xs text-slate-400 font-bold">Consulting AI Agronomist...</span>
              </div>
            ) : aiAnalysis === "NO_TODAY_UPLOAD" ? (
              <div className="flex flex-col items-center justify-center p-6 bg-indigo-50/10 rounded-2xl border border-dashed border-indigo-200 text-center gap-3 my-auto">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-200">
                  <Sparkles className="w-6 h-6 text-indigo-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Upload Photo for AI Report</h3>
                  <p className="text-slate-500 text-[11px] mt-1.5 leading-relaxed max-w-[220px]">
                    Please update your crop's photo today to unlock daily Gemini AI Crop Condition analysis and next steps.
                  </p>
                </div>
                <Link 
                  href={`/farm/${farmId}/disease`}
                  className="mt-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black rounded-xl transition-all duration-200 shadow-sm"
                >
                  Upload Photo Now
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-4 my-auto">
                <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-line bg-indigo-50/30 p-4 rounded-2xl border border-indigo-50/50">
                  {aiAnalysis}
                </div>
                <div className="text-[10px] text-indigo-500 font-black uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" /> Real-time Gemini Insight
                </div>
              </div>
            )}
          </div>

          {/* MY TASKS */}
          <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm flex flex-col">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-5">
              <CalendarDays className="w-6 h-6 text-amber-500" /> My Tasks
            </h2>

            <div className="flex flex-col gap-4 flex-1">
              {localTasks.length === 0 ? (
                <div className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  <p className="text-slate-600 font-bold">All caught up!</p>
                  <p className="text-slate-400 text-sm mt-1">No tasks scheduled for today.</p>
                </div>
              ) : (
                localTasks.map((task) => (
                  <div 
                    key={task.id} 
                    onClick={() => toggleTask(task.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                      task.done ? "bg-slate-50 border-transparent opacity-60" : "bg-white border-slate-200 hover:border-emerald-400 shadow-sm"
                    }`}
                  >
                    {task.done ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-slate-300 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-base font-bold mb-1 leading-snug ${task.done ? "text-slate-500 line-through" : "text-slate-800"}`}>
                        {task.text}
                      </p>
                      <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                        <Clock className="w-4 h-4" /> {task.time}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <Link href={`/farm/${farmId}/calender`} className="mt-4 text-center text-sm font-bold text-indigo-600 hover:text-indigo-800">
              View Full Farm Calendar
            </Link>
          </div>

          {/* MARKET CROP PRICES */}
          <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-600" /> Market Crop Prices
            </h2>
            <div className="flex flex-col gap-3">
              {mandiPrices.map((market, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${market.bg} ${market.color}`}>
                      <market.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-800 leading-snug">{market.market}</p>
                      <p className={`text-[10px] font-bold ${market.trend === 'up' ? 'text-emerald-600' : 'text-rose-600'} mt-0.5`}>
                        {market.change} from yesterday
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-900 text-base">{market.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* 4. CROP TRAINING & VIDEO GUIDES (SERPAPI YOUTUBE SEARCH) */}
      <div className="bg-white rounded-[24px] border border-slate-200 p-6 md:p-8 shadow-sm mt-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center border border-red-100 text-red-600">
              <LuYoutube className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Recommended {cropName} Video Guides</h2>
              <p className="text-xs text-slate-400 font-bold mt-0.5">Live expert cultivation videos via YouTube</p>
            </div>
          </div>
        </div>

        {loadingVideos ? (
          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-none">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse flex flex-col gap-3 shrink-0 w-[300px]">
                <div className="aspect-video w-full bg-slate-100 rounded-[20px]" />
                <div className="h-4 bg-slate-100 rounded-md w-3/4" />
                <div className="h-3 bg-slate-100 rounded-md w-1/2" />
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center p-8 bg-slate-50 rounded-2xl border border-slate-100">
            <LuYoutube className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-600 font-bold">No video guides found</p>
            <p className="text-slate-400 text-sm mt-1">Check back later for tutorials.</p>
          </div>
        ) : (
          <div 
            onScroll={handleVideoScroll}
            className="flex overflow-x-auto gap-6 pb-4 snap-x scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
          >
            {videos.slice(0, visibleCount).map((vid, idx) => (
              <a 
                href={vid.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                key={idx} 
                className="group flex flex-col justify-between bg-white border border-slate-200/70 rounded-[28px] p-4 shadow-sm hover:shadow-md transition-all duration-300 w-[300px] sm:w-[320px] shrink-0 snap-start select-none cursor-pointer"
              >
                <div>
                  {/* Rounded Thumbnail */}
                  <div className="aspect-video w-full rounded-[20px] overflow-hidden relative border border-slate-100 bg-slate-50">
                    <img 
                      src={vid.thumbnail} 
                      alt={vid.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-350"
                      loading="lazy"
                    />
                    {/* Small Play Badge on Hover */}
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white/95 shadow-sm flex items-center justify-center text-red-600 transform scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Video Title */}
                  <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-snug line-clamp-2 mt-4 min-h-[44px] group-hover:text-red-600 transition-colors">
                    {vid.title}
                  </h3>
                </div>

                {/* Footer Section matching News block */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                  {/* Channel Name as Pill */}
                  <span className="bg-slate-100 text-[10px] text-slate-500 font-extrabold uppercase px-3 py-1 rounded-full tracking-wider truncate max-w-[150px]">
                    {vid.channelName}
                  </span>
                  
                  {/* Duration with Clock Icon */}
                  <span className="text-xs text-slate-400 font-semibold flex items-center gap-1 shrink-0">
                    <Clock className="w-3.5 h-3.5" /> {vid.length}
                  </span>
                </div>
              </a>
            ))}

            {/* Loading Indicator Card at the End of Scroll */}
            {loadingMore && (
              <div className="animate-pulse flex flex-col justify-between bg-white border border-slate-200/70 rounded-[28px] p-4 shadow-sm w-[300px] sm:w-[320px] shrink-0 snap-start select-none">
                <div>
                  <div className="aspect-video w-full bg-slate-100 rounded-[20px] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                  </div>
                  <div className="h-4 bg-slate-100 rounded-md w-3/4 mt-4" />
                  <div className="h-4 bg-slate-100 rounded-md w-1/2 mt-2" />
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                  <div className="h-6 bg-slate-100 rounded-full w-24" />
                  <div className="h-4 bg-slate-100 rounded-full w-12" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
