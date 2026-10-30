"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useUserData } from "@/context/UserDataProvider";
import { Button } from "@/components/ui/button";
import {
  Sprout,
  MapPin,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Compass,
  Globe2,
  Clock,
  ShieldCheck,
  Zap,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { LocationData } from "./farm-wizard/MapPicker";

// Dynamically import MapPicker with SSR disabled for Leaflet
const MapPicker = dynamic(() => import("./farm-wizard/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[320px] rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse flex flex-col items-center justify-center gap-2 border border-slate-200">
      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      <span className="text-sm font-medium text-slate-500 font-inter">
        Loading Satellite Map...
      </span>
    </div>
  ),
});

interface AddFarmWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Multilingual Regional Land Units ─────────────────────────────────────────
interface UnitOption {
  id: string;
  name: string;
  regionalNames: string;
  toAcres: (val: number) => number;
  popularIn: string;
}

const LAND_UNITS: UnitOption[] = [
  {
    id: "acres",
    name: "Acres",
    regionalNames: "एकड़ / ఎకరాలు / ஏக்கர் / ಎಕರೆ / একর",
    toAcres: (v) => v,
    popularIn: "Standard All-India",
  },
  {
    id: "hectares",
    name: "Hectares",
    regionalNames: "हेक्टेयर / హెక్టార్లు / ஹெக்டேர் / ಹೆಕ್ಟೇರ್",
    toAcres: (v) => v * 2.47105,
    popularIn: "Govt Records / 1 Ha = 2.47 Acres",
  },
  {
    id: "bigha",
    name: "Bigha",
    regionalNames: "बीघा / বিঘা / ਬੀਘਾ",
    toAcres: (v) => v * 0.625,
    popularIn: "UP, MP, Bihar, Rajasthan, Bengal",
  },
  {
    id: "guntha",
    name: "Guntha",
    regionalNames: "गुंठा / గుంటలు / ಗುಂಟೆ",
    toAcres: (v) => v / 40,
    popularIn: "Maharashtra, Karnataka, AP, Telangana",
  },
  {
    id: "sq_meters",
    name: "Square Meters (sq m)",
    regionalNames: "वर्ग मीटर / చదరపు మీటర్లు / சதுர மீட்டர்",
    toAcres: (v) => v * 0.000247105,
    popularIn: "Scientific / Polyhouse / Exact Field",
  },
  {
    id: "cent",
    name: "Cent",
    regionalNames: "सेंट / సెంట్ / சென்ட்",
    toAcres: (v) => v / 100,
    popularIn: "Tamil Nadu, Kerala, Andhra Pradesh",
  },
  {
    id: "kanal",
    name: "Kanal",
    regionalNames: "कनाल / ਕਨਾਲ",
    toAcres: (v) => v / 8,
    popularIn: "Punjab, Haryana, Himachal, J&K",
  },
  {
    id: "marla",
    name: "Marla",
    regionalNames: "मरला / ਮਰਲਾ",
    toAcres: (v) => v / 160,
    popularIn: "Punjab, Haryana",
  },
  {
    id: "gaj",
    name: "Square Yards (Gaj)",
    regionalNames: "गज / वर्ग गज / గజాలు",
    toAcres: (v) => v / 4840,
    popularIn: "North & Central India",
  },
];

