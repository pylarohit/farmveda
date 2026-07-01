"use client";

import { useState } from "react";
import { useUserData } from "@/context/UserDataProvider";
import { Button } from "@/components/ui/button";
import { Activity, Sprout, CloudRain, Map, Droplets, Sun, Wind, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import axios from "axios";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { LuLoader } from "react-icons/lu";
import CardQuizInsights from "./CardQuizInsights";

interface AddFarmWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

const allQuestions = [
  { 
    section: "farm_name", 
    title: "What is the name of your farm?", 
    subtitle: "Give your field a recognizable name.",
    type: "text",
    placeholder: "e.g., Green Valley Farm"
  },
  { 
    section: "location", 
    title: "Where is your farm located?", 
    subtitle: "Enter the full address details.",
    type: "address_form",
    fields: [
      { name: "address", label: "Address", placeholder: "e.g., 123 Main St" },
      { name: "village", label: "Village / Town", placeholder: "e.g., Rampur" },
      { name: "district", label: "District", placeholder: "e.g., Ludhiana" },
      { name: "state", label: "State", placeholder: "e.g., Punjab" },
      { name: "pincode", label: "Pin Code", placeholder: "e.g., 141001" },
    ]
  },
  { 
    section: "intended_crop", 
    title: "What crop do you want to grow?", 
    subtitle: "Enter the primary crop for this field.",
    type: "text",
    placeholder: "e.g., Wheat, Rice, Cotton..."
  },
  { 
    section: "area_size", 
    title: "What is the size of the field?", 
    subtitle: "Enter the total area in acres.",
    type: "number",
    placeholder: "e.g., 5.5"
  },
  { 
    section: "soil_type", 
    title: "What type of soil do you have?", 
    subtitle: "Select the predominant soil type.",
    type: "grid",
    options: ["Loamy", "Clay", "Sandy", "Peaty", "Chalky", "Silty", "Unknown"] 
  },
  { 
    section: "weather_conditions", 
    title: "What is the expected weather?", 
    subtitle: "Choose the climate for the upcoming season.",
    type: "grid",
    options: ["Sunny & Dry", "Monsoon/Rainy", "Humid & Hot", "Cold & Frosty", "Moderate"] 
  },
  { 
    section: "water_availability", 
    title: "What is the availability of water?", 
    subtitle: "Select your primary irrigation source.",
    type: "grid",
    options: ["Borewell / Tubewell", "Canal / River", "Rainfed", "Municipal / Other"] 
  }
];

export function AddFarmWizard({ onClose, onSuccess }: AddFarmWizardProps) {
  const { user } = useUserData();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [finalLoading, setFinalLoading] = useState(false);
  
  const [insights, setInsights] = useState<any>(null);
  const [readyToSave, setReadyToSave] = useState(false);
  
  const [step, setStep] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const currentQ = allQuestions[step];

  const saveAnswer = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.section]: value,
    }));
  };

  const progressPercent = Math.round(((step + 1) / allQuestions.length) * 100);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await axios.post("/api/ai/farm-feedback", {
        farmData: answers,
      });

      const data = res.data;
      setInsights(data.insights);
      setFinished(false);
      setReadyToSave(true);
      toast.success("Farm data analyzed successfully!");
    } catch (err: any) {
      console.error("❌ handleSubmit error:", err.message || err);
      toast.error(err.message || "Failed to analyze farm data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!insights || !user) return;
    setFinalLoading(true);
    try {
      const { error } = await supabase.from("farms").insert([
        {
          user_id: user.id,
          field_name: (answers["farm_name"] || "My Farm") + "|||" + [answers["address"], answers["village"], answers["district"], answers["state"], answers["pincode"]].filter(Boolean).join(", "),
          area_size: answers["area_size"] || "",
          soil_type: answers["soil_type"] || "",
          intended_crop: answers["intended_crop"] || "",
          weather_conditions: answers["weather_conditions"] || "",
          ai_insights: insights,
        },
      ]);

      if (error) {
        console.error("Supabase insert error:", error);
        toast.error("Failed to save farm data.");
        return;
      }

      toast.success("Farm added successfully!");
      window.dispatchEvent(new Event('farmAdded'));
      onSuccess();
    } catch (err: any) {
      console.error("❌ handleConfirm error:", err.message || err);
      toast.error("Failed to save farm results.");
    } finally {
      setFinalLoading(false);
    }
  };

  const slideVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
  };

  if (readyToSave) {
    return (
      <div className="w-full h-full flex flex-col md:flex-row bg-slate-50 text-slate-800 relative overflow-hidden">
        {/* Left Side: Summary */}
        <div className="w-full md:w-1/3 bg-emerald-600 p-8 text-white flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
              <CheckCircle2 className="text-white h-6 w-6" />
            </div>
            <h2 className="text-3xl font-bold font-sora mb-2">Analysis Complete</h2>
            <p className="text-emerald-100 font-inter opacity-90 mb-8">
              Based on your field size of {answers.area_size} acres and {answers.soil_type} soil, our AI agronomist has generated a customized report for growing {answers.intended_crop}.
            </p>
          </div>

          <div className="space-y-4 pb-8">
            <Button
              onClick={handleConfirm}
              disabled={finalLoading}
              className="w-full bg-white text-emerald-700 hover:bg-emerald-50 h-14 rounded-xl text-lg font-bold shadow-lg"
            >
              {finalLoading ? <><LuLoader className="animate-spin mr-2 inline" /> Saving...</> : "Confirm & Save Farm"}
            </Button>
            <Button variant="ghost" onClick={onClose} className="w-full text-emerald-100 hover:text-white hover:bg-emerald-700/50 h-14 rounded-xl">
              Discard
            </Button>
          </div>
        </div>

        {/* Right Side: Insights */}
        <div className="w-full md:w-2/3 p-8 md:p-12 overflow-y-auto custom-scrollbar bg-white">
          <h3 className="text-2xl font-bold font-sora text-slate-800 mb-6 flex items-center gap-3">
            <Sprout className="text-emerald-500" /> AI Agronomist Insights
          </h3>
          <CardQuizInsights insights={insights} />
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white relative">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-white opacity-50 z-0" />
        <div className="relative z-10 max-w-md w-full text-center p-8">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-100/50"
          >
            <Activity className="text-4xl text-emerald-600" />
          </motion.div>
          <h2 className="text-3xl font-bold font-sora text-slate-800 mb-4">Generating Insights</h2>
          <p className="text-slate-600 font-inter text-lg mb-8">
            Analyzing {answers.intended_crop} compatibility with {answers.soil_type} soil under {answers.weather_conditions} conditions...
          </p>

          {loading ? (
            <div className="flex flex-col items-center justify-center text-emerald-600">
              <LuLoader className="animate-spin text-4xl mb-4" />
              <span className="font-semibold tracking-wide uppercase text-sm">Processing Data</span>
            </div>
          ) : (
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => setFinished(false)} className="h-12 px-6 rounded-xl">Back</Button>
              <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-8 rounded-xl font-semibold shadow-md">
                Get Results
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="w-full h-full flex flex-col md:flex-row relative">
        <div className="absolute top-6 right-6 z-50">
          <Button variant="ghost" onClick={onClose} className="rounded-full h-10 w-10 p-0 bg-slate-100 hover:bg-slate-200 text-slate-600">
            ✕
          </Button>
        </div>
        {/* Left Visual Area */}
        <div className="w-full md:w-1/2 bg-emerald-600 h-64 md:h-full relative overflow-hidden flex items-center justify-center p-8">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
          <div className="absolute top-40 -right-40 w-96 h-96 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
          
          <div className="relative z-10 text-center text-white">
            <Sprout className="h-24 w-24 mx-auto mb-6 text-emerald-100" strokeWidth={1.5} />
            <h1 className="text-4xl md:text-5xl font-black font-sora tracking-tight mb-4">Farmveda AI</h1>
            <p className="text-emerald-100 font-inter text-lg md:text-xl font-medium max-w-sm mx-auto">
              Smart crop planning starts here.
            </p>
          </div>
        </div>
        
        {/* Right Content Area */}
        <div className="w-full md:w-1/2 h-full flex items-center justify-center p-8 md:p-16 bg-white">
          <div className="max-w-md w-full">
            <h2 className="text-3xl font-bold font-sora text-slate-900 mb-4">Add a New Farm</h2>
            <p className="text-slate-600 font-inter text-lg mb-10 leading-relaxed">
              We'll ask you 5 quick questions about your field's soil, size, and weather to provide you with expert AI recommendations for your next harvest.
            </p>
            <Button
              onClick={() => setStarted(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-14 rounded-xl text-lg font-semibold shadow-lg shadow-emerald-600/20 group"
            >
              Start Assessment 
              <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  let isNextDisabled = false;
  if (currentQ.type === "address_form") {
    // @ts-ignore
    isNextDisabled = currentQ.fields.some((f: any) => !answers[f.name]);
  } else {
    isNextDisabled = !answers[currentQ.section];
  }

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Header / Progress */}
      <div className="w-full p-6 md:px-12 md:py-8 flex items-center justify-between border-b border-slate-100">
        <Button variant="ghost" onClick={onClose} className="text-slate-500 font-medium font-inter">
          Cancel
        </Button>
        <div className="text-sm font-semibold text-slate-400 tracking-widest uppercase">
          Step {step + 1} of {allQuestions.length}
        </div>
        <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Main Question Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-2xl relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full"
            >
              <h2 className="text-3xl md:text-4xl font-bold font-sora text-slate-800 mb-3 text-center">
                {currentQ.title}
              </h2>
              <p className="text-slate-500 font-inter text-lg text-center mb-10">
                {currentQ.subtitle}
              </p>

              {/* Input Types */}
              {currentQ.type === "address_form" ? (
                <div className="max-w-md mx-auto grid grid-cols-2 gap-4">
                  {/* @ts-ignore */}
                  {currentQ.fields.map((f: any) => (
                    <div key={f.name} className={f.name === "address" ? "col-span-2" : "col-span-1"}>
                      <input
                        type="text"
                        className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-xl text-lg font-inter text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-center"
                        placeholder={f.placeholder}
                        value={answers[f.name] || ""}
                        onChange={(e) => {
                          setAnswers((prev) => ({
                            ...prev,
                            [f.name]: e.target.value,
                          }));
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : currentQ.type === "text" || currentQ.type === "number" ? (
                <div className="max-w-md mx-auto">
                  <input
                    type={currentQ.type}
                    className="w-full bg-slate-50 border-2 border-slate-200 p-5 rounded-2xl text-2xl font-sora text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-center"
                    placeholder={currentQ.placeholder}
                    value={answers[currentQ.section] || ""}
                    onChange={(e) => saveAnswer(e.target.value)}
                    autoFocus
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {currentQ.options?.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => saveAnswer(opt)}
                      className={`p-6 rounded-2xl border-2 transition-all duration-200 text-left flex flex-col items-start gap-3 ${
                        answers[currentQ.section] === opt
                          ? "border-emerald-500 bg-emerald-50 shadow-md"
                          : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${answers[currentQ.section] === opt ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                        {opt.includes("Soil") || opt.includes("Loamy") || opt.includes("Clay") ? <Map size={20} /> :
                         opt.includes("Sunny") ? <Sun size={20} /> :
                         opt.includes("Rain") || opt.includes("Monsoon") ? <CloudRain size={20} /> :
                         opt.includes("Cold") || opt.includes("Moderate") ? <Wind size={20} /> :
                         <Droplets size={20} />}
                      </div>
                      <span className={`font-sora font-semibold text-lg ${answers[currentQ.section] === opt ? "text-emerald-700" : "text-slate-700"}`}>
                        {opt}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer / Navigation */}
      <div className="w-full p-6 md:px-12 md:py-8 flex justify-between items-center bg-white border-t border-slate-100 mt-auto">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(s - 1, 0))}
          disabled={step === 0}
          className="text-slate-500 font-inter h-14 px-6 text-lg hover:bg-slate-100 rounded-xl"
        >
          <ChevronLeft className="mr-2" /> Back
        </Button>

        {step < allQuestions.length - 1 ? (
          <Button
            onClick={() => setStep((s) => Math.min(s + 1, allQuestions.length - 1))}
            disabled={isNextDisabled}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-14 px-10 text-lg rounded-xl shadow-md font-semibold"
          >
            Continue <ChevronRight className="ml-2" />
          </Button>
        ) : (
          <Button
            onClick={() => setFinished(true)}
            disabled={isNextDisabled}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-14 px-10 text-lg rounded-xl shadow-md font-semibold shadow-emerald-600/30"
          >
            Complete Assessment <CheckCircle2 className="ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
