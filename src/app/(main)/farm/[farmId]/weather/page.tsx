"use client";

import { useEffect, useState, useRef } from "react";
import { askFarmAi } from "./actions";
import {
  MapPin, Wind, Droplets, Thermometer,
  AlertTriangle, CheckCircle2, XCircle,
  Leaf, Sprout, Tractor, Package, Bug,
  CloudRain, Sun, Zap, Info, Clock, ArrowUp, ArrowDown,
  Sparkles, Compass, Sunrise, Sunset, Eye, RefreshCw,
  Download, Share2, MessageSquare, Radar, ChevronRight, Activity, ThermometerSun
} from "lucide-react";
import { format } from "date-fns";

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface HourlyData { time: string; temp: number; code: number; humidity: number; windSpeed: number; rain: number; }
interface DayForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  code: number;
  sunrise: string;
  sunset: string;
  rainProb: number;
  uvIndex: number;
  precipitation: number;
}
interface WeatherData {
  location: string; lat: number; lon: number;
  current: {
    temp: number; feelsLike: number; code: number; humidity: number; windSpeed: number;
    visibility: number; rainProb: number; uvIndex: number; sunrise: string; sunset: string;
  };
  hourly: HourlyData[];
  forecast: DayForecast[];
}
interface FarmAdvice { activity: string; status: "go" | "caution" | "avoid"; text: string; icon: any; }

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const wmoDesc = (c: number) => {
  if (c === 0) return "Clear Sky";
  if (c <= 2) return "Partly Cloudy";
  if (c === 3) return "Overcast";
  if (c <= 48) return "Foggy";
  if (c <= 55) return "Light Drizzle";
  if (c <= 67) return "Heavy Rain";
  if (c <= 77) return "Snow";
  if (c <= 82) return "Rain Showers";
  if (c >= 95) return "Thunderstorms";
  return "Clear";
};

const wmoEmoji = (c: number) => {
  if (c === 0) return "☀️";
  if (c <= 2) return "⛅";
  if (c === 3) return "☁️";
  if (c <= 48) return "🌫️";
  if (c <= 55) return "🌦️";
  if (c <= 67) return "🌧️";
  if (c <= 77) return "❄️";
  if (c <= 82) return "🌧️";
  if (c >= 95) return "⛈️";
  return "☀️";
};

const isRaining = (c: number) => c >= 51 && c <= 82;
const isStormy = (c: number) => c >= 95;

/* ─── AI Engine Logic ────────────────────────────────────────────────────── */
function calculateSuitabilityScore(w: WeatherData["current"]): number {
  let score = 100;
  if (isStormy(w.code)) score -= 70;
  else if (isRaining(w.code)) score -= 30;
  if (w.windSpeed > 25) score -= 20;
  if (w.temp > 38 || w.temp < 8) score -= 25;
  if (w.humidity > 85) score -= 15;
  return Math.max(0, score);
}

function generateDiseaseRisk(w: WeatherData["current"]) {
  if (w.humidity > 80 && w.temp > 22 && w.temp < 30) {
    return { level: "High", risk: "Powdery Mildew & Fungal Blight", desc: "High humidity and warm temps create ideal fungal breeding grounds. Preventive fungicide spray recommended.", color: "rose" };
  } else if (w.humidity > 70 && w.temp > 30) {
    return { level: "Moderate", risk: "Bacterial Spot", desc: "Warm and humid conditions. Ensure proper canopy ventilation.", color: "amber" };
  } else if (w.temp > 35 && w.humidity < 40) {
    return { level: "High", risk: "Spider Mites / Heat Stress", desc: "Dry, extreme heat favors mites. Watch for leaf curling and stippling.", color: "rose" };
  }
  return { level: "Low", risk: "Minimal Risk", desc: "Current conditions do not strongly favor common pests or diseases.", color: "emerald" };
}

