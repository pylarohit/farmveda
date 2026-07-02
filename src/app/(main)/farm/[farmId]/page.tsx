"use client";
import { useParams } from "next/navigation";

export default function FarmHomePage() {
  const params = useParams();
  const farmId = params.farmId as string;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-3xl font-sora font-bold text-slate-900 mb-2">Farm Home</h1>
        <p className="text-slate-500 font-inter">Welcome to the dashboard for farm ID: {farmId}. Use the sidebar to navigate tools and analytics for this farm.</p>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="font-bold text-slate-800 text-lg mb-2">Crop Details</h3>
                <p className="text-slate-500 text-sm">Overview of current crop cycles and yields.</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="font-bold text-slate-800 text-lg mb-2">Weather Forecast</h3>
                <p className="text-slate-500 text-sm">Hyperlocal weather data for this specific field.</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="font-bold text-slate-800 text-lg mb-2">Soil Health</h3>
                <p className="text-slate-500 text-sm">Recent soil tests and moisture levels.</p>
            </div>
        </div>
      </div>
    </div>
  );
}
