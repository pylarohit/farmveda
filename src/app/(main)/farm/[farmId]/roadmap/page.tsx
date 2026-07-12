"use client";

import { useState, useEffect } from "react";
import { 
  Leaf, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  CircleDashed,
  Loader2,
  CalendarDays,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Step {
  title: string;
  description: string;
  duration: string;
  status: "completed" | "upcoming";
}

interface RoadmapData {
  title: string;
  totalSteps: number;
  requirements: string;
  steps: Step[];
}

export default function RoadmapPage({ params }: { params: { farmId: string } }) {
  const [crop, setCrop] = useState("");
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);

  const generateRoadmap = async () => {
    if (!crop.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crop, farmData: { field_name: "your field" } })
      });
      if (res.ok) {
        const data = await res.json();
        setRoadmap(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStepStatus = (index: number) => {
    if (!roadmap) return;
    const newRoadmap = { ...roadmap };
    const currentStatus = newRoadmap.steps[index].status;
    newRoadmap.steps[index].status = currentStatus === "completed" ? "upcoming" : "completed";
    setRoadmap(newRoadmap);
  };

  const completedCount = roadmap?.steps.filter(s => s.status === "completed").length || 0;
  const upcomingCount = (roadmap?.steps.length || 0) - completedCount;

  if (!roadmap) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-6">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Leaf className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Grow with FarmVeda</h1>
            <p className="text-gray-500 mb-8">What crop would you like to plan for this season?</p>
          </div>
          
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                placeholder="e.g. Tomatoes, Wheat, Cotton..."
                className="pl-11 py-6 text-lg rounded-2xl border-gray-200 focus-visible:ring-green-500 bg-gray-50/50"
                onKeyDown={(e) => e.key === "Enter" && generateRoadmap()}
              />
            </div>
            <Button 
              onClick={generateRoadmap}
              disabled={loading || !crop.trim()}
              className="w-full py-6 text-lg rounded-2xl bg-green-600 hover:bg-green-700 text-white shadow-md transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                <>
                  Create Roadmap
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-3">
              {roadmap.title} 🌱
            </h1>
            <p className="text-gray-600 max-w-2xl leading-relaxed">
              {roadmap.requirements}
            </p>
          </div>
          
          <div className="flex gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="text-center px-4">
              <p className="text-sm text-gray-500 mb-1 font-medium">Total Steps</p>
              <p className="text-2xl font-bold text-gray-900">{roadmap.steps.length}</p>
            </div>
            <div className="w-px bg-gray-100"></div>
            <div className="text-center px-4">
              <p className="text-sm text-gray-500 mb-1 font-medium">Completed</p>
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            </div>
            <div className="w-px bg-gray-100"></div>
            <div className="text-center px-4">
              <p className="text-sm text-gray-500 mb-1 font-medium">Upcoming</p>
              <p className="text-2xl font-bold text-purple-600">{upcomingCount}</p>
            </div>
          </div>
        </div>

        {/* Timeline Roadmap */}
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 border-dashed border-l-2 border-gray-300 transform -translate-x-1/2"></div>

          <div className="space-y-12">
            {roadmap.steps.map((step, index) => {
              const isEven = index % 2 === 0;
              const isCompleted = step.status === "completed";
              
              return (
                <div key={index} className={`relative flex items-center justify-between md:justify-normal ${isEven ? "md:flex-row-reverse" : ""}`}>
                  
                  {/* Timeline Node */}
                  <div className="absolute left-8 md:left-1/2 w-8 h-8 rounded-full bg-white border-4 border-gray-100 transform -translate-x-1/2 flex items-center justify-center shadow-sm z-10 transition-colors duration-300">
                    <div className={`w-3 h-3 rounded-full ${isCompleted ? "bg-green-500" : "bg-purple-500"}`}></div>
                  </div>

                  {/* Spacer for alternating layout on desktop */}
                  <div className="hidden md:block w-1/2"></div>

                  {/* Card Content */}
                  <div className={`w-full md:w-1/2 pl-20 md:pl-0 ${isEven ? "md:pr-16" : "md:pl-16"}`}>
                    <div 
                      onClick={() => toggleStepStatus(index)}
                      className={`
                        p-6 rounded-[24px] shadow-sm border transition-all duration-300 cursor-pointer hover:shadow-md
                        ${isCompleted 
                          ? "bg-green-50/50 border-green-100" 
                          : "bg-white border-gray-100 hover:border-purple-200"}
                      `}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                            {index + 1}
                          </span>
                          <h3 className={`text-xl font-bold ${isCompleted ? "text-green-900" : "text-gray-900"}`}>
                            {step.title}
                          </h3>
                        </div>
                        
                        {/* Status Badge */}
                        <div className={`
                          flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                          ${isCompleted 
                            ? "bg-green-100 text-green-700" 
                            : "bg-purple-100 text-purple-700"}
                        `}>
                          {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <CircleDashed className="w-3.5 h-3.5" />}
                          {isCompleted ? "Completed" : "Upcoming"}
                        </div>
                      </div>

                      <p className={`text-base leading-relaxed mb-6 ${isCompleted ? "text-green-800/80" : "text-gray-600"}`}>
                        {step.description}
                      </p>

                      <div className="flex items-center gap-4 pt-4 border-t border-gray-100/50">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                          <CalendarDays className="w-4 h-4" />
                          {step.duration}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
