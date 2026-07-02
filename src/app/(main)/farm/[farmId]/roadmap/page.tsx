"use client";
import { useParams } from "next/navigation";
import { LuMapPin } from "react-icons/lu";

export default function RoadMapPage() {
  const params = useParams();
  
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
            <LuMapPin size={40} />
        </div>
        <h1 className="text-3xl font-sora font-bold text-slate-900 mb-4">Farm Road Map</h1>
        <p className="text-slate-500 font-inter max-w-lg mb-8">View the customized timeline for your farm, from planning and sowing to harvest and selling. Track progress and upcoming milestones.</p>
        
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all active:scale-95">
            Generate Plan
        </button>
      </div>
    </div>
  );
}
