"use client";

import React, { useEffect, useState } from "react";
import { MoreVertical, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MandiRecord {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  grade: string;
  arrival_date: string;
  min_price: number;
  max_price: number;
  modal_price: number;
}

export function MarketPricesWidget() {
  const [data, setData] = useState<MandiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const apiKey = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b";
        const url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&limit=50`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.records) {
          setData(json.records);
        }
      } catch (error) {
        console.error("Error fetching market prices:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getAccentColor = (index: number) => {
    const colors = ["bg-red-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500"];
    return colors[index % colors.length];
  };

  const getTrendIcon = (min: number, max: number, modal: number) => {
    if (modal > (min + max) / 2) {
      return <TrendingUp className="h-3 w-3 text-emerald-500" />;
    } else if (modal < (min + max) / 2) {
      return <TrendingDown className="h-3 w-3 text-red-500" />;
    }
    return <Minus className="h-3 w-3 text-slate-500" />;
  };

  return (
    <>
    <div className="w-full flex-shrink-0 bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-slate-800 text-lg font-sora">Market Prices</h3>
        <button 
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
          onClick={() => setIsModalOpen(true)}
        >
          View All <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* List */}
      <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-1.5 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : data.length > 0 ? (
          data.slice(0, 3).map((item, idx) => (
            <div key={idx} className="flex gap-3 relative group cursor-pointer hover:bg-slate-50 p-1.5 -mx-1.5 rounded-xl transition-colors">
              {/* Vertical Accent Line */}
              <div className={`w-1 rounded-full ${getAccentColor(idx)}`} />
              
              <div className="flex-1 min-w-0 py-0.5">
                {/* Title */}
                <h4 className="font-bold text-slate-800 text-[13px] font-inter truncate pr-6">
                  {item.commodity} - {item.market}
                </h4>
                
                {/* Subtitle / Date */}
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
                  <span>{item.arrival_date}</span>
                  <span className="w-px h-2.5 bg-slate-300" />
                  <span className="font-bold text-slate-700">₹{item.modal_price} / Qtl</span>
                </div>
                
                {/* Icons row (simulating the avatars from design) */}
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="h-5 w-5 rounded-full bg-slate-100 border border-white shadow-sm flex items-center justify-center -mr-1 z-20">
                    <span className="text-[9px] font-medium">{item.commodity.charAt(0)}</span>
                  </div>
                  <div className="h-5 w-5 rounded-full bg-slate-100 border border-white shadow-sm flex items-center justify-center -mr-1 z-10">
                    <span className="text-[9px] font-medium text-slate-500">{item.state.charAt(0)}</span>
                  </div>
                  <div className="h-5 w-5 rounded-full bg-slate-50 border border-white shadow-sm flex items-center justify-center">
                    {getTrendIcon(item.min_price, item.max_price, item.modal_price)}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-sm text-slate-500 py-10">
            No price data available.
          </div>
        )}
      </div>
    </div>

      {/* Modal for all prices */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800 text-xl font-sora">All Market Prices</h3>
              <button className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer" onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>
            
            <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {data.map((item, idx) => (
                <div key={idx} className="flex gap-3 relative group cursor-pointer hover:bg-slate-50 p-1.5 -mx-1.5 rounded-xl transition-colors">
                  {/* Vertical Accent Line */}
                  <div className={`w-1 rounded-full ${getAccentColor(idx)}`} />
                  
                  <div className="flex-1 min-w-0 py-0.5">
                    {/* Title */}
                    <h4 className="font-bold text-slate-800 text-[13px] font-inter truncate pr-6">
                      {item.commodity} - {item.market}
                    </h4>
                    
                    {/* Subtitle / Date */}
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
                      <span>{item.arrival_date}</span>
                      <span className="w-px h-2.5 bg-slate-300" />
                      <span className="font-bold text-slate-700">₹{item.modal_price} / Qtl</span>
                    </div>
                    
                    {/* Icons row */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="h-5 w-5 rounded-full bg-slate-100 border border-white shadow-sm flex items-center justify-center -mr-1 z-20">
                        <span className="text-[9px] font-medium">{item.commodity.charAt(0)}</span>
                      </div>
                      <div className="h-5 w-5 rounded-full bg-slate-100 border border-white shadow-sm flex items-center justify-center -mr-1 z-10">
                        <span className="text-[9px] font-medium text-slate-500">{item.state.charAt(0)}</span>
                      </div>
                      <div className="h-5 w-5 rounded-full bg-slate-50 border border-white shadow-sm flex items-center justify-center">
                        {getTrendIcon(item.min_price, item.max_price, item.modal_price)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
