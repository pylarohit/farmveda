"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft, ChevronRight, Plus, X, CheckCircle2,
  Calendar, Leaf, Droplets, Bug, Sprout, Tractor, Package
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────────────── */
type EventCategory = "task" | "irrigation" | "harvest" | "pest" | "fertilizer" | "custom";

interface CalEvent {
  id: string;
  date: string;          // "YYYY-MM-DD"
  title: string;
  category: EventCategory;
  done: boolean;
  fromRoadmap?: boolean;
}

const CATEGORY_META: Record<EventCategory, { label: string; color: string; dot: string; icon: React.ElementType }> = {
  task:        { label: "Task",        color: "bg-blue-100 text-blue-700 border-blue-200",   dot: "bg-blue-500",    icon: Tractor },
  irrigation:  { label: "Irrigation",  color: "bg-sky-100 text-sky-700 border-sky-200",     dot: "bg-sky-500",     icon: Droplets },
  harvest:     { label: "Harvest",     color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500", icon: Package },
  pest:        { label: "Pest Control",color: "bg-red-100 text-red-700 border-red-200",     dot: "bg-red-500",     icon: Bug },
  fertilizer:  { label: "Fertilizer",  color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500", icon: Leaf },
  custom:      { label: "Custom",      color: "bg-purple-100 text-purple-700 border-purple-200", dot: "bg-purple-500", icon: Calendar },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function todayKey() {
  const t = new Date();
  return toKey(t.getFullYear(), t.getMonth(), t.getDate());
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function CalenderPage() {
  const params = useParams();
  const farmId = params.farmId as string;
  const supabase = createClient();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayKey());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCat, setNewCat] = useState<EventCategory>("custom");
  const [newDate, setNewDate] = useState(selectedDate);

  /* Load roadmap steps as calendar events */
  useEffect(() => {
    async function loadRoadmap() {
      const stored = localStorage.getItem(`farm_cal_events_${farmId}`);
      let localEvents: CalEvent[] = stored ? JSON.parse(stored) : [];

      const { data } = await supabase
        .from("farm_roadmaps")
        .select("steps")
        .eq("farm_id", farmId)
        .single();

      if (data?.steps) {
        const roadmapEvents: CalEvent[] = data.steps
          .filter((s: any) => s.estimatedDate)
          .map((s: any) => ({
            id: `rm_${s.title}`,
            date: new Date(s.estimatedDate).toISOString().slice(0, 10),
            title: s.title,
            category: "task" as EventCategory,
            done: s.status === "completed",
            fromRoadmap: true,
          }));

        // Merge: roadmap events replace matching IDs
        const nonRoadmap = localEvents.filter((e) => !e.fromRoadmap);
        localEvents = [...nonRoadmap, ...roadmapEvents];
      }

      setEvents(localEvents);
    }
    loadRoadmap();
  }, [farmId]);

  /* Persist events */
  const save = (evts: CalEvent[]) => {
    setEvents(evts);
    localStorage.setItem(`farm_cal_events_${farmId}`, JSON.stringify(evts));
  };

  const addEvent = () => {
    if (!newTitle.trim()) return;
    const e: CalEvent = {
      id: `custom_${Date.now()}`,
      date: newDate,
      title: newTitle.trim(),
      category: newCat,
      done: false,
    };
    save([...events, e]);
    setNewTitle("");
    setShowAddModal(false);
  };

  const toggleDone = (id: string) => {
    save(events.map((e) => e.id === id ? { ...e, done: !e.done } : e));
  };

  const deleteEvent = (id: string) => {
    save(events.filter((e) => e.id !== id));
  };

  /* Calendar grid */
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const eventsForDate = (dateKey: string) => events.filter(e => e.date === dateKey);
  const selectedEvents = eventsForDate(selectedDate);
  const today = todayKey();

  return (
    <div className="flex-1 overflow-hidden flex flex-col xl:flex-row h-full bg-[#F8FAFC] font-sans">

      {/* ── Main Calendar ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5 lg:p-7">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Farm Calendar</h1>
            <p className="text-sm text-slate-400 font-medium mt-0.5">Track tasks, irrigation, harvest & more</p>
          </div>
          <button
            onClick={() => { setShowAddModal(true); setNewDate(selectedDate); }}
            className="flex items-center gap-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-bold px-4 py-2.5 rounded-2xl shadow-md transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" /> Add Event
          </button>
        </div>

        {/* Month Navigator */}
        <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
            <button onClick={prevMonth} className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            </button>
            <h2 className="text-lg font-extrabold text-slate-800">
              {MONTHS[month]} {year}
            </h2>
            <button onClick={nextMonth} className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
              <ChevronRight className="h-5 w-5 text-slate-600" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-slate-50">
            {DAYS.map(d => (
              <div key={d} className="py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Date Grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 border-b border-r border-slate-50/80" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateKey = toKey(year, month, day);
              const dayEvents = eventsForDate(dateKey);
              const isToday = dateKey === today;
              const isSelected = dateKey === selectedDate;
              const isSunday = (firstDay + i) % 7 === 0;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDate(dateKey)}
                  className={`h-24 border-b border-r border-slate-50/80 p-2 cursor-pointer transition-all hover:bg-slate-50/80 relative ${isSelected ? "bg-green-50/60" : ""} ${isSunday ? "bg-red-50/20" : ""}`}
                >
                  {/* Day number */}
                  <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold mb-1 ${
                    isToday ? "bg-[#16A34A] text-white shadow-sm" :
                    isSelected ? "bg-green-100 text-green-700" :
                    isSunday ? "text-red-400" : "text-slate-700"
                  }`}>
                    {day}
                  </div>

                  {/* Event dots */}
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    {dayEvents.slice(0, 2).map((e) => {
                      const meta = CATEGORY_META[e.category];
                      return (
                        <div key={e.id} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate border ${meta.color} ${e.done ? "opacity-50 line-through" : ""}`}>
                          {e.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <div className="text-[9px] text-slate-400 font-semibold px-1">+{dayEvents.length - 2} more</div>
                    )}
                  </div>

                  {/* Selected ring */}
                  {isSelected && <div className="absolute inset-0 ring-2 ring-[#16A34A]/30 rounded-none pointer-events-none" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-5 px-1">
          {Object.entries(CATEGORY_META).map(([key, meta]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
              <span className="text-[11px] text-slate-500 font-semibold">{meta.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel: Selected Day Events ─────────────────────────── */}
      <div className="w-full xl:w-[340px] flex-shrink-0 border-t xl:border-t-0 xl:border-l border-slate-100 bg-white overflow-y-auto">
        <div className="p-6">
          {/* Selected Date Header */}
          <div className="mb-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Selected</p>
            <h2 className="text-xl font-extrabold text-slate-900">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long", day: "numeric", month: "long"
              })}
            </h2>
            {selectedDate === today && (
              <span className="inline-flex items-center mt-1.5 px-2.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wide">
                Today
              </span>
            )}
          </div>

          {/* Add Quick Event */}
          <button
            onClick={() => { setShowAddModal(true); setNewDate(selectedDate); }}
            className="w-full flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-green-400 hover:text-green-600 hover:bg-green-50/40 transition-all text-sm font-bold mb-5"
          >
            <Plus className="h-4 w-4" /> Add event on this day
          </button>

          {/* Events List */}
          {selectedEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <span className="text-4xl">📅</span>
              <p className="text-sm font-bold text-slate-500">No events</p>
              <p className="text-xs text-slate-400">Nothing scheduled for this day</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {selectedEvents.map((evt) => {
                const meta = CATEGORY_META[evt.category];
                const Icon = meta.icon;
                return (
                  <div
                    key={evt.id}
                    className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${evt.done ? "opacity-60 bg-slate-50" : "bg-white shadow-sm border-slate-100 hover:shadow-md"}`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold text-slate-800 leading-snug ${evt.done ? "line-through text-slate-400" : ""}`}>
                        {evt.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.color}`}>
                          {meta.label}
                        </span>
                        {evt.fromRoadmap && (
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                            Roadmap
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleDone(evt.id)}
                        className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${evt.done ? "text-green-500 bg-green-50" : "text-slate-300 hover:text-green-500 hover:bg-green-50"}`}
                        title={evt.done ? "Mark undone" : "Mark done"}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      {!evt.fromRoadmap && (
                        <button
                          onClick={() => deleteEvent(evt.id)}
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Upcoming this month */}
          <div className="mt-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">This Month</p>
            <div className="flex flex-col gap-2">
              {events
                .filter(e => {
                  const d = new Date(e.date + "T00:00:00");
                  return d.getFullYear() === year && d.getMonth() === month && !e.done;
                })
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 6)
                .map(e => {
                  const meta = CATEGORY_META[e.category];
                  const day = new Date(e.date + "T00:00:00").getDate();
                  return (
                    <button
                      key={e.id}
                      onClick={() => setSelectedDate(e.date)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left w-full"
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />
                      <span className="text-xs font-bold text-slate-500 w-6 flex-shrink-0">{day}</span>
                      <span className="text-xs font-semibold text-slate-700 truncate">{e.title}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Event Modal ──────────────────────────────────────────── */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-7 w-full max-w-md shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-extrabold text-slate-900">Add Farm Event</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Title */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Event Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addEvent()}
                  placeholder="e.g. Apply nitrogen fertilizer"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
                  autoFocus
                />
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(CATEGORY_META) as EventCategory[]).map(cat => {
                    const meta = CATEGORY_META[cat];
                    const Icon = meta.icon;
                    const isActive = newCat === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setNewCat(cat)}
                        className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 transition-all text-center ${
                          isActive
                            ? `${meta.color} border-current shadow-sm scale-105`
                            : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-[10px] font-bold">{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={addEvent}
                disabled={!newTitle.trim()}
                className="w-full py-3.5 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-2xl transition-all shadow-md"
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
