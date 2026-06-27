"use client";

import { useUserData } from "@/context/UserDataProvider";
import AnimatedButton from "@/components/ui/animated-button";
import SlidingCards from "../_components/SlidingCard";
import { Sprout } from "lucide-react";

export default function HomePage() {
  const { user } = useUserData();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Rotating Advertisement Banner Carousel */}
      <SlidingCards />

      {/* Welcome Greeting Row (No card box container, aligned with slider width) */}
      <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-[895px] mr-auto p-4 pl-0 py-2 select-none gap-4">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Blank Placeholder Cards */}
        <div className="h-48 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-400">
          Weather Overview
        </div>
        <div className="h-48 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-400">
          Crop Insights
        </div>
        <div className="h-48 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-400">
          Market Prices
        </div>
      </div>

      <div className="h-96 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-400">
        Main Activity Area
      </div>
    </div>
  );
}
