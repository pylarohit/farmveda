"use client";

import React, { useEffect, useState } from "react";
import { Sun, Cloud, CloudRain, CloudLightning, CloudSnow, MapPin } from "lucide-react";

interface DailyWeather {
  date: string;
  maxTemp: number;
  minTemp: number;
  code: number;
}

function getWeatherIcon(code: number) {
  if (code <= 1) return <Sun className="h-6 w-6 text-amber-500" />;
  if (code <= 3) return <Cloud className="h-6 w-6 text-slate-400" />;
  if (code >= 51 && code <= 67) return <CloudRain className="h-6 w-6 text-blue-500" />;
  if (code >= 71 && code <= 86) return <CloudSnow className="h-6 w-6 text-sky-300" />;
  if (code >= 95) return <CloudLightning className="h-6 w-6 text-purple-500" />;
  return <Sun className="h-6 w-6 text-amber-500" />;
}

function getWeatherDesc(code: number) {
  if (code <= 1) return "Clear";
  if (code <= 3) return "Cloudy";
  if (code >= 51 && code <= 67) return "Rain";
  if (code >= 71 && code <= 86) return "Snow";
  if (code >= 95) return "Storm";
  return "Clear";
}

export function WeatherWidget() {
  const [forecast, setForecast] = useState<DailyWeather[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState("Locating...");

  useEffect(() => {
    async function fetchWeather(lat: number, lon: number, name: string) {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=4`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.daily) {
          const parsed = data.daily.time.map((timeStr: string, idx: number) => ({
            date: timeStr,
            maxTemp: Math.round(data.daily.temperature_2m_max[idx]),
            minTemp: Math.round(data.daily.temperature_2m_min[idx]),
            code: data.daily.weathercode[idx],
          }));
          setForecast(parsed);
          setLocationName(name);
        }
      } catch (error) {
        console.error("Failed to fetch weather", error);
        setLocationName("Unknown Location");
      } finally {
        setLoading(false);
      }
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Get city name from reverse geocoding
            const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const geoData = await geoRes.json();
            const city = geoData.city || geoData.locality || geoData.principalSubdivision || "Current Location";
            fetchWeather(latitude, longitude, city);
          } catch (e) {
            fetchWeather(latitude, longitude, "Current Location");
          }
        },
        (error) => {
          console.warn("Geolocation error", error);
          // Fallback location if permission denied
          fetchWeather(16.3067, 80.4365, "Guntur, AP (Default)");
        }
      );
    } else {
      fetchWeather(16.3067, 80.4365, "Guntur, AP (Default)");
    }
  }, []);

  const formatDate = (dateString: string, index: number) => {
    if (index === 0) return "Today";
    if (index === 1) return "Tomorrow";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", { weekday: "short" });
  };

  return (
    <div className="w-full flex-shrink-0 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="font-bold text-slate-800 text-lg font-sora">4-Day Forecast</h3>
          <div className="flex items-center gap-1 mt-1 text-slate-400 text-xs font-medium">
            <MapPin className="h-3 w-3" /> {locationName}
          </div>
        </div>
      </div>

      {/* Forecast List */}
      <div className="flex flex-col gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between animate-pulse py-2">
              <div className="h-4 w-16 bg-slate-200 rounded" />
              <div className="h-8 w-8 bg-slate-200 rounded-full" />
              <div className="flex gap-2">
                <div className="h-4 w-8 bg-slate-200 rounded" />
                <div className="h-4 w-8 bg-slate-200 rounded" />
              </div>
            </div>
          ))
        ) : (
          forecast.map((day, idx) => (
            <div key={idx} className="flex items-center justify-between group p-2 -mx-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
              {/* Date */}
              <div className="w-20 font-semibold text-sm text-slate-700 font-inter">
                {formatDate(day.date, idx)}
              </div>
              
              {/* Icon & Description */}
              <div className="flex items-center gap-3 flex-1 px-4">
                {getWeatherIcon(day.code)}
                <span className="text-xs font-medium text-slate-500">
                  {getWeatherDesc(day.code)}
                </span>
              </div>
              
              {/* High/Low */}
              <div className="flex items-center gap-3 text-sm font-inter">
                <span className="font-bold text-slate-800">{day.maxTemp}°</span>
                <span className="font-medium text-slate-400">{day.minTemp}°</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
