"use client";

import { useEffect, useState } from "react";
import { useUserData } from "@/context/UserDataProvider";
import AnimatedButton from "@/components/ui/animated-button";
import SlidingCards from "../_components/SlidingCard";
import { Sprout, Plus, MapPin, Target, Droplets, Bookmark } from "lucide-react";
import { MarketPricesWidget } from "@/components/market-prices-widget";
import { WeatherWidget } from "@/components/weather-widget";
import { NewsWidget } from "@/components/news-widget";
import { AddFarmWizard } from "@/components/add-farm-wizard";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function HomePage() {
  const { user } = useUserData();
  const supabase = createClient();
  const [isAddFarmOpen, setIsAddFarmOpen] = useState(false);
  const [farms, setFarms] = useState<any[]>([]);

  const fetchFarms = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("farms")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setFarms(data);
      }
    } catch (error) {
      console.error("Error fetching farms:", error);
    }
  };

  useEffect(() => {
    fetchFarms();

    const handleOpenWizard = () => setIsAddFarmOpen(true);
    window.addEventListener('openAddFarmWizard', handleOpenWizard);
    
    return () => {
      window.removeEventListener('openAddFarmWizard', handleOpenWizard);
    };
  }, [user]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Two-column layout: left content + right Market Prices ───────── */}
      <div className="flex flex-col xl:flex-row items-stretch justify-between gap-6">

        {/* ── LEFT COLUMN: everything constrained to slider width ─── */}
        <div className="flex-1 min-w-0 flex flex-col gap-6 w-full">
          {/* Rotating Advertisement Banner Carousel */}
          <SlidingCards />

          {/* Welcome Greeting Row */}
          <div className="flex flex-col md:flex-row items-center justify-between w-full p-4 pl-0 py-2 select-none gap-4">
            <h2 className="text-2xl tracking-tight text-black dark:text-white font-sora text-left w-full md:w-auto font-normal">
              <span className="font-extrabold">Welcome, </span>
              <span>{user?.userName || "Rohit Pyla"}</span>
            </h2>
            <AnimatedButton
              onClick={() => setIsAddFarmOpen(true)}
              className="bg-white hover:bg-neutral-50 dark:bg-white dark:hover:bg-neutral-50 border border-neutral-250 dark:border-neutral-300 text-slate-950 dark:text-slate-950 text-sm font-normal rounded-xl px-10 py-2.5 shadow-sm flex items-center gap-3.5 cursor-pointer w-full md:w-auto justify-center"
            >
              <Sprout className="h-4 w-4 text-slate-900 stroke-[1.8]" />
              <span>
                <span className="font-bold">Add Farm</span>
              </span>
            </AnimatedButton>
          </div>

          <div className="w-full flex-1 flex flex-col gap-4">
            {farms.length > 0 ? (
              <div className="flex overflow-x-auto gap-4 pb-4 w-full custom-scrollbar items-stretch snap-x snap-mandatory">
                {farms.map((farm, idx) => {
                  const colors = ['bg-[#FFD166]', 'bg-[#D6C1FF]', 'bg-[#C1E6FF]', 'bg-[#FF9F1C]', 'bg-[#90BE6D]'];
                  const bgColor = colors[idx % colors.length];

                  return (
                    <div key={farm.id} className={`rounded-3xl p-5 border-[2px] border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between hover:shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] transition-shadow min-w-[280px] w-[280px] min-h-[260px] snap-start flex-shrink-0 cursor-pointer ${bgColor}`}>
                      
                      {/* Top Row: Area */}
                      <div className="flex justify-between items-start">
                        <div className="bg-slate-900 text-white text-[10px] font-semibold px-3 py-1 rounded-full font-inter tracking-wide shadow-sm flex items-center gap-1.5">
                          <MapPin size={12} className="text-emerald-400" />
                          Area: {farm.area_size ? `${farm.area_size} Acres` : 'N/A'}
                        </div>
                        <Bookmark className="h-5 w-5 text-slate-900 fill-slate-900" />
                      </div>

                      {/* Middle: Crop */}
                      <div className="mt-4 flex-1 pr-2">
                        <div className="text-[10px] uppercase font-bold tracking-widest text-slate-800/60 mb-0.5">Crop</div>
                        <h3 className="font-black text-slate-900 font-sora text-3xl leading-tight">
                          {farm.intended_crop || 'N/A'}
                        </h3>
                      </div>

                      {/* Middle: Address */}
                      <div className="mt-3 flex-1">
                        <div className="text-[9px] uppercase font-bold tracking-widest text-slate-800/60 mb-0.5">Address</div>
                        <p className="font-bold text-slate-900 font-inter text-xs leading-snug line-clamp-2 pr-2">
                          {farm.field_name ? (farm.field_name.includes("|||") ? (farm.field_name.split("|||")[1] || "N/A") : farm.field_name) : "N/A"}
                        </p>
                      </div>

                      {/* Bottom: View Button */}
                      <div className="mt-4 pt-4 border-t border-slate-900/10 flex">
                        <Link href={`/farm/${farm.id}`} className="w-full flex justify-center items-center bg-[#FF5A5F] hover:bg-[#FF3b40] text-white text-sm font-black px-4 py-2.5 rounded-xl transition-colors font-inter shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 active:shadow-none active:translate-y-[2px] active:translate-x-[2px] uppercase tracking-wide">
                          View Farm
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {/* Add New Farm Card */}
                <button
                  onClick={() => setIsAddFarmOpen(true)}
                  className="min-w-[320px] w-[320px] flex-shrink-0 h-[220px] rounded-3xl border-[2.5px] border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors shadow-sm flex flex-col items-center justify-center cursor-pointer group snap-start my-auto"
                >
                  <div className="h-12 w-12 rounded-full bg-slate-200/50 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
                    <Plus className="h-6 w-6 text-slate-500 group-hover:text-slate-700 transition-colors" />
                  </div>
                  <span className="font-bold text-slate-500 group-hover:text-slate-700 font-sora tracking-wide transition-colors">
                    Add New Farm
                  </span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddFarmOpen(true)}
                className="w-full flex-1 h-full min-h-[280px] rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors shadow-sm flex flex-col items-center justify-center cursor-pointer group"
              >
                <div className="h-12 w-12 rounded-full bg-slate-200/50 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
                  <Plus className="h-6 w-6 text-slate-500 group-hover:text-slate-700 transition-colors" />
                </div>
                <span className="font-semibold text-slate-500 group-hover:text-slate-700 font-inter tracking-wide transition-colors">
                  ADD FARMS
                </span>
              </button>
            )}
          </div>
        </div>




        {/* ── RIGHT COLUMN: Weather & Market Prices ─────────────────────────── */}
        <div className="w-full xl:w-[340px] xl:flex-shrink-0 flex flex-col gap-6">
          <WeatherWidget />
          <MarketPricesWidget />
        </div>

      </div>

      {/* ── SEPARATOR & NEWS SECTION ───────────────────────────────────── */}
      <div className="mt-12 mb-6 w-full">
        <hr className="border-slate-200 mb-8" />
        <h2 className="text-2xl font-bold text-slate-800 font-sora tracking-tight mb-6">Today's News</h2>
        <NewsWidget />
      </div>

      {isAddFarmOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-50 w-full h-full overflow-hidden">
          <AddFarmWizard
            onClose={() => setIsAddFarmOpen(false)}
            onSuccess={() => {
              setIsAddFarmOpen(false);
              fetchFarms();
            }}
          />
        </div>
      )}
    </div>
  );
}
