"use client";

import { useUserData } from "@/context/UserDataProvider";
import AnimatedButton from "@/components/ui/animated-button";
import SlidingCards from "../_components/SlidingCard";
import { Sprout, Plus } from "lucide-react";

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

      <div className="w-full max-w-[895px] mr-auto">
        <button className="w-full min-h-[280px] rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors shadow-sm flex flex-col items-center justify-center cursor-pointer group">
          <div className="h-12 w-12 rounded-full bg-slate-200/50 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
            <Plus className="h-6 w-6 text-slate-500 group-hover:text-slate-700 transition-colors" />
          </div>
          <span className="font-semibold text-slate-500 group-hover:text-slate-700 font-inter tracking-wide transition-colors">
            ADD FARMS
          </span>
        </button>
      </div>


    </div>
  );
}
