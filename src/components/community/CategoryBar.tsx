"use client";

import { useRef } from "react";
import { COMMUNITY_CATEGORIES } from "@/lib/communityService";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CategoryBarProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

export function CategoryBar({
  selectedCategory,
  onSelectCategory,
}: CategoryBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -240 : 240;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <div className="relative flex items-center w-full group">
      {/* Scroll Left Button */}
      <button
        onClick={() => scroll("left")}
        className="hidden md:flex absolute -left-3.5 z-10 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md items-center justify-center text-slate-700 hover:text-emerald-700 hover:scale-105 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
        aria-label="Scroll categories left"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Category Scroll Container */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-0.5 w-full scroll-smooth"
      >
        {COMMUNITY_CATEGORIES.map((cat) => {
          const isSelected =
            selectedCategory === cat.id ||
            (cat.id === "all" && (!selectedCategory || selectedCategory === "all"));

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 shrink-0 cursor-pointer border select-none",
                isSelected
                  ? "bg-emerald-700 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-500/20"
                  : "bg-white text-slate-700 border-slate-200/80 hover:bg-emerald-50/60 hover:border-emerald-300 hover:text-emerald-800"
              )}
            >
              <span className="text-sm">{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Scroll Right Button */}
      <button
        onClick={() => scroll("right")}
        className="hidden md:flex absolute -right-3.5 z-10 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md items-center justify-center text-slate-700 hover:text-emerald-700 hover:scale-105 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
        aria-label="Scroll categories right"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