function generateFarmingAdvice(w: WeatherData["current"]): FarmAdvice[] {
  const { code, temp, windSpeed: wind, humidity } = w;
  const raining = isRaining(code); const stormy = isStormy(code);

  return [
    {
      activity: "Irrigation System", icon: Droplets,
      status: (raining || stormy) ? "avoid" : temp > 35 ? "caution" : "go",
      text: raining ? "Rainfall active. Halt irrigation to prevent waterlogging." : temp > 35 ? "Irrigate evening/night to minimize evaporation." : "Ideal soil moisture absorption conditions.",
    },
    {
      activity: "Fertilizer Application", icon: Leaf,
      status: (stormy || raining || wind > 25) ? "avoid" : humidity > 85 ? "caution" : "go",
      text: raining ? "Nutrients will wash away. Postpone application." : wind > 25 ? "Wind causes drift and uneven spread." : "Optimal absorption conditions.",
    },
    {
      activity: "Pesticide Spraying", icon: Bug,
      status: (stormy || raining || wind > 18) ? "avoid" : wind > 10 || humidity > 90 ? "caution" : "go",
      text: (stormy || raining) ? "Chemicals will be washed off canopy." : wind > 18 ? "High drift risk to neighboring crops." : "Calm winds and good adherence.",
    },
    {
      activity: "Harvesting & Picking", icon: Package,
      status: (stormy || raining) ? "avoid" : humidity > 80 ? "caution" : "go",
      text: (stormy || raining) ? "Wet crops will rot rapidly in storage." : humidity > 80 ? "Ensure crops dry before packing." : "Dry conditions are perfect for harvest.",
    }
  ];
}