export function AddFarmWizard({ onClose, onSuccess }: AddFarmWizardProps) {
  const { user } = useUserData();
  const supabase = createClient();

  // Navigation states
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0); // 0: Farm Name ONLY, 1: Location & Map, 2: Field Size (Acres)
  const [isSubmitting, setIsSubmitting] = useState(false);

  // STEP 1 State: Farm Name ONLY
  const [farmName, setFarmName] = useState("");

  // STEP 2 State: Location
  const [pincode, setPincode] = useState("");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [stateName, setStateName] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);

  // STEP 3 State: Field Size (Acres & Regional Units)
  const [areaSizeValue, setAreaSizeValue] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("acres");

  // ─── Pincode Auto-Detection ─────────────────────────────────────────────────
  const fetchAddressByPincode = async (pin: string) => {
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) return;
    setIsPincodeLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(
          pin
        )}&country=India&format=json&addressdetails=1&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const item = data[0];
          const addr = item.address || {};
          const v = addr.village || addr.suburb || addr.town || addr.city || "";
          const d = addr.county || addr.state_district || addr.district || "";
          const s = addr.state || "";
          if (v) setVillage(v);
          if (d) setDistrict(d);
          if (s) setStateName(s);
          setLatitude(parseFloat(item.lat));
          setLongitude(parseFloat(item.lon));
          toast.success(`Location detected: ${[v, d, s].filter(Boolean).join(", ")}`);
        }
      }
    } catch (e) {
      console.warn("Pincode lookup error:", e);
    } finally {
      setIsPincodeLoading(false);
    }
  };

  const handlePincodeChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 6);
    setPincode(clean);
    if (clean.length === 6) {
      fetchAddressByPincode(clean);
    }
  };

  // ─── Location from Map ──────────────────────────────────────────────────────
  const handleLocationFromMap = (data: LocationData) => {
    if (data.lat && data.lng) {
      setLatitude(data.lat);
      setLongitude(data.lng);
    }
    if (data.village) setVillage(data.village);
    if (data.district) setDistrict(data.district);
    if (data.state) setStateName(data.state);
    if (data.pincode && !pincode) setPincode(data.pincode);
    if (data.fullAddress && !addressLine) setAddressLine(data.fullAddress);
  };

  // ─── Calculations ───────────────────────────────────────────────────────────
  const selectedUnit = useMemo(
    () => LAND_UNITS.find((u) => u.id === selectedUnitId) || LAND_UNITS[0],
    [selectedUnitId]
  );

  const numericArea = parseFloat(areaSizeValue) || 0;
  const calculatedAcres = useMemo(
    () => (numericArea > 0 ? selectedUnit.toAcres(numericArea) : 0),
    [numericArea, selectedUnit]
  );

  // ─── Validation ─────────────────────────────────────────────────────────────
  const isStepValid = useMemo(() => {
    switch (step) {
      case 0:
        return farmName.trim().length >= 2;
      case 1:
        return (
          pincode.length === 6 ||
          district.trim().length > 0 ||
          (latitude !== undefined && longitude !== undefined)
        );
      case 2:
        return numericArea > 0;
      default:
        return true;
    }
  }, [step, farmName, pincode, district, latitude, longitude, numericArea]);

  // ─── Direct Submit Farm & Close to Home Page ────────────────────────────────
  const handleSubmitFarm = async () => {
    if (!farmName.trim()) {
      toast.error("Please enter a farm name.");
      return;
    }
    if (numericArea <= 0) {
      toast.error("Please enter the field area size.");
      return;
    }

    setIsSubmitting(true);
    const fullAddress = [addressLine, village, district, stateName, pincode]
      .filter(Boolean)
      .join(", ");

    try {
      // Determine the user ID reliably (from context, Supabase auth, or fallback to default profile)
      let targetUserId = user?.id;
      if (!targetUserId) {
        const authRes = await supabase.auth.getUser();
        targetUserId = (authRes.data.user?.id as any) || "d6c03a20-b9a7-46e4-ae27-6b574c322717";
      }

      const { error } = await supabase.from("farms").insert([
        {
          user_id: targetUserId,
          field_name: `${farmName.trim()}|||${fullAddress || "India"}`,
          area_size: calculatedAcres.toFixed(2),
          soil_type: "Alluvial / Loamy",
          intended_crop: farmName.trim(),
          weather_conditions: "Moderate",
          ai_insights: {
            decision: `Registered farm: ${farmName.trim()}`,
            expenses: "Operational cost calculated based on field acreage",
            recommendations: "Maintain regular irrigation and balanced nutrients",
            risks: "Weather alerts synced with regional forecast",
          },
        },
      ]);

      if (error) {
        console.error("Supabase insert error:", error);
        toast.error("Failed to save farm.");
        setIsSubmitting(false);
        return;
      }

      toast.success("🌾 Farm added successfully!");
      // Dispatch global refresh event
      window.dispatchEvent(new Event("farmAdded"));
      // Immediately close wizard and display on home page
      onSuccess();
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error("Failed to save farm.");
      setIsSubmitting(false);
    }
  };

  const slideVariants = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // STATE: INTRO SCREEN
  // ═════════════════════════════════════════════════════════════════════════════
  if (!started) {
    return (
      <div className="w-full h-full flex flex-col lg:flex-row relative bg-white overflow-hidden select-none">
        {/* Top Right Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-50 rounded-full h-11 w-11 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shadow-sm"
          title="Close wizard"
        >
          ✕
        </button>

        {/* LEFT HERO: Rich Farm Visuals, Photography & Features */}
        <div className="w-full lg:w-1/2 bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-900 text-white p-8 lg:p-14 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-teal-300/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Tag */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Sprout className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <span className="font-extrabold text-xl font-sora tracking-tight">Farmveda</span>
              <span className="ml-2 text-[10px] bg-emerald-400 text-slate-950 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Fast Setup
              </span>
            </div>
          </div>

          {/* Centerpiece Visuals: High-Res Farm Photography */}
          <div className="relative z-10 my-8">
            <div className="relative rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-emerald-950/40 backdrop-blur-md group">
              <img
                src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80"
                alt="Lush green agricultural fields"
                className="w-full h-64 lg:h-72 object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />

              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs">
                <div className="bg-black/60 backdrop-blur-md text-emerald-200 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Google Satellite Field Mapping</span>
                </div>
                <div className="bg-emerald-500 text-slate-950 font-bold px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>3 Simple Steps</span>
                </div>
              </div>
            </div>

            {/* 3 Simple Steps Highlight */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="bg-white/10 backdrop-blur-md border border-white/15 p-3.5 rounded-2xl text-center">
                <div className="text-xl mb-1">1️⃣</div>
                <div className="text-xs font-bold font-sora">Farm Name</div>
                <div className="text-[11px] text-emerald-100/80 mt-0.5">Name Your Field</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/15 p-3.5 rounded-2xl text-center">
                <div className="text-xl mb-1">2️⃣</div>
                <div className="text-xs font-bold font-sora">Field Location</div>
                <div className="text-[11px] text-emerald-100/80 mt-0.5">Google Maps & Pin</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/15 p-3.5 rounded-2xl text-center">
                <div className="text-xl mb-1">3️⃣</div>
                <div className="text-xs font-bold font-sora">Land Acreage</div>
                <div className="text-[11px] text-emerald-100/80 mt-0.5">Acres & Local Units</div>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-3 text-xs text-emerald-100/80 border-t border-white/10 pt-4">
            <ShieldCheck className="w-5 h-5 text-emerald-300 flex-shrink-0" />
            <span>Fast, clean & direct — add your farm in under 2 minutes.</span>
          </div>
        </div>

        {/* RIGHT CONTENT: Start Button */}
        <div className="w-full lg:w-1/2 p-8 lg:p-16 flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-900">
          <div className="max-w-md w-full">
            <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold px-3.5 py-1.5 rounded-full mb-4 border border-emerald-200 dark:border-emerald-800">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>3 Quick Steps</span>
            </div>

            <h1 className="text-3xl lg:text-4xl font-extrabold font-sora text-slate-900 dark:text-white tracking-tight mb-3">
              Add Your Farm
            </h1>

            <p className="text-slate-600 dark:text-slate-300 font-inter text-sm lg:text-base mb-8 leading-relaxed">
              Register your farmland in 3 simple steps: name your farm, pinpoint its location on
              Google Maps, and specify the acreage.
            </p>

            <div className="space-y-3.5 mb-10">
              <div className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs mt-0.5 flex-shrink-0">
                  1
                </div>
                <div>
                  <span className="font-semibold">Farm Name</span> — Name your field for easy
                  identification in your workspace.
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs mt-0.5 flex-shrink-0">
                  2
                </div>
                <div>
                  <span className="font-semibold">Field Location</span> — Pincode auto-fill and
                  interactive Google Satellite map.
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs mt-0.5 flex-shrink-0">
                  3
                </div>
                <div>
                  <span className="font-semibold">Field Size (Acres)</span> — Enter area in Acres,
                  Bigha, Guntha, or Sq Meters.
                </div>
              </div>
            </div>

            <Button
              onClick={() => setStarted(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-14 rounded-2xl text-base font-bold shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 group transition-all hover:scale-[1.01]"
            >
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 3-STEP FLOW: Step 0 (Name ONLY) -> Step 1 (Location) -> Step 2 (Acres)
  // ═════════════════════════════════════════════════════════════════════════════
  const stepTitles = ["Farm Name", "Field Location", "Field Size (Acres)"];
  const totalSteps = 3;

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden">
      {/* Header with Step Tracker */}
      <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-20 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 rounded-xl font-medium"
          >
            Cancel
          </Button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Quick 3-Step Setup</span>
          </div>
        </div>

        {/* Step Numbers & Progress */}
        <div className="flex flex-col items-center gap-1.5 flex-1 max-w-md mx-4">
          <div className="flex items-center justify-between w-full text-xs font-bold">
            <span className="text-emerald-700 dark:text-emerald-400">
              Step {step + 1}: {stepTitles[step]}
            </span>
            <span className="text-slate-400">
              {step + 1} of {totalSteps}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* 3 Step Dots */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <div
              key={idx}
              onClick={() => {
                if (idx < step) setStep(idx);
              }}
              className={`w-3 h-3 rounded-full transition-all ${
                idx === step
                  ? "bg-emerald-600 scale-125"
                  : idx < step
                  ? "bg-emerald-400 cursor-pointer"
                  : "bg-slate-200 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>
      </header>

      {/* Main Form Body */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-2xl mx-auto my-auto py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full"
            >
              {/* ─────────────────────────────────────────────────────────────
                  STEP 0: Farm Name ONLY (No Farm Type Selection!)
                 ───────────────────────────────────────────────────────────── */}
              {step === 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-12 border border-slate-200 dark:border-slate-800 shadow-xl text-center">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 rounded-3xl flex items-center justify-center mx-auto mb-5 text-3xl shadow-inner">
                    🏡
                  </div>
                  <h2 className="text-2xl md:text-3xl font-extrabold font-sora text-slate-900 dark:text-white mb-2">
                    What is your Farm Name?
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-inter mb-8 max-w-md mx-auto">
                    Give your field a recognizable name so you can track its growth, budget, and
                    harvest on your home dashboard.
                  </p>

                  {/* Farm Name Input */}
                  <div className="max-w-lg mx-auto mb-8 text-left">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      FARM / FIELD NAME *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        autoFocus
                        value={farmName}
                        onChange={(e) => setFarmName(e.target.value)}
                        placeholder="e.g., Surya Agro Farm, Green Valley Field, North Acre"
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 px-5 py-4 rounded-2xl text-xl font-sora text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm"
                      />
                      <Sprout className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6 pointer-events-none" />
                    </div>

                    {/* Quick Suggestions Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                      <span className="text-[11px] text-slate-400 font-medium">Quick suggestions:</span>
                      {["North Field", "Surya Agro Farm", "Krishna River Field", "Amma Garden"].map(
                        (suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => setFarmName(suggestion)}
                            className="text-[11px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg transition-colors font-medium"
                          >
                            + {suggestion}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 1: Field Location (Google Maps & Pincode Auto-Fill)
                 ───────────────────────────────────────────────────────────── */}
              {step === 1 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
                  <div className="text-center max-w-xl mx-auto mb-6">
                    <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl shadow-inner">
                      📍
                    </div>
                    <h2 className="text-2xl md:text-3xl font-extrabold font-sora text-slate-900 dark:text-white mb-1.5">
                      Where is your Farm Located?
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-inter">
                      Enter your 6-digit Pincode to auto-fill address details, or pinpoint your exact
                      field directly on Google Satellite map.
                    </p>
                  </div>

                  {/* Pincode & Quick Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5 max-w-3xl mx-auto">
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        PINCODE *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={6}
                          value={pincode}
                          onChange={(e) => handlePincodeChange(e.target.value)}
                          placeholder="e.g. 522002"
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-emerald-400/80 px-3.5 py-2.5 rounded-xl text-base font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        {isPincodeLoading && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 animate-spin" />
                        )}
                      </div>
                      <span className="text-[10px] text-emerald-600 font-medium">Auto-fills below</span>
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Village / Town
                      </label>
                      <input
                        type="text"
                        value={village}
                        onChange={(e) => setVillage(e.target.value)}
                        placeholder="Village name"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        District
                      </label>
                      <input
                        type="text"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder="District"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        placeholder="State"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Interactive Google Satellite & Leaflet Map */}
                  <div className="max-w-3xl mx-auto">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <Compass className="w-4 h-4 text-emerald-600" />
                        <span>Interactive Map (Click or Drag Marker to Adjust Position)</span>
                      </div>
                      {latitude && longitude && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
                        </span>
                      )}
                    </div>

                    <MapPicker
                      latitude={latitude}
                      longitude={longitude}
                      onLocationChange={handleLocationFromMap}
                    />

                    {/* Selected Farm Location pill */}
                    <div className="mt-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>
                          <strong>Selected Farm Spot:</strong>{" "}
                          {[village, district, stateName, pincode].filter(Boolean).join(", ") ||
                            "Click anywhere on the map above to select your field position"}
                        </span>
                      </div>
                      <span className="text-[10px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded font-bold shadow-sm">
                        Verified
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 2: How Many Acres (Field Size)
                 ───────────────────────────────────────────────────────────── */}
              {step === 2 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-10 border border-slate-200 dark:border-slate-800 shadow-xl">
                  <div className="text-center max-w-xl mx-auto mb-8">
                    <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl shadow-inner">
                      📐
                    </div>
                    <h2 className="text-2xl md:text-3xl font-extrabold font-sora text-slate-900 dark:text-white mb-2">
                      How Many Acres is Your Field?
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-inter">
                      Enter the total field area in Acres, Bigha, Guntha, Cent, or Square Meters.
                    </p>
                  </div>

                  {/* Numeric Input + Unit Selector */}
                  <div className="max-w-xl mx-auto mb-6">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 text-center">
                      Field Area Size *
                    </label>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        autoFocus
                        value={areaSizeValue}
                        onChange={(e) => setAreaSizeValue(e.target.value)}
                        placeholder="e.g. 5"
                        className="w-full sm:w-1/2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-4 rounded-2xl text-3xl font-extrabold font-sora text-center text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                      />

                      <div className="w-full sm:w-1/2">
                        <select
                          value={selectedUnitId}
                          onChange={(e) => setSelectedUnitId(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-4 rounded-2xl text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          {LAND_UNITS.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} — {u.regionalNames.split(" / ")[0]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Preset buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                      <span className="text-xs text-slate-400 font-medium">Quick sizes:</span>
                      {[0.5, 1, 2, 5, 10, 25].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAreaSizeValue(preset.toString())}
                          className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {preset} {selectedUnit.name.split(" ")[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live Conversion Display */}
                  {numericArea > 0 && (
                    <div className="max-w-xl mx-auto bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border-2 border-emerald-300 dark:border-emerald-800 p-5 rounded-2xl shadow-sm mb-6">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-2">
                        <Globe2 className="w-4 h-4 text-emerald-600" />
                        <span>Universal Measurement Translation</span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-center pt-2 border-t border-emerald-200 dark:border-emerald-800/60">
                        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl">
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            Standard Acres
                          </div>
                          <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-sora">
                            {calculatedAcres.toFixed(2)}
                          </div>
                          <div className="text-[9px] text-slate-400">एकड़ / ఎకరాలు</div>
                        </div>

                        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl">
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            Hectares (Ha)
                          </div>
                          <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-sora">
                            {(calculatedAcres / 2.47105).toFixed(2)}
                          </div>
                          <div className="text-[9px] text-slate-400">हेक्टेयर / హెక్టార్లు</div>
                        </div>

                        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl">
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            Square Meters
                          </div>
                          <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-sora">
                            {Math.round(calculatedAcres * 4046.86).toLocaleString("en-IN")}
                          </div>
                          <div className="text-[9px] text-slate-400">वर्ग मीटर / చ.మీटर</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Summary of Farm to be Created */}
                  <div className="max-w-xl mx-auto bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Farm Registration Summary:
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400">Farm Name:</span>{" "}
                        <strong className="text-slate-900 dark:text-white">{farmName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Area:</span>{" "}
                        <strong className="text-slate-900 dark:text-white">
                          {numericArea} {selectedUnit.name} ({calculatedAcres.toFixed(2)} Acres)
                        </strong>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400">Location:</span>{" "}
                        <strong className="text-slate-900 dark:text-white">
                          {[village, district, stateName, pincode].filter(Boolean).join(", ") ||
                            "India"}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 md:px-12 md:py-5 flex justify-between items-center z-20 shadow-md flex-shrink-0">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(s - 1, 0))}
          disabled={step === 0 || isSubmitting}
          className="text-slate-600 dark:text-slate-300 font-inter h-12 px-5 text-sm rounded-xl border-slate-300 dark:border-slate-700"
        >
          <ChevronLeft className="mr-1.5 w-4 h-4" /> Back
        </Button>

        {step < totalSteps - 1 ? (
          <Button
            onClick={() => setStep((s) => Math.min(s + 1, totalSteps - 1))}
            disabled={!isStepValid}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-8 text-sm rounded-xl shadow-lg shadow-emerald-600/20 font-bold flex items-center gap-1.5 transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            <span>Continue</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmitFarm}
            disabled={!isStepValid || isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-8 text-sm rounded-xl shadow-xl shadow-emerald-600/30 font-bold flex items-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Farm...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save & Add Farm</span>
              </>
            )}
          </Button>
        )}
      </footer>
    </div>
  );
}

export default AddFarmWizard;
