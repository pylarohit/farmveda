"use client";
import { useParams } from "next/navigation";
import { LuMicroscope } from "react-icons/lu";

export default function DiseaseDetectionPage() {
  const params = useParams();
  
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
        <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
            <LuMicroscope size={40} />
        </div>
        <h1 className="text-3xl font-sora font-bold text-slate-900 mb-4">Disease Detection</h1>
        <p className="text-slate-500 font-inter max-w-lg mb-8">Upload a photo of your crop leaves to our AI diagnostic tool to instantly detect diseases, pests, and nutrient deficiencies.</p>
        
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all active:scale-95">
            Upload Photo
        </button>
      </div>
    </div>
  );
}
