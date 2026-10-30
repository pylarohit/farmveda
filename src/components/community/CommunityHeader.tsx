"use client";

import { useEffect, useRef } from "react";
import { Search, Plus, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CommunityHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCreateClick: () => void;
  onNotificationsClick: () => void;
  unreadNotificationsCount?: number;
}

export function CommunityHeader({
  searchQuery,
  onSearchChange,
  onCreateClick,
  onNotificationsClick,
  unreadNotificationsCount = 1,
}: CommunityHeaderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {
        // Safe autoplay fallback
      });
    }
  }, []);

  return (
    <div className="relative rounded-3xl text-white p-6 sm:p-8 shadow-2xl overflow-hidden border border-emerald-500/30 bg-slate-950">
      {/* Background Video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover opacity-75 transition-opacity duration-700 pointer-events-none"
      >
        <source src="/port.mp4" type="video/mp4" />
      </video>

      {/* Cinematic Emerald Overlays for Contrast & Readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-950/75 to-slate-950/85 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none" />

      {/* Ambient Glow Accents */}
      <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute left-1/4 -bottom-16 w-80 h-80 bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Title & Slogan */}
        <div className="space-y-1.5 max-w-xl">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-sora text-white drop-shadow-md">
            FarmVeda Community
          </h1>
          <p className="text-emerald-200/90 text-sm sm:text-base font-medium drop-shadow-xs">
            Connect. Share. Learn. Grow Together.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
          {/* Notifications Button */}
          <button
            onClick={onNotificationsClick}
            className="relative p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-sm active:scale-95"
            title="Community Notifications"
            type="button"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-emerald-900 shadow-sm animate-pulse">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Create Post Button */}
          <Button
            onClick={onCreateClick}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-5 py-2.5 h-11 rounded-2xl shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer active:scale-95 border border-emerald-300/40"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Ask & Share</span>
          </Button>
        </div>
      </div>

      {/* Community Search Bar */}
      <div className="relative z-10 mt-6 pt-2">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-300/80 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search crop problems, pest symptoms, fertilizers, or farmer discussions..."
            className="w-full pl-11 pr-4 h-12 bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white placeholder:text-emerald-200/70 border-white/20 rounded-2xl shadow-inner text-sm backdrop-blur-md transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-200 hover:text-white px-2 py-0.5 rounded-md bg-white/10 cursor-pointer"
              type="button"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