/* ─── Fetch Data ─────────────────────────────────────────────────────────── */
async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,weathercode,relativehumidity_2m,windspeed_10m` +
      `&hourly=temperature_2m,weathercode,relativehumidity_2m,windspeed_10m,visibility,precipitation` +
      `&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset,precipitation_probability_max,uv_index_max,precipitation_sum` +
      `&timezone=auto&forecast_days=7&windspeed_unit=kmh`;
    const d = await (await fetch(url)).json();
    const nowH = new Date().getHours();
    
    const parseTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    return {
      location: "", lat, lon,
      current: {
        temp: Math.round(d.current.temperature_2m), feelsLike: Math.round(d.current.apparent_temperature),
        code: d.current.weathercode, humidity: Math.round(d.current.relativehumidity_2m),
        visibility: Math.round((d.hourly?.visibility?.[nowH] ?? 10000) / 1000), windSpeed: Math.round(d.current.windspeed_10m),
        rainProb: d.daily.precipitation_probability_max[0] ?? 0, uvIndex: Math.round(d.daily.uv_index_max[0] ?? 0),
        sunrise: parseTime(d.daily.sunrise[0]), sunset: parseTime(d.daily.sunset[0]),
      },
      hourly: d.hourly.time.slice(nowH, nowH + 24).map((t: string, i: number) => ({
        time: new Date(t).toLocaleTimeString("en-US", { hour: "numeric", hour12: true }),
        temp: Math.round(d.hourly.temperature_2m[nowH + i]),
        code: d.hourly.weathercode[nowH + i],
        humidity: Math.round(d.hourly.relativehumidity_2m[nowH + i]),
        windSpeed: Math.round(d.hourly.windspeed_10m[nowH + i]),
        rain: d.hourly.precipitation[nowH + i] ?? 0,
      })),
      forecast: d.daily.time.map((t: string, i: number) => ({
        date: t, maxTemp: Math.round(d.daily.temperature_2m_max[i]), minTemp: Math.round(d.daily.temperature_2m_min[i]),
        code: d.daily.weathercode[i], sunrise: parseTime(d.daily.sunrise[i]), sunset: parseTime(d.daily.sunset[i]),
        rainProb: d.daily.precipitation_probability_max[i] ?? 0, uvIndex: Math.round(d.daily.uv_index_max[i] ?? 0),
        precipitation: d.daily.precipitation_sum[i] ?? 0,
      })),
    };
  } catch { return null; }
}

/* ─── Page Component ─────────────────────────────────────────────────────── */
export default function FarmWeatherCommandCenter() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [askInput, setAskInput] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAskAi = async () => {
    if (!askInput.trim() || !weather) return;
    setIsSubmitting(true);
    setAiResponse(null);
    const res = await askFarmAi(askInput, weather);
    setAiResponse(res.text);
    setIsSubmitting(false);
  };
  const load = async (lat: number, lon: number, name: string) => {
    setLoading(true);
    const w = await fetchWeather(lat, lon);
    if (w) { w.location = name; setWeather(w); }
    setLastUpdated(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }));
    setLoading(false);
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await (await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`)).json();
            load(pos.coords.latitude, pos.coords.longitude, res.city || res.locality || "Your Farm");
          } catch { load(pos.coords.latitude, pos.coords.longitude, "Your Farm"); }
        },
        () => load(12.9716, 77.5946, "Bengaluru Farm"),
        { timeout: 5000 }
      );
    } else { load(12.9716, 77.5946, "Bengaluru Farm"); }
  }, []);

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="relative flex items-center justify-center">
        <div className="w-20 h-20 rounded-full border-[3px] border-emerald-100 border-t-emerald-600 animate-spin" />
        <Tractor className="h-8 w-8 text-emerald-600 absolute animate-pulse" />
      </div>
      <p className="text-sm font-black text-slate-500 mt-6 uppercase tracking-widest animate-pulse">Initializing Command Center...</p>
    </div>
  );

  if (!weather) return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-50 font-sans">
      <div className="text-center bg-white p-10 rounded-[32px] shadow-sm border border-slate-200">
        <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
        <p className="font-black text-xl text-slate-800">Connection Failed</p>
        <p className="text-sm text-slate-500 mt-2">Unable to connect to meteorological satellites.</p>
        <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2.5 bg-emerald-600 text-white rounded-full font-bold text-sm shadow-md hover:bg-emerald-700 transition">Retry Connection</button>
      </div>
    </div>
  );

  const suitabilityScore = calculateSuitabilityScore(weather.current);
  const adviceList = generateFarmingAdvice(weather.current);
  const diseaseRisk = generateDiseaseRisk(weather.current);

  const getScoreProgressColor = (score: number) => score >= 80 ? "stroke-emerald-500" : score >= 50 ? "stroke-amber-400" : "stroke-rose-500";
  const maxRain = Math.max(...weather.forecast.map(d => d.precipitation), 1);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#F8FAFC] font-sans text-slate-900 border-l border-slate-200/60 pb-20">
      
      {/* ── Top Navigation ── */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 lg:px-10 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-100/80 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5"><Activity className="h-3 w-3"/> LIVE</span>
            <span className="text-slate-400 text-xs font-bold">Updated {lastUpdated}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            Farming Command Center
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition"><Share2 className="h-4 w-4" /></button>
          <button className="p-2.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition"><Download className="h-4 w-4" /></button>
          <button onClick={() => load(weather.lat, weather.lon, weather.location)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 transition px-5 py-2.5 rounded-full text-sm font-bold text-white shadow-md shadow-emerald-600/20">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto p-6 lg:p-10 space-y-8">
        
        {/* ── HERO SECTION ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* Current Conditions Card */}
          <div className="xl:col-span-8 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-[32px] p-8 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[360px]">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-400/5 blur-[100px] rounded-full translate-x-1/4 -translate-y-1/4 pointer-events-none" />
            
            <div className="flex justify-between items-start z-10">
              <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md border border-slate-200/60 px-4 py-2 rounded-2xl text-slate-800 text-sm font-bold shadow-sm">
                <MapPin className="h-4 w-4 text-emerald-600" /> {weather.location}
              </div>
              <div className="text-6xl drop-shadow-lg select-none scale-125 origin-top-right mr-4">{wmoEmoji(weather.current.code)}</div>
            </div>

            <div className="z-10 mt-6">
              <div className="flex items-baseline gap-1">
                <span className="text-[110px] font-black text-slate-900 leading-[0.85] tracking-tighter">{weather.current.temp}</span>
                <span className="text-5xl font-black text-slate-400">°C</span>
              </div>
              <p className="text-2xl font-black text-slate-800 mt-4">{wmoDesc(weather.current.code)}</p>
              <p className="text-slate-500 text-sm font-bold mt-1">Feels like {weather.current.feelsLike}°C • <span className="text-emerald-600">Perfect harvesting conditions later today</span></p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100 z-10">
              {[{l: "Humidity", v: `${weather.current.humidity}%`, i: Droplets, c: "text-blue-600 bg-blue-50"},
                {l: "Wind Speed", v: `${weather.current.windSpeed} km/h`, i: Wind, c: "text-teal-600 bg-teal-50"},
                {l: "Rain Prob.", v: `${weather.current.rainProb}%`, i: CloudRain, c: "text-indigo-600 bg-indigo-50"},
                {l: "UV Index", v: weather.current.uvIndex, i: Sun, c: "text-orange-600 bg-orange-50"}].map((s, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-[14px] ${s.c}`}><s.i className="h-5 w-5" /></div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{s.l}</p>
                    <p className="text-base font-black text-slate-800">{s.v}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Score & Hero Advisory */}
          <div className="xl:col-span-4 flex flex-col gap-6 h-full">
            
            {/* Ask Farm AI Widget */}
            <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-[32px] p-6 shadow-sm relative overflow-hidden shrink-0">
               <h3 className="font-black text-emerald-900 text-lg tracking-tight mb-3 flex items-center gap-2"><Sparkles className="h-5 w-5 text-emerald-600"/> Ask Farm AI</h3>
               <div className="relative">
                 <input 
                   type="text" 
                   value={askInput}
                   onChange={e => setAskInput(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleAskAi()}
                   placeholder="e.g. Is it safe to spray urea today?" 
                   className="w-full bg-white border border-emerald-200 rounded-2xl py-3 pl-4 pr-12 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400 shadow-inner"
                   disabled={isSubmitting}
                 />
                 <button onClick={handleAskAi} disabled={isSubmitting} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition disabled:opacity-50">
                   {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                 </button>
               </div>
               {aiResponse && (
                 <div className="mt-4 p-4 bg-white border border-emerald-100 rounded-2xl shadow-sm text-sm font-semibold text-slate-700 leading-relaxed animate-in fade-in slide-in-from-top-2">
                   {aiResponse}
                 </div>
               )}
            </div>

            {/* AI Assessment */}
            <div className="bg-slate-900 text-white border border-slate-800 rounded-[32px] p-6 shadow-xl relative overflow-hidden flex flex-col justify-between flex-1">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 blur-[100px] rounded-full pointer-events-none" />
              
              <div className="flex justify-between items-center z-10 mb-2">
                <h3 className="font-black text-lg tracking-tight flex items-center gap-2"><Sparkles className="h-4 w-4 text-emerald-400"/> AI Assessment</h3>
              </div>

              <div className="flex flex-col items-center justify-center py-2 z-10 relative">
                 <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="56" cy="56" r="48" strokeWidth="6" stroke="#1E293B" fill="transparent" />
                      <circle 
                        cx="56" cy="56" r="48" strokeWidth="6" 
                        className={`transition-all duration-1000 ${getScoreProgressColor(suitabilityScore)}`}
                        strokeDasharray={301.6} 
                        strokeDashoffset={301.6 - (301.6 * suitabilityScore) / 100} 
                        strokeLinecap="round" fill="transparent" 
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-3xl font-black tracking-tighter">{suitabilityScore}</span>
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">Score</span>
                    </div>
                  </div>
                  <p className={`mt-3 text-xs font-bold px-3 py-1 rounded-full bg-white/5 border ${suitabilityScore >= 80 ? "text-emerald-400 border-emerald-500/30" : suitabilityScore >= 50 ? "text-amber-400 border-amber-500/30" : "text-rose-400 border-rose-500/30"}`}>
                    {suitabilityScore >= 80 ? "Highly Favourable" : suitabilityScore >= 50 ? "Exercise Caution" : "Unfavourable"}
                  </p>
              </div>

              <div className="z-10 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm mt-2">
                <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-1.5 flex items-center gap-1.5"><Compass className="h-3 w-3"/> Directive</p>
                <p className="text-xs font-medium text-slate-300 leading-snug">
                  {suitabilityScore >= 80 
                    ? "Open field work is recommended. Capitalize on dry conditions." 
                    : "Postpone sensitive chemical applications until conditions stabilize."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 7-DAY PLANNING (Full Width) ── */}
        <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
          <h3 className="font-black text-slate-900 text-xl tracking-tight mb-6">Week Ahead Planning</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {weather.forecast.map((day, i) => (
              <div key={i} className="flex flex-col items-center justify-center py-6 px-2 bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 transition-all rounded-2xl group cursor-pointer text-center">
                <p className={`text-sm font-black mb-1 ${i === 0 ? 'text-emerald-600' : 'text-slate-800'}`}>{i === 0 ? "Today" : i === 1 ? "Tomorrow" : new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}</p>
                <span className="text-4xl drop-shadow-sm select-none my-3 group-hover:scale-110 transition">{wmoEmoji(day.code)}</span>
                <div className="flex items-center gap-1.5 text-base font-bold mb-3">
                  <span className="text-slate-800">{day.maxTemp}°</span>
                  <span className="text-slate-300 font-normal">/</span>
                  <span className="text-slate-400">{day.minTemp}°</span>
                </div>
                {day.rainProb > 15 ? (
                  <span className="text-[10px] font-black text-blue-600 bg-blue-100/50 border border-blue-200/50 px-2 py-0.5 rounded-full inline-flex items-center gap-1"><CloudRain className="h-3 w-3"/> {day.rainProb}%</span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">Dry</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── SPLIT MAIN CONTENT ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* LEFT COL: Advisories & Disease Risk */}
          <div className="xl:col-span-7 space-y-8">
            
            {/* Core Farming Activities Grid */}
            <div>
              <h3 className="font-black text-slate-900 text-xl tracking-tight mb-4 flex items-center gap-2"><Tractor className="h-5 w-5 text-slate-400"/> Operational Directives</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {adviceList.map((adv, i) => {
                  const isGo = adv.status === "go"; const isCaution = adv.status === "caution";
                  return (
                    <div key={i} className={`bg-white border-2 rounded-[24px] p-6 transition-all hover:shadow-md ${isGo ? 'border-emerald-100 hover:border-emerald-300' : isCaution ? 'border-amber-100 hover:border-amber-300' : 'border-rose-100 hover:border-rose-300'} flex flex-col justify-between`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-2xl ${isGo ? 'bg-emerald-50 text-emerald-600' : isCaution ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                            <adv.icon className="h-5 w-5" />
                          </div>
                          <h4 className="font-black text-slate-900">{adv.activity}</h4>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${isGo ? 'bg-emerald-100 text-emerald-800' : isCaution ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                          {isGo ? "GO" : isCaution ? "CAUTION" : "AVOID"}
                        </span>
                      </div>
                      <p className={`text-sm font-semibold leading-relaxed ${isGo ? 'text-emerald-900/80' : isCaution ? 'text-amber-900/80' : 'text-rose-900/80'}`}>{adv.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Disease Risk Engine */}
            <div className={`bg-white border-2 rounded-[32px] p-8 shadow-sm flex flex-col sm:flex-row items-center gap-6 ${diseaseRisk.color === 'rose' ? 'border-rose-200' : diseaseRisk.color === 'amber' ? 'border-amber-200' : 'border-emerald-200'}`}>
              <div className={`p-6 rounded-full flex-shrink-0 ${diseaseRisk.color === 'rose' ? 'bg-rose-50 text-rose-500' : diseaseRisk.color === 'amber' ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'}`}>
                <ThermometerSun className="h-10 w-10" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-black text-slate-900 text-xl tracking-tight">Crop Health & Disease Risk</h3>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${diseaseRisk.color === 'rose' ? 'bg-rose-50 border-rose-200 text-rose-700' : diseaseRisk.color === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                    {diseaseRisk.level} RISK
                  </span>
                </div>
                <p className="text-base font-bold text-slate-800">{diseaseRisk.risk}</p>
                <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">{diseaseRisk.desc}</p>
              </div>
            </div>
          </div>

          {/* RIGHT COL: Analytics, Radar & Forecast */}
          <div className="xl:col-span-5 space-y-8">
            


            {/* FARM ACTION TIMELINE (Moved to Right Column) */}
            <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm">
              <h3 className="font-black text-slate-900 text-lg tracking-tight mb-1">Farm Action Timeline</h3>
              <p className="text-slate-500 text-xs font-medium mb-6">48-hour forecasted environmental windows</p>
              
              <div className="flex items-end justify-start overflow-x-auto gap-6 pb-4 snap-x scrollbar-hide">
                {weather.hourly.slice(0, 12).map((h, i) => {
                  const isIdealSpray = h.windSpeed < 15 && h.rain === 0 && h.temp < 32;
                  return (
                    <div key={i} className="flex flex-col items-center gap-3 min-w-[60px] snap-center group">
                      {/* Event Marker */}
                      <div className="h-6 flex items-end">
                        {isIdealSpray && <span className="bg-emerald-100 text-emerald-700 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider mb-1 animate-pulse whitespace-nowrap">Spray</span>}
                      </div>
                      <span className="text-2xl drop-shadow-sm select-none group-hover:scale-110 transition">{wmoEmoji(h.code)}</span>
                      <div className="h-24 w-2 bg-slate-100 rounded-full relative overflow-hidden shadow-inner">
                        <div className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-full" style={{ height: `${Math.max(15, (h.temp / 45) * 100)}%` }} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black text-slate-800">{h.temp}°</p>
                        <p className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{h.time}</p>
                        {h.rain > 0 && <p className="text-[9px] font-black text-blue-500 mt-0.5">{h.rain}mm</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>



          </div>
        </div>
      </div>
    </div>
  );
}
