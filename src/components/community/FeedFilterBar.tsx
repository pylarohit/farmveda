"use client";

import { POPULAR_CROPS } from "@/lib/communityService";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Flame,
  Clock,
  ShieldCheck,
  MapPin,
  User,
  Check,
  Filter,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FeedFilterBarProps {
  sort: "latest" | "popular" | "expert";
  onSortChange: (sort: "latest" | "popular" | "expert") => void;
  selectedCrop: string;
  onCropChange: (crop: string) => void;
  onlyMyPosts: boolean;
  onToggleMyPosts: (onlyMine: boolean) => void;
  nearbyActive: boolean;
  onToggleNearby: () => void;
}

export function FeedFilterBar({
  sort,
  onSortChange,
  selectedCrop,
  onCropChange,
  onlyMyPosts,
  onToggleMyPosts,
  nearbyActive,
  onToggleNearby,
}: FeedFilterBarProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs space-y-3">
      {/* Top Row: Sort and Special Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Sort Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => onSortChange("latest")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              sort === "latest"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Latest</span>
          </button>
          <button
            onClick={() => onSortChange("popular")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              sort === "popular"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Popular</span>
          </button>
          <button
            onClick={() => onSortChange("expert")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              sort === "expert"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Expert Answered</span>
          </button>
        </div>

        {/* Toggles (Nearby & My Posts) */}
        <div className="flex items-center gap-2">
          {/* Nearby Filter */}
          <button
            onClick={onToggleNearby}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
              nearbyActive
                ? "bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-400/20"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
            title="Show posts from nearby districts"
          >
            <MapPin className={cn("w-3.5 h-3.5", nearbyActive ? "text-emerald-600" : "text-slate-400")} />
            <span>Nearby</span>
          </button>

          {/* My Posts Filter */}
          <button
            onClick={() => onToggleMyPosts(!onlyMyPosts)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
              onlyMyPosts
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            <User className="w-3.5 h-3.5" />
            <span>My Posts</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: Popular Crop Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Filter className="w-3 h-3" />
          <span>Crop:</span>
        </span>
        {POPULAR_CROPS.map((crop) => {
          const isSelected =
            selectedCrop === crop ||
            (crop === "All Crops" && (!selectedCrop || selectedCrop === "All Crops"));

          return (
            <button
              key={crop}
              onClick={() => onCropChange(crop)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 border",
                isSelected
                  ? "bg-emerald-100/80 text-emerald-900 border-emerald-300 font-bold"
                  : "bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100"
              )}
            >
              {crop}
            </button>
          );
        })}
      </div>
    </div>
  );
}

