"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronRight, Heart, MoreHorizontal, Clock, Calendar, CheckCircle2, ShieldCheck, MapPin, Plus, Activity, TrendingUp, Flame, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import RentHireSlider from "./_components/RentHireSlider";
import { CreateListingModal } from "./_components/CreateListingModal";
import { createClient } from "@/lib/supabase/client";

export default function RentAndHirePage() {
  const [activeTab, setActiveTab] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchListings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rent_listings")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching listings:", error);
    } else {
      setListings(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchListings();
  }, []);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="flex flex-col xl:flex-row items-stretch justify-between gap-6 pb-10">

        {/* ── LEFT COLUMN (Widgets) ── */}
        <div className="w-full xl:w-[340px] xl:flex-shrink-0 flex flex-col gap-6">

          {/* Create Post Box */}
          <div className="bg-white dark:bg-[#0A0E1A] rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all border border-slate-100 dark:border-[#1E293B] flex flex-col items-center justify-center text-center gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-full text-blue-600 dark:text-blue-400">
              <Plus size={32} />
            </div>
            <div>
              <h3 className="font-sora font-black text-slate-900 dark:text-white text-xl">Create a Listing</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Have equipment or skills to offer? Post them here.</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full bg-[#1E6BFF] hover:bg-[#1655D0] text-white font-bold py-3.5 rounded-2xl text-sm transition-all shadow-md active:scale-95 mt-2"
            >
              Create Post
            </button>
          </div>

          {/* Activity Box */}
          <div className="bg-white dark:bg-[#0A0E1A] rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all border border-slate-100 dark:border-[#1E293B] flex flex-col flex-1 min-h-[300px]">
            <h3 className="font-sora font-black text-slate-900 dark:text-white text-xl flex items-center gap-2 mb-8">
              <Activity size={22} className="text-[#D3F36B]" />
              Your Activity
            </h3>

            <div className="flex flex-col gap-6">
              <div className="flex gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0 ring-4 ring-blue-50 dark:ring-blue-900/20"></div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Rented a Tractor</p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">2 days ago</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0 ring-4 ring-emerald-50 dark:ring-emerald-900/20"></div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Posted "Skilled Harvester"</p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">5 days ago</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0 ring-4 ring-amber-50 dark:ring-amber-900/20"></div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Reviewed John Deere</p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">1 week ago</p>
                </div>
              </div>
            </div>

            <button className="mt-8 w-full border-2 border-slate-100 dark:border-[#1E293B] text-slate-600 dark:text-slate-300 font-bold py-3 rounded-2xl text-sm hover:bg-slate-50 dark:hover:bg-[#131B2C] transition-all">
              View All
            </button>
          </div>

        </div>

        {/* ── RIGHT COLUMN (Main Content) ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-8 w-full">

          {/* ── Top Banner / Advertisement Section ── */}
          <RentHireSlider />

          {/* ── Listings Grid Section ── */}
          <div className="flex flex-col gap-6 mt-4">

            {/* Section Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <h2 className="text-2xl font-black font-sora text-slate-900 dark:text-white flex items-center gap-3">
                All Listings
                <Badge variant="secondary" className="text-[10px] uppercase font-bold bg-slate-100 dark:bg-[#1E293B] text-slate-500 px-2.5 py-1 rounded-full">
                  {listings.length} Available
                </Badge>
              </h2>

              <div className="bg-white dark:bg-[#0A0E1A] border border-slate-200 dark:border-[#1E293B] rounded-full px-4 py-2 flex items-center gap-2 text-sm font-bold shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
                Categories <ChevronRight size={16} className="rotate-90 text-slate-400" />
              </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {loading ? (
                <div className="col-span-full py-20 flex justify-center items-center">
                  <Loader2 className="animate-spin text-blue-500" size={32} />
                </div>
              ) : listings.length === 0 ? (
                <div className="col-span-full py-20 text-center text-slate-500 font-medium">
                  No listings found. Be the first to post!
                </div>
              ) : listings.filter(item => activeTab === "all" || item.type === activeTab).map((item, idx) => (
                <div key={idx} className="bg-white dark:bg-[#0A0E1A] rounded-[28px] p-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 dark:border-[#1E293B] flex flex-col group hover:-translate-y-1">

                  {/* Card Image */}
                  <div className="relative w-full h-[220px] rounded-[20px] overflow-hidden mb-5 bg-slate-100">
                    <Image src={item.image || '/rent.jpg'} alt={item.title} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-700" />

                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-slate-900 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-white shadow-sm transition-colors">
                      <Heart size={14} className={item.liked ? "fill-red-500 text-red-500" : "text-slate-400"} />
                    </div>

                    <div className="absolute bottom-3 left-3">
                      <div className="bg-white/90 backdrop-blur-md text-slate-900 text-[10px] font-bold px-3 py-1.5 rounded-full shadow-sm uppercase tracking-wide">
                        {item.type === 'rent' ? 'Equipment' : 'Labor'}
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="flex flex-col flex-1 px-1">
                    {/* Location */}
                    <div className="flex items-center gap-1.5 mb-2.5 text-slate-500 dark:text-slate-400">
                      <MapPin size={12} />
                      <span className="text-[11px] font-semibold tracking-wide uppercase">{item.location}</span>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white font-sora leading-tight mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                      {item.title}
                    </h3>

                    {/* Price */}
                    <div className="flex items-end gap-1.5 mb-6 mt-auto">
                      <p className="font-black text-slate-900 dark:text-white text-2xl leading-none">₹{Number(item.price).toLocaleString()}</p>
                      <span className="text-sm text-slate-500 font-medium font-inter mb-0.5">/ {item.unit}</span>
                    </div>

                    {/* Button */}
                    <button className={`w-full text-white font-bold py-3.5 rounded-2xl text-sm shadow-sm transition-all active:scale-95 ${item.type === 'rent'
                        ? 'bg-[#1E6BFF] hover:bg-[#1655D0] shadow-blue-500/20'
                        : 'bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 shadow-slate-900/20'
                      }`}>
                      {item.type === 'rent' ? 'Rent Now' : 'Book Now'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <CreateListingModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchListings();
        }}
      />
    </div>
  );
}
