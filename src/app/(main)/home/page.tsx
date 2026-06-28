"use client";

import { useUserData } from "@/context/UserDataProvider";
import AnimatedButton from "@/components/ui/animated-button";
import SlidingCards from "../_components/SlidingCard";
import { Sprout, Plus } from "lucide-react";
import { MarketPricesWidget } from "@/components/market-prices-widget";
import { WeatherWidget } from "@/components/weather-widget";
import { NewsWidget } from "@/components/news-widget";

export default function HomePage() {
  const { user } = useUserData();

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
              className="bg-white hover:bg-neutral-50 dark:bg-white dark:hover:bg-neutral-50 border border-neutral-250 dark:border-neutral-300 text-slate-950 dark:text-slate-950 text-sm font-normal rounded-xl px-10 py-2.5 shadow-sm flex items-center gap-3.5 cursor-pointer w-full md:w-auto justify-center"
            >
              <Sprout className="h-4 w-4 text-slate-900 stroke-[1.8]" />
              <span>
                <span className="font-bold">Add Farm</span>
              </span>
            </AnimatedButton>
          </div>

          <div className="w-full flex-1 flex flex-col">
            <button className="w-full flex-1 h-full min-h-[280px] rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors shadow-sm flex flex-col items-center justify-center cursor-pointer group">
              <div className="h-12 w-12 rounded-full bg-slate-200/50 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
                <Plus className="h-6 w-6 text-slate-500 group-hover:text-slate-700 transition-colors" />
              </div>
              <span className="font-semibold text-slate-500 group-hover:text-slate-700 font-inter tracking-wide transition-colors">
                ADD FARMS
              </span>
            </button>
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
    </div>
  );
}
