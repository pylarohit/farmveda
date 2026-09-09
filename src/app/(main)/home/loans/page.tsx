"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Bookmark,
  Sprout,
  ExternalLink,
  Calendar,
  Award,
  CheckCircle2,
  FileText,
  Clock,
  TrendingUp,
  Sparkles,
  Users,
  Building2,
  Plus,
  Phone,
  MapPin,
  IndianRupee,
  Timer,
  Tag,
  Info,
  X,
  PhoneCall,
  Ticket,
  HandCoins,
  ChevronRight,
  Percent,
  Wheat,
  User,
  Check,
  Lock,
  Inbox,
  AlertCircle,
  FileCheck,
  CalendarClock,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useUserData } from "@/context/UserDataProvider";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Scheme {
  id: string;
  title: string;
  provider: string;
  type: "Loan" | "Subsidy" | "Govt Scheme";
  publishDate: string;
  eligibility: string[];
  crops: string[];
  interestRate?: string;
  subsidyRate?: string;
  benefitAmount?: string;
  description: string;
  details: string;
  documents: string[];
  applyLink: string;
  color: string;
}

interface FarmerLoan {
  id: string;
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string;
  farmer_avatar: string | null;
  amount: number;
  duration: string;
  interest_rate: number;
  crop_type: string;
  location: string;
  description: string;
  conditions: string;
  created_at: string;
}

interface LoanBooking {
  id: string;
  loan_id: string;
  lender_id: string;
  borrower_id: string;
  status: string;
  created_at: string;
}

interface BorrowerInfo {
  id: string;
  userName: string;
  userPhone: string | null;
  userEmail: string | null;
  avatar: string | null;
  location?: string;
  totalLandAcres?: number;
  landDisplay?: string;
  cropsGrown?: string[];
  soilTypes?: string[];
  farmCount?: number;
}

interface EnrichedBooking extends LoanBooking {
  loan?: FarmerLoan;
  borrower?: BorrowerInfo;
  parsedStatus: "pending" | "approved" | "rejected";
  callDate?: string;
  callTime?: string;
  callNote?: string;
  scheduleText?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CROP_COLORS: Record<string, string> = {
  Paddy: "bg-emerald-50 border-emerald-200 text-emerald-700",
  Cotton: "bg-sky-50 border-sky-200 text-sky-700",
  Wheat: "bg-amber-50 border-amber-200 text-amber-700",
  Sugarcane: "bg-lime-50 border-lime-200 text-lime-700",
  Horticulture: "bg-violet-50 border-violet-200 text-violet-700",
  General: "bg-slate-100 border-slate-200 text-slate-600",
  Other: "bg-orange-50 border-orange-200 text-orange-700",
};

const CARD_ACCENT_COLORS = [
  "bg-amber-50",
  "bg-emerald-50",
  "bg-sky-50",
  "bg-violet-50",
  "bg-rose-50",
  "bg-lime-50",
  "bg-cyan-50",
  "bg-orange-50",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function maskPhone(phone: string) {
  if (!phone || phone.length < 6) return "••••••••••";
  return phone.slice(0, 3) + "•••••" + phone.slice(-2);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function parseBookingStatus(rawStatus: string): {
  status: "pending" | "approved" | "rejected";
  callDate?: string;
  callTime?: string;
  callNote?: string;
  scheduleText?: string;
} {
  if (!rawStatus) return { status: "pending" };
  if (rawStatus.startsWith("approved")) {
    const parts = rawStatus.split("|||");
    const callDate = parts[1] || "";
    const callTime = parts[2] || "";
    const callNote = parts[3] || "";
    let scheduleText = "";
    if (callDate || callTime) {
      let dText = callDate;
      try {
        if (callDate) {
          const d = new Date(callDate + "T00:00:00");
          dText = d.toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          });
        }
      } catch (_) {}

      let tText = callTime;
      if (callTime && callTime.includes(":")) {
        const [h, m] = callTime.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        tText = `${h12}:${m < 10 ? "0" + m : m} ${ampm}`;
      }
      scheduleText = dText ? (tText ? `${dText} at ${tText}` : dText) : tText;
    }

    return {
      status: "approved",
      callDate: callDate || undefined,
      callTime: callTime || undefined,
      callNote: callNote || undefined,
      scheduleText: scheduleText || undefined,
    };
  }
  if (rawStatus.startsWith("rejected")) {
    return { status: "rejected" };
  }
  return { status: "pending" };
}

function formatBorrowerDetails(u: any, farms: any[]): BorrowerInfo {
  const locParts = [u?.village, u?.district, u?.state].filter(Boolean);
  const location = locParts.length > 0 ? locParts.join(", ") : "Location not specified";

  const totalAcres = farms.reduce((sum, f) => {
    const val = parseFloat(f.area_size);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const crops = Array.from(
    new Set(
      farms
        .map((f: any) => f.intended_crop)
        .filter(Boolean)
        .map((c: string) => c.trim())
    )
  ) as string[];

  const soils = Array.from(
    new Set(
      farms
        .map((f: any) => f.soil_type)
        .filter(Boolean)
        .map((s: string) => s.trim())
    )
  ) as string[];

  let landDisplay = "Land details not added";
  if (totalAcres > 0) {
    landDisplay = `${totalAcres} Acre${totalAcres > 1 ? "s" : ""}${
      crops.length > 0 ? ` (${crops.slice(0, 2).join(", ")})` : ""
    }`;
  } else if (farms.length > 0) {
    landDisplay = `${farms.length} Farm${farms.length > 1 ? "s" : ""}${
      crops.length > 0 ? ` (${crops.slice(0, 2).join(", ")})` : ""
    }`;
  }

  return {
    id: u?.id,
    userName: u?.userName || "Farmer",
    userPhone: u?.userPhone || null,
    userEmail: u?.userEmail || null,
    avatar: u?.avatar || null,
    location,
    totalLandAcres: totalAcres,
    landDisplay,
    cropsGrown: crops,
    soilTypes: soils,
    farmCount: farms.length,
  };
}

function playNotificationSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.12); // G5
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (_) {}
}

function sendInAppNotification(title: string, message: string, icon = "🌾") {
  playNotificationSound();
  toast(
    () => (
      <div className="flex items-start gap-3 py-0.5">
        <span className="text-2xl shrink-0 mt-0.5">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-xs text-slate-900 leading-tight">{title}</p>
          <p className="text-[11px] text-slate-600 mt-1 leading-snug break-words">{message}</p>
        </div>
      </div>
    ),
    {
      duration: 7000,
      position: "top-right",
      style: {
        background: "#ffffff",
        border: "2px solid #0f172a",
        boxShadow: "4px 4px 0px rgba(15,23,42,1)",
        borderRadius: "16px",
        padding: "12px 16px",
      },
    }
  );

  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body: message,
        icon: "/favicon.ico",
      });
    } catch (_) {}
  }
}

function requestBrowserNotificationPermission() {
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────


function FarmerLoanCard({
  loan,
  index,
  isOwn = false,
  pendingCount = 0,
  totalRequests = 0,
  onClick,
}: {
  loan: FarmerLoan;
  index: number;
  isOwn?: boolean;
  pendingCount?: number;
  totalRequests?: number;
  onClick: () => void;
}) {
  const accent = CARD_ACCENT_COLORS[index % CARD_ACCENT_COLORS.length];
  const cropColor = CROP_COLORS[loan.crop_type] || CROP_COLORS["Other"];

  return (
    <div
      onClick={onClick}
      className={`${accent} rounded-3xl p-5 border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] flex flex-col justify-between hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(15,23,42,1)] transition-all cursor-pointer min-h-[260px]`}
    >
      {/* Header row: time + crop + optional own-badge */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="bg-slate-900 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo(loan.created_at)}
          </div>
          {isOwn && (
            <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              Your Post
            </span>
          )}
          {isOwn && pendingCount > 0 && (
            <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 animate-pulse">
              <Inbox className="h-3 w-3" />
              {pendingCount} New Request{pendingCount > 1 ? "s" : ""}
            </span>
          )}
          {isOwn && pendingCount === 0 && totalRequests > 0 && (
            <span className="bg-slate-200 text-slate-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Users className="h-3 w-3" />
              {totalRequests} Applied
            </span>
          )}
        </div>
        <span className={`text-[9px] font-black border px-2 py-0.5 rounded-full uppercase shrink-0 ${cropColor}`}>
          {loan.crop_type || "General"}
        </span>
      </div>

      {/* Farmer info */}
      <div className="my-3 flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center shrink-0 text-white text-xs font-black shadow">
          {loan.farmer_avatar ? (
            <img src={loan.farmer_avatar} alt={loan.farmer_name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            getInitials(loan.farmer_name || "FA")
          )}
        </div>
        <div className="min-w-0">
          <p className="font-extrabold text-slate-900 text-sm leading-tight font-sora truncate">
            {loan.farmer_name || "Anonymous Farmer"}
          </p>
          {loan.location && (
            <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-0.5 mt-0.5">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{loan.location}</span>
            </p>
          )}
        </div>
      </div>

      {/* Amount + Description */}
      <div className="space-y-1">
        <div className="flex items-baseline gap-0.5">
          <span className="text-sm font-black text-slate-900">₹</span>
          <span className="text-2xl font-black text-slate-900 font-sora leading-none">
            {Number(loan.amount).toLocaleString("en-IN")}
          </span>
        </div>
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-semibold">
          {loan.description}
        </p>
      </div>

      {/* Footer */}
      <div className="space-y-2.5 mt-3">
        <div className="flex flex-wrap gap-1.5">
          <span className="flex items-center gap-1 bg-white/80 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase">
            <Timer className="h-3 w-3" />
            {loan.duration}
          </span>
          <span className={`flex items-center gap-1 border px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
            loan.interest_rate === 0
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-white/80 border-slate-200 text-slate-700"
          }`}>
            <Percent className="h-3 w-3" />
            {loan.interest_rate === 0 ? "Interest Free" : `${loan.interest_rate}% p.a.`}
          </span>
        </div>
        <hr className="border-slate-900/10" />
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1">
            <Phone className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500">
              {isOwn ? loan.farmer_phone : maskPhone(loan.farmer_phone)}
            </span>
          </div>
          <button className="bg-slate-900 hover:bg-slate-700 text-white text-[11px] font-black px-4 py-1.5 rounded-lg transition-all shadow-[1px_1px_0px_rgba(15,23,42,0.3)] cursor-pointer flex items-center gap-1 active:translate-y-[1px]">
            View <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Post Loan Modal ─────────────────────────────────────────────────────────

function PostLoanModal({
  onClose,
  onPosted,
  user,
}: {
  onClose: () => void;
  onPosted: () => void;
  user: any;
}) {
  const supabase = createClient();
  const [form, setForm] = useState({
    amount: "",
    duration: "",
    interest_rate: "0",
    crop_type: "General",
    location: "",
    description: "",
    conditions: "",
    farmer_phone: user?.userPhone || "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.duration || !form.description) {
      toast.error("Please fill Amount, Duration and Description.");
      return;
    }
    if (!form.farmer_phone) {
      toast.error("Please add your phone number so others can contact you.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("farmer_loans").insert([
        {
          farmer_id: user?.id,
          farmer_name: user?.userName || "Anonymous",
          farmer_phone: form.farmer_phone,
          farmer_avatar: user?.avatar || null,
          amount: parseFloat(form.amount),
          duration: form.duration,
          interest_rate: parseFloat(form.interest_rate) || 0,
          crop_type: form.crop_type,
          location: form.location,
          description: form.description,
          conditions: form.conditions,
        },
      ]);
      if (error) throw error;
      toast.success("Loan posted successfully! 🎉");
      onPosted();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to post loan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white border-2 border-slate-900 shadow-[6px_6px_0px_rgba(15,23,42,1)] rounded-3xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 p-5 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <HandCoins className="h-5 w-5 text-amber-400" />
            <div>
              <h3 className="text-base font-extrabold font-sora">Post a Loan</h3>
              <p className="text-slate-400 text-[10px] font-semibold">
                Lend to fellow farmers — build community trust
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto space-y-4 flex-1 text-sm"
        >
          {/* Amount + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <IndianRupee className="h-3 w-3" /> Loan Amount (₹) *
              </label>
              <input
                type="number"
                name="amount"
                placeholder="e.g. 50000"
                value={form.amount}
                onChange={handleChange}
                required
                className="w-full border-2 border-slate-200 focus:border-slate-900 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <Timer className="h-3 w-3" /> Duration *
              </label>
              <input
                type="text"
                name="duration"
                placeholder="e.g. 3 months"
                value={form.duration}
                onChange={handleChange}
                required
                className="w-full border-2 border-slate-200 focus:border-slate-900 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-colors"
              />
            </div>
          </div>

          {/* Interest + Crop */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <Percent className="h-3 w-3" /> Interest Rate (%)
              </label>
              <input
                type="number"
                name="interest_rate"
                placeholder="0 for interest-free"
                value={form.interest_rate}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.1"
                className="w-full border-2 border-slate-200 focus:border-slate-900 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <Wheat className="h-3 w-3" /> Crop Type
              </label>
              <select
                name="crop_type"
                value={form.crop_type}
                onChange={handleChange}
                className="w-full border-2 border-slate-200 focus:border-slate-900 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-colors bg-white"
              >
                {["General", "Paddy", "Cotton", "Wheat", "Sugarcane", "Horticulture", "Other"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Location
              </label>
              <input
                type="text"
                name="location"
                placeholder="Village / District"
                value={form.location}
                onChange={handleChange}
                className="w-full border-2 border-slate-200 focus:border-slate-900 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <Phone className="h-3 w-3" /> Contact Phone *
              </label>
              <input
                type="tel"
                name="farmer_phone"
                placeholder="10-digit mobile"
                value={form.farmer_phone}
                onChange={handleChange}
                required
                className="w-full border-2 border-slate-200 focus:border-slate-900 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
              <Info className="h-3 w-3" /> Description *
            </label>
            <textarea
              name="description"
              placeholder="Why are you offering this loan? What is it for?"
              value={form.description}
              onChange={handleChange}
              required
              rows={3}
              className="w-full border-2 border-slate-200 focus:border-slate-900 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-colors resize-none"
            />
          </div>

          {/* Conditions */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
              <Tag className="h-3 w-3" /> Conditions / Terms
            </label>
            <textarea
              name="conditions"
              placeholder="e.g. Repayment after harvest, need land document as proof…"
              value={form.conditions}
              onChange={handleChange}
              rows={2}
              className="w-full border-2 border-slate-200 focus:border-slate-900 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-colors resize-none"
            />
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-extrabold py-3 rounded-xl transition-colors shadow-[2px_2px_0px_rgba(15,23,42,1)] cursor-pointer flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Posting…
                </>
              ) : (
                <>
                  <HandCoins className="h-4 w-4" />
                  Post Loan Offer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Schedule Call Modal (For Lender on Accept) ──────────────────────────────

function ScheduleCallModal({
  booking,
  loan,
  onClose,
  onConfirm,
  loading = false,
}: {
  booking: EnrichedBooking;
  loan?: FarmerLoan;
  onClose: () => void;
  onConfirm: (bookingId: string, callDate: string, callTime: string, note?: string) => Promise<void>;
  loading?: boolean;
}) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split("T")[0];

  const [date, setDate] = useState(booking.callDate || defaultDateStr);
  const [time, setTime] = useState(booking.callTime || "10:30");
  const [note, setNote] = useState(booking.callNote || "");

  const handleQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setDate(d.toISOString().split("T")[0]);
  };

  const handleQuickTime = (t: string) => {
    setTime(t);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) {
      toast.error("Please pick a call date and time.");
      return;
    }
    await onConfirm(booking.id, date, time, note);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className="bg-white border-2 border-slate-900 shadow-[6px_6px_0px_rgba(15,23,42,1)] rounded-3xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 p-5 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold font-sora">Schedule Connection Call</h3>
              <p className="text-slate-400 text-[10px] font-semibold">
                Set date &amp; time to talk with the farmer
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-semibold">
          {/* Applicant Info Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-black shrink-0">
              {booking.borrower?.avatar ? (
                <img src={booking.borrower.avatar} alt={booking.borrower.userName} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                getInitials(booking.borrower?.userName || "Farmer")
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-slate-900 text-sm truncate">
                {booking.borrower?.userName || "Farmer"}
              </p>
              <p className="text-slate-500 text-[11px] truncate">
                📍 {booking.borrower?.location || "Local"} • 🌱 {booking.borrower?.landDisplay || "Land details registered"}
              </p>
              {booking.borrower?.userPhone && (
                <p className="text-emerald-700 font-bold text-[11px] font-mono mt-0.5">
                  📞 {booking.borrower.userPhone}
                </p>
              )}
            </div>
          </div>

          {/* Date Picker + Quick Chips */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <Calendar className="h-3 w-3 text-blue-600" /> Call Date *
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickDate(0)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-extrabold px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDate(1)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-extrabold px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDate(2)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-extrabold px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                >
                  In 2 Days
                </button>
              </div>
            </div>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white border-2 border-slate-200 focus:border-slate-900 rounded-xl px-3 py-2 text-xs font-bold outline-none"
            />
          </div>

          {/* Time Picker + Quick Chips */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <Clock className="h-3 w-3 text-emerald-600" /> Call Time *
              </label>
              <div className="flex items-center gap-1">
                {["10:00", "14:00", "17:30", "19:00"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleQuickTime(t)}
                    className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                      time === t ? "bg-emerald-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    {t === "10:00" ? "10 AM" : t === "14:00" ? "2 PM" : t === "17:30" ? "5:30 PM" : "7 PM"}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-white border-2 border-slate-200 focus:border-slate-900 rounded-xl px-3 py-2 text-xs font-bold outline-none"
            />
          </div>

          {/* Optional Note */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
              <Tag className="h-3 w-3 text-amber-500" /> Note for Call (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Discuss loan terms & documents required before payout"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-white border-2 border-slate-200 focus:border-slate-900 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
            />
          </div>

          {/* Call Connection Preview */}
          <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-3 flex items-start gap-2 text-emerald-900 text-[11px] leading-relaxed">
            <PhoneCall className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold">Both of you will be scheduled to connect</p>
              <p className="text-emerald-700 text-[10px] mt-0.5">
                The farmer will see this scheduled call time on their application ticket and can call you or receive your call.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-extrabold py-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 text-xs shadow-md"
            >
              {loading ? (
                <>
                  <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                  Confirming Schedule…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm &amp; Schedule Call
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Farmer Loan Detail Modal ────────────────────────────────────────────────

function FarmerLoanDetailModal({
  loan,
  onClose,
  currentUser,
  onUpdated,
}: {
  loan: FarmerLoan;
  onClose: () => void;
  currentUser: any;
  onUpdated?: () => void;
}) {
  const supabase = createClient();
  const [applying, setApplying] = useState(false);
  const [booking, setBooking] = useState<EnrichedBooking | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [phoneRevealed, setPhoneRevealed] = useState(false);

  // Apply confirmation form state
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applicantPhone, setApplicantPhone] = useState(currentUser?.userPhone || "");
  const [applicantLocation, setApplicantLocation] = useState(
    [currentUser?.village, currentUser?.district, currentUser?.state].filter(Boolean).join(", ") || ""
  );
  const [applicantLand, setApplicantLand] = useState("");
  const [applicantCrop, setApplicantCrop] = useState(loan.crop_type || "General");

  // For lender: incoming applications
  const [incomingApplications, setIncomingApplications] = useState<EnrichedBooking[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal for scheduling call on accept
  const [schedulingBooking, setSchedulingBooking] = useState<EnrichedBooking | null>(null);

  const isOwnLoan = currentUser && String(currentUser.id) === String(loan.farmer_id);

  // Prefill applicant's farm/land if available
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const { data: farmsData } = await supabase
          .from("farms")
          .select("area_size, intended_crop, field_name")
          .eq("user_id", currentUser.id);
        if (farmsData && farmsData.length > 0) {
          const total = farmsData.reduce((sum, f) => sum + (parseFloat(f.area_size) || 0), 0);
          if (total > 0) setApplicantLand(String(total));
          const crop = farmsData.find((f) => f.intended_crop)?.intended_crop;
          if (crop) setApplicantCrop(crop);
        }
      } catch (_) {}
    })();
  }, [currentUser, supabase]);

  // For borrower: check if already applied
  useEffect(() => {
    if (!currentUser || isOwnLoan) {
      setLoadingCheck(false);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from("loan_bookings")
          .select("*")
          .eq("loan_id", loan.id)
          .eq("borrower_id", currentUser.id)
          .maybeSingle();
        if (data) {
          const parsed = parseBookingStatus(data.status);
          setBooking({
            ...data,
            parsedStatus: parsed.status,
            callDate: parsed.callDate,
            callTime: parsed.callTime,
            callNote: parsed.callNote,
            scheduleText: parsed.scheduleText,
          } as EnrichedBooking);
          setAlreadyApplied(true);
        }
      } catch (_) {}
      setLoadingCheck(false);
    })();
  }, [currentUser, loan.id, isOwnLoan, supabase]);

  // For lender: fetch incoming applications with rich borrower details
  const fetchApplications = useCallback(async () => {
    if (!isOwnLoan) return;
    setLoadingApplications(true);
    try {
      const { data, error } = await supabase
        .from("loan_bookings")
        .select("*")
        .eq("loan_id", loan.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) {
        const borrowerIds = Array.from(new Set(data.map((b: any) => b.borrower_id)));
        
        const { data: userData } = await supabase
          .from("users")
          .select("id, userName, userPhone, userEmail, avatar, village, district, state")
          .in("id", borrowerIds);
        const userMap = new Map((userData || []).map((u: any) => [u.id, u]));

        const { data: farmsData } = await supabase
          .from("farms")
          .select("user_id, area_size, intended_crop, soil_type, field_name")
          .in("user_id", borrowerIds);

        const farmsByUser = new Map<string, any[]>();
        (farmsData || []).forEach((f: any) => {
          const list = farmsByUser.get(f.user_id) || [];
          list.push(f);
          farmsByUser.set(f.user_id, list);
        });

        const enriched: EnrichedBooking[] = data.map((b: any) => {
          const u = userMap.get(b.borrower_id);
          const uFarms = farmsByUser.get(b.borrower_id) || [];
          const parsed = parseBookingStatus(b.status);
          return {
            ...b,
            parsedStatus: parsed.status,
            callDate: parsed.callDate,
            callTime: parsed.callTime,
            callNote: parsed.callNote,
            scheduleText: parsed.scheduleText,
            borrower: u ? formatBorrowerDetails(u, uFarms) : undefined,
          };
        });
        setIncomingApplications(enriched);
      } else {
        setIncomingApplications([]);
      }
    } catch (_) {
      setIncomingApplications([]);
    } finally {
      setLoadingApplications(false);
    }
  }, [isOwnLoan, loan.id, supabase]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Real-time synchronization for the currently open loan modal
  useEffect(() => {
    if (!loan.id) return;
    const modalChannel = supabase
      .channel(`modal_loan_${loan.id}_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "loan_bookings",
          filter: `loan_id=eq.${loan.id}`,
        },
        async () => {
          if (isOwnLoan) {
            fetchApplications();
          } else if (currentUser) {
            const { data } = await supabase
              .from("loan_bookings")
              .select("*")
              .eq("loan_id", loan.id)
              .eq("borrower_id", currentUser.id)
              .maybeSingle();
            if (data) {
              const parsed = parseBookingStatus(data.status);
              setBooking({
                ...data,
                parsedStatus: parsed.status,
                callDate: parsed.callDate,
                callTime: parsed.callTime,
                callNote: parsed.callNote,
                scheduleText: parsed.scheduleText,
              } as EnrichedBooking);
              setAlreadyApplied(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(modalChannel);
    };
  }, [loan.id, isOwnLoan, currentUser, supabase, fetchApplications]);

  // Lender: accept with call date & time
  const handleScheduleConfirm = async (bookingId: string, callDate: string, callTime: string, note?: string) => {
    setActionLoading(bookingId);
    try {
      const fullStatus = `approved|||${callDate}|||${callTime}|||${note || ""}`;
      const { error } = await supabase
        .from("loan_bookings")
        .update({ status: fullStatus })
        .eq("id", bookingId);
      if (error) throw error;

      const parsed = parseBookingStatus(fullStatus);
      setIncomingApplications((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? {
                ...b,
                status: fullStatus,
                parsedStatus: "approved",
                callDate: parsed.callDate,
                callTime: parsed.callTime,
                callNote: parsed.callNote,
                scheduleText: parsed.scheduleText,
              }
            : b
        )
      );

      // Notify borrower in messages table with full details
      const currentB = incomingApplications.find((a) => a.id === bookingId);
      const isReschedule = currentB?.parsedStatus === "approved";
      if (currentB && currentUser) {
        try {
          await supabase.from("messages").insert([
            {
              sender_id: String(currentUser.id),
              receiver_id: String(currentB.borrower_id),
              content: isReschedule
                ? `📅 Connection Call Rescheduled: ${currentUser.userName || "Lender"} rescheduled your loan discussion call to ${parsed.scheduleText || callDate + " at " + callTime}. Lender Phone: ${loan.farmer_phone}${note ? `. Note: "${note}"` : ""}`
                : `🎉 Loan Application Approved! ${currentUser.userName || "Lender"} approved your application for ₹${loan.amount.toLocaleString("en-IN")}. Connection call scheduled for ${parsed.scheduleText || callDate + " at " + callTime}. Lender Phone: ${loan.farmer_phone}${note ? `. Note: "${note}"` : ""}`,
              type: "text",
            },
          ]);
        } catch (_) {}
      }

      setSchedulingBooking(null);
      toast.success(`Application accepted! Call scheduled for ${parsed.scheduleText || callDate} 🎉`);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule call.");
    } finally {
      setActionLoading(null);
    }
  };

  // Lender: reject
  const handleReject = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      const { error } = await supabase
        .from("loan_bookings")
        .update({ status: "rejected" })
        .eq("id", bookingId);
      if (error) throw error;
      setIncomingApplications((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "rejected", parsedStatus: "rejected" } : b))
      );

      // Send rejection notification to borrower in messages
      const targetB = incomingApplications.find((b) => b.id === bookingId);
      if (targetB && currentUser) {
        try {
          await supabase.from("messages").insert([
            {
              sender_id: String(currentUser.id),
              receiver_id: String(targetB.borrower_id),
              content: `❌ Loan Application Update: Your loan application for ₹${loan.amount.toLocaleString("en-IN")} was declined by the lender.`,
              type: "text",
            },
          ]);
        } catch (_) {}
      }

      toast.success("Application rejected.");
      if (onUpdated) onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  // Borrower: apply with verified details
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error("Please log in to apply.");
      return;
    }
    if (isOwnLoan) {
      toast.error("You cannot apply for your own loan.");
      return;
    }
    if (!applicantPhone || applicantPhone.trim().length < 6) {
      toast.error("Please enter a valid phone number so the lender can contact you.");
      return;
    }

    setApplying(true);
    try {
      await supabase
        .from("users")
        .update({
          userPhone: applicantPhone.trim(),
          village: applicantLocation.trim() || currentUser.village,
        })
        .eq("id", currentUser.id);

      if (applicantLand && parseFloat(applicantLand) > 0) {
        const { data: existingFarms } = await supabase
          .from("farms")
          .select("id")
          .eq("user_id", currentUser.id);

        if (!existingFarms || existingFarms.length === 0) {
          await supabase.from("farms").insert([
            {
              user_id: currentUser.id,
              field_name: `${applicantCrop || "General"} Farm|||${applicantLocation || "Local"}`,
              area_size: String(applicantLand),
              intended_crop: applicantCrop || "General",
              soil_type: "Loamy",
            },
          ]);
        }
      }

      const { data, error } = await supabase
        .from("loan_bookings")
        .insert([
          {
            loan_id: loan.id,
            lender_id: loan.farmer_id,
            borrower_id: currentUser.id,
            status: "pending",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Send instant notification message to the lender
      try {
        const borrowerDisplayName = currentUser.userName || "A farmer";
        const landInfo = applicantLand ? `${applicantLand} acres` : "";
        const locationInfo = applicantLocation || currentUser.village || "";
        const detailsSnippet = [locationInfo, landInfo].filter(Boolean).join(" • ");

        await supabase.from("messages").insert([
          {
            sender_id: String(currentUser.id),
            receiver_id: String(loan.farmer_id),
            content: `🌾 New Loan Application: ${borrowerDisplayName} applied for your ₹${loan.amount.toLocaleString("en-IN")} loan!${detailsSnippet ? ` (${detailsSnippet})` : ""} Contact: ${applicantPhone}. Review in Received Requests to schedule a call.`,
            type: "text",
          },
        ]);
      } catch (notifyErr) {
        console.warn("Notification delivery error:", notifyErr);
      }

      const parsed = parseBookingStatus(data.status);
      setBooking({
        ...data,
        parsedStatus: parsed.status,
      } as EnrichedBooking);
      setAlreadyApplied(true);
      setShowApplyForm(false);
      toast.success("Application submitted! The lender will review and schedule a connection call. 🎉");
      if (onUpdated) onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Failed to apply.");
    } finally {
      setApplying(false);
    }
  };

  const accent = CROP_COLORS[loan.crop_type] || CROP_COLORS["Other"];
  const isApproved = booking?.parsedStatus === "approved" || booking?.status?.startsWith("approved");
  const isRejected = booking?.parsedStatus === "rejected";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white border-2 border-slate-900 shadow-[6px_6px_0px_rgba(15,23,42,1)] rounded-3xl max-w-xl w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 p-5 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-900 font-black text-sm shrink-0 shadow-md">
              {loan.farmer_avatar ? (
                <img src={loan.farmer_avatar} alt={loan.farmer_name} className="w-11 h-11 rounded-full object-cover" />
              ) : (
                getInitials(loan.farmer_name || "FA")
              )}
            </div>
            <div>
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                {isOwnLoan ? "Your Loan Listing" : "Farmer Loan Offer"}
              </p>
              <h3 className="text-base font-extrabold font-sora leading-tight">
                {loan.farmer_name || "Anonymous Farmer"}
              </h3>
              {loan.location && (
                <p className="text-slate-400 text-[10px] flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" /> {loan.location}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scroll Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm text-slate-700 font-semibold leading-relaxed">
          {/* Key stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3 text-center">
              <p className="text-[9px] font-black uppercase text-amber-500 tracking-wider mb-1">Amount</p>
              <p className="text-xl font-black text-slate-900 font-sora leading-none">
                ₹{Number(loan.amount).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-3 text-center">
              <p className="text-[9px] font-black uppercase text-sky-500 tracking-wider mb-1">Duration</p>
              <p className="text-lg font-black text-slate-900 font-sora leading-tight">{loan.duration}</p>
            </div>
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-3 text-center">
              <p className="text-[9px] font-black uppercase text-emerald-500 tracking-wider mb-1">Interest</p>
              <p className="text-lg font-black text-slate-900 font-sora leading-tight">
                {loan.interest_rate === 0 ? "0%" : `${loan.interest_rate}%`}
              </p>
            </div>
          </div>

          {/* Crop + time */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-black border px-3 py-1 rounded-full uppercase ${accent}`}>
              🌾 {loan.crop_type || "General"} crop
            </span>
            <span className="text-[10px] font-black border border-slate-200 bg-slate-50 text-slate-600 px-3 py-1 rounded-full uppercase">
              📅 {timeAgo(loan.created_at)}
            </span>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">About this Loan</h4>
            <p className="text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-3 border border-slate-100">
              {loan.description}
            </p>
          </div>

          {/* Conditions */}
          {loan.conditions && (
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Conditions & Terms</h4>
              <p className="text-slate-700 leading-relaxed bg-amber-50 rounded-xl p-3 border border-amber-100">
                {loan.conditions}
              </p>
            </div>
          )}

          {/* ── LENDER VIEW: incoming applications with complete Farmer Details & Call Scheduling ── */}
          {isOwnLoan && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-slate-700" />
                  <h4 className="text-[11px] font-black uppercase text-slate-700 tracking-wider">
                    Incoming Applications ({incomingApplications.length})
                  </h4>
                </div>
                <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {incomingApplications.filter((a) => a.parsedStatus === "pending").length} Pending
                </span>
              </div>

              {loadingApplications ? (
                <div className="flex justify-center py-4">
                  <span className="animate-spin h-5 w-5 border-2 border-slate-400 border-t-transparent rounded-full" />
                </div>
              ) : incomingApplications.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
                  <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-700 text-xs font-bold">No applications received yet</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Other farmers who apply will appear here with their Name, Location, Land, and Contact Number.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incomingApplications.map((app) => (
                    <div
                      key={app.id}
                      className="bg-white border-2 border-slate-900 rounded-2xl p-4 flex flex-col gap-3 shadow-[2px_2px_0px_rgba(15,23,42,1)]"
                    >
                      {/* Farmer Name & Avatar & Status */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs font-black shrink-0 shadow">
                            {app.borrower?.avatar ? (
                              <img
                                src={app.borrower.avatar}
                                alt={app.borrower.userName}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              getInitials(app.borrower?.userName || "Farmer")
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-extrabold text-slate-900 text-sm truncate">
                                {app.borrower?.userName || "Farmer"}
                              </p>
                              <span className="bg-blue-100 text-blue-800 text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
                                Applicant
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-semibold">
                              Applied {timeAgo(app.created_at)} • Ticket #{app.id.slice(0, 8).toUpperCase()}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase shrink-0 ${
                            app.parsedStatus === "approved"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : app.parsedStatus === "rejected"
                              ? "bg-red-100 text-red-700 border border-red-300"
                              : "bg-amber-100 text-amber-800 border border-amber-300"
                          }`}
                        >
                          {app.parsedStatus}
                        </span>
                      </div>

                      {/* Detailed Credentials: Location, Land Owned, Phone Number */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-[9px] font-black uppercase text-slate-400 block leading-tight">Location</span>
                            <span className="font-bold text-slate-800 truncate block text-[11px]">
                              {app.borrower?.location || "Not specified"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-1.5">
                          <Sprout className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-[9px] font-black uppercase text-slate-400 block leading-tight">Land Owned</span>
                            <span className="font-bold text-slate-800 truncate block text-[11px]">
                              {app.borrower?.landDisplay || "No registered land"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-[9px] font-black uppercase text-slate-400 block leading-tight">Phone Number</span>
                            <span className="font-bold text-slate-800 truncate block text-[11px] font-mono">
                              {app.borrower?.userPhone || "Not provided"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Scheduled Call Info (if approved) */}
                      {app.parsedStatus === "approved" && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CalendarClock className="h-4 w-4 text-emerald-700 shrink-0" />
                            <div>
                              <span className="text-[9px] font-black uppercase text-emerald-700 block">Scheduled Connection Call</span>
                              <span className="font-extrabold text-slate-900 text-xs">{app.scheduleText || "Call scheduled"}</span>
                              {app.callNote && <p className="text-[10px] text-emerald-700 italic mt-0.5">&quot;{app.callNote}&quot;</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {app.borrower?.userPhone && (
                              <a
                                href={`tel:${app.borrower.userPhone}`}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 transition-colors shadow-sm"
                              >
                                <Phone className="h-3 w-3" /> Call Farmer
                              </a>
                            )}
                            <button
                              onClick={() => setSchedulingBooking(app)}
                              className="bg-white hover:bg-slate-100 border border-emerald-300 text-emerald-800 text-[11px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                            >
                              Reschedule
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Decision buttons (if pending) */}
                      {app.parsedStatus === "pending" && (
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                          <button
                            onClick={() => setSchedulingBooking(app)}
                            disabled={actionLoading === app.id}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black py-2 px-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <CalendarClock className="h-3.5 w-3.5" />
                            Accept &amp; Schedule Call
                          </button>
                          <button
                            onClick={() => handleReject(app.id)}
                            disabled={actionLoading === app.id}
                            className="bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 border border-red-200 text-xs font-black py-2 px-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <X className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── BORROWER VIEW: booking ticket + phone reveal + scheduled call time ── */}
          {!isOwnLoan && alreadyApplied && booking && (
            <div
              className={`border-2 rounded-2xl p-4 space-y-3.5 ${
                isApproved
                  ? "border-emerald-500 bg-emerald-50/80"
                  : isRejected
                  ? "border-red-300 bg-red-50/80"
                  : "border-amber-300 bg-amber-50/80"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Ticket
                    className={`h-5 w-5 shrink-0 ${
                      isApproved ? "text-emerald-600" : isRejected ? "text-red-600" : "text-amber-600"
                    }`}
                  />
                  <div>
                    <p
                      className={`font-extrabold text-sm ${
                        isApproved ? "text-emerald-900" : isRejected ? "text-red-900" : "text-amber-900"
                      }`}
                    >
                      {isApproved
                        ? "Application Approved by Lender! 🎉"
                        : isRejected
                        ? "Application Declined"
                        : "Application Submitted • Awaiting Approval"}
                    </p>
                    <p
                      className={`text-[10px] font-semibold ${
                        isApproved ? "text-emerald-700" : isRejected ? "text-red-600" : "text-amber-700"
                      }`}
                    >
                      Ticket #{booking.id.slice(0, 8).toUpperCase()} • Applied {timeAgo(booking.created_at)}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                    isApproved
                      ? "bg-emerald-200 text-emerald-800"
                      : isRejected
                      ? "bg-red-200 text-red-800"
                      : "bg-amber-200 text-amber-800"
                  }`}
                >
                  {isApproved ? "Approved" : booking.parsedStatus}
                </span>
              </div>

              {isApproved ? (
                <div className="space-y-3">
                  {/* Scheduled Call Box */}
                  <div className="bg-white border-2 border-emerald-400 rounded-xl p-3 flex items-start gap-2.5 shadow-sm">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                      <CalendarClock className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-black uppercase text-emerald-700 block">
                        Lender Scheduled Call Time &amp; Date
                      </span>
                      <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                        {booking.scheduleText || "Scheduled on Application Approval"}
                      </p>
                      {booking.callNote && (
                        <p className="text-[11px] text-emerald-800 italic mt-1 font-medium bg-emerald-50/70 p-1.5 rounded-md border border-emerald-100">
                          &quot;{booking.callNote}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Lender Phone Contact Card */}
                  {!phoneRevealed ? (
                    <button
                      onClick={() => setPhoneRevealed(true)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-sm shadow-md active:translate-y-[1px]"
                    >
                      <PhoneCall className="h-4 w-4" />
                      Reveal Lender&apos;s Contact Number
                    </button>
                  ) : (
                    <div className="bg-white border-2 border-emerald-500 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-emerald-600" />
                        <div>
                          <p className="text-[10px] uppercase font-black text-slate-400">Lender Mobile</p>
                          <p className="text-base font-extrabold text-slate-900 font-mono">{loan.farmer_phone}</p>
                        </div>
                      </div>
                      <a
                        href={`tel:${loan.farmer_phone}`}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Phone className="h-3.5 w-3.5" /> Call Now
                      </a>
                    </div>
                  )}

                  <p className="text-[11px] text-emerald-800 text-center font-semibold">
                    Please be available by phone at the scheduled time to discuss terms and finalize the loan!
                  </p>
                </div>
              ) : isRejected ? (
                <div className="flex items-center gap-2.5 bg-red-100 rounded-xl px-3.5 py-3">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                  <p className="text-red-800 text-xs font-semibold">
                    The lender was unable to accept this loan application. You can explore other farmer loans.
                  </p>
                </div>
              ) : (
                /* Pending state — phone securely hidden */
                <div className="flex items-center gap-3 bg-amber-100/90 rounded-xl px-3.5 py-3 border border-amber-200">
                  <div className="h-8 w-8 rounded-full bg-amber-200/80 flex items-center justify-center shrink-0">
                    <Lock className="h-4 w-4 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-amber-900 font-extrabold text-xs">Awaiting Lender Review</p>
                    <p className="text-amber-700 text-[11px] font-semibold leading-tight mt-0.5">
                      Once the lender accepts your request, they will schedule a call date &amp; time to connect with you.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── BORROWER APPLY FORM: Confirm Name, Phone, Location & Land Details ── */}
          {!isOwnLoan && !alreadyApplied && showApplyForm && (
            <form
              onSubmit={handleApplySubmit}
              className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-4 space-y-3.5 animate-in fade-in zoom-in-95 duration-200 shadow-[2px_2px_0px_rgba(15,23,42,1)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-slate-800" />
                  <h4 className="font-extrabold text-slate-900 text-sm font-sora">
                    Confirm Details for Lender
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApplyForm(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-slate-500 text-xs leading-relaxed">
                The lender will review your profile, land, and contact details to schedule a call and finalize the loan.
              </p>

              {/* Applicant Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Your Full Name</label>
                <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800">
                  {currentUser?.userName || "Farmer"}
                </div>
              </div>

              {/* Phone & Location */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                    <Phone className="h-3 w-3 text-amber-500" /> Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile"
                    value={applicantPhone}
                    onChange={(e) => setApplicantPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-slate-900 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-blue-500" /> Village / District
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Srungavaram, Vizag"
                    value={applicantLocation}
                    onChange={(e) => setApplicantLocation(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-slate-900 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              {/* Land Owned & Crop */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                    <Sprout className="h-3 w-3 text-emerald-500" /> Land Owned (Acres)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g. 5"
                    value={applicantLand}
                    onChange={(e) => setApplicantLand(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-slate-900 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                    <Wheat className="h-3 w-3 text-amber-600" /> Main Crop Grown
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paddy, Cotton"
                    value={applicantCrop}
                    onChange={(e) => setApplicantCrop(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-slate-900 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={applying}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-extrabold py-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 text-xs shadow-md"
                >
                  {applying ? (
                    <>
                      <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                      Submitting Application…
                    </>
                  ) : (
                    <>
                      <HandCoins className="h-3.5 w-3.5" />
                      Confirm &amp; Send Application
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowApplyForm(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Actions Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          {isOwnLoan ? (
            <p className="text-center text-xs text-slate-500 font-bold">
              Review applicant details and schedule a connection call to finalize the loan agreement.
            </p>
          ) : loadingCheck ? (
            <div className="flex justify-center py-2">
              <span className="animate-spin h-5 w-5 border-2 border-slate-400 border-t-transparent rounded-full" />
            </div>
          ) : alreadyApplied ? (
            <div className="flex items-center justify-center gap-2 py-1">
              <CheckCircle2 className={`h-5 w-5 ${isApproved ? "text-emerald-600" : isRejected ? "text-red-500" : "text-amber-500"}`} />
              <span
                className={`font-extrabold text-sm ${
                  isApproved ? "text-emerald-700" : isRejected ? "text-red-700" : "text-amber-700"
                }`}
              >
                {isApproved
                  ? "Approved — Connection call scheduled above"
                  : isRejected
                  ? "Application Declined"
                  : "Application Submitted — Awaiting Approval"}
              </span>
            </div>
          ) : !showApplyForm ? (
            <button
              onClick={() => {
                if (!currentUser) {
                  toast.error("Please log in to apply.");
                  return;
                }
                setShowApplyForm(true);
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-xl transition-colors shadow-[2px_2px_0px_rgba(15,23,42,1)] cursor-pointer flex items-center justify-center gap-2 text-sm active:translate-y-[1px]"
            >
              <HandCoins className="h-4 w-4" />
              Apply for this Loan
            </button>
          ) : null}
        </div>
      </div>

      {/* Schedule Call Modal on Accept */}
      {schedulingBooking && (
        <ScheduleCallModal
          booking={schedulingBooking}
          loan={loan}
          onClose={() => setSchedulingBooking(null)}
          onConfirm={handleScheduleConfirm}
          loading={actionLoading === schedulingBooking.id}
        />
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SchemesPage() {
  const supabase = createClient();
  const { user } = useUserData();

  // ── Tab state
  const [activeTab, setActiveTab] = useState<"govt" | "farmer">("govt");

  // ── Govt Loans state
  const [search, setSearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("recent");
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [visibleCount, setVisibleCount] = useState(9);

  // ── Farmer Loans state
  const [farmerLoans, setFarmerLoans] = useState<FarmerLoan[]>([]);
  const [farmerLoansLoading, setFarmerLoansLoading] = useState(true);
  const [farmerSearch, setFarmerSearch] = useState("");
  const [farmerSort, setFarmerSort] = useState<"recent" | "amount-high" | "amount-low" | "interest">("recent");
  const [selectedFarmerLoan, setSelectedFarmerLoan] = useState<FarmerLoan | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);

  // ── Farmer sub-tabs: "all" | "my-loans" | "received-requests" | "my-bookings"
  const [farmerSubTab, setFarmerSubTab] = useState<"all" | "my-loans" | "received-requests" | "my-bookings">("all");

  // Bookings made by the current user (borrower)
  const [myBookings, setMyBookings] = useState<EnrichedBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Bookings received by current user on their posted loans (lender)
  const [receivedBookings, setReceivedBookings] = useState<EnrichedBooking[]>([]);
  const [receivedLoading, setReceivedLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal for scheduling call on accept (main page)
  const [mainSchedulingBooking, setMainSchedulingBooking] = useState<EnrichedBooking | null>(null);

  // Sync with URL query params (e.g. from notification clicks)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkParams = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      const subParam = params.get("sub");
      if (tabParam === "farmer" || tabParam === "govt") {
        setActiveTab(tabParam);
      }
      if (
        subParam === "all" ||
        subParam === "my-loans" ||
        subParam === "received-requests" ||
        subParam === "my-bookings"
      ) {
        setFarmerSubTab(subParam as any);
      }
    };
    checkParams();
    window.addEventListener("popstate", checkParams);
    return () => window.removeEventListener("popstate", checkParams);
  }, []);

  useEffect(() => {
    setVisibleCount(9);
  }, [search, selectedTypes, selectedCrops, selectedProviders, showBookmarksOnly, sortBy]);

  useEffect(() => {
    async function loadData() {
      let cacheFound = false;
      try {
        const { data, error } = await supabase
          .from("cached_schemes")
          .select("*")
          .order("updated_at", { ascending: false });
        if (data && Array.isArray(data) && data.length > 0) {
          const mapped = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            provider: d.provider,
            type: d.type,
            publishDate: d.publish_date,
            eligibility: Array.isArray(d.eligibility) ? d.eligibility : [],
            crops: Array.isArray(d.crops) ? d.crops : [],
            interestRate: d.interest_rate,
            subsidyRate: d.subsidy_rate,
            benefitAmount: d.benefit_amount,
            description: d.description,
            details: d.details,
            documents: Array.isArray(d.documents) ? d.documents : [],
            applyLink: d.apply_link,
            color: d.color,
          }));
          setSchemes(mapped);
          setApiLoading(false);
          cacheFound = true;
        }
      } catch (dbErr) {
        console.warn("Could not load from Supabase cache:", dbErr);
      }

      if (!cacheFound) {
        try {
          setApiLoading(true);
          const res = await fetch("/api/schemes");
          if (!res.ok) throw new Error(`Server returned code ${res.status}`);
          const freshData = await res.json();
          if (freshData && Array.isArray(freshData) && freshData.length > 0) {
            setSchemes(freshData);
            setApiError(null);
            setIsUsingFallback(false);
            try {
              await supabase.from("cached_schemes").delete().neq("id", "dummy");
              const rowsToInsert = freshData.map((s: any) => ({
                id: s.id,
                title: s.title,
                provider: s.provider,
                type: s.type,
                publish_date: s.publishDate,
                eligibility: s.eligibility,
                crops: s.crops,
                interest_rate: s.interestRate || null,
                subsidy_rate: s.subsidyRate || null,
                benefit_amount: s.benefitAmount || null,
                description: s.description,
                details: s.details,
                documents: s.documents,
                apply_link: s.applyLink,
                color: s.color,
                updated_at: new Date().toISOString(),
              }));
              await supabase.from("cached_schemes").insert(rowsToInsert);
            } catch (cacheErr) {
              console.warn("Failed to update cache:", cacheErr);
            }
          } else if (freshData?.error) {
            throw new Error(freshData.error);
          } else {
            throw new Error("Invalid response format");
          }
        } catch (err: any) {
          console.error("Failed to load fresh schemes:", err);
          setApiError(err.message || "Failed to fetch live search data");
          toast.error("Failed to fetch fresh live search data.");
        } finally {
          setApiLoading(false);
        }
      }
    }
    loadData();
  }, [supabase]);

  useEffect(() => {
    const saved = localStorage.getItem("bookmarked_schemes");
    if (saved) {
      try {
        setBookmarks(JSON.parse(saved));
      } catch (e) {
        console.error("Error reading bookmarks", e);
      }
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Farmer loans data loading
  // ─────────────────────────────────────────────────────────────────────────────

  const fetchFarmerLoans = useCallback(async () => {
    setFarmerLoansLoading(true);
    try {
      const { data, error } = await supabase
        .from("farmer_loans")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setFarmerLoans((data as FarmerLoan[]) || []);
    } catch (err: any) {
      console.warn("farmer_loans fetch error:", err.message);
      setFarmerLoans([]);
    } finally {
      setFarmerLoansLoading(false);
    }
  }, [supabase]);

  const fetchMyBookings = useCallback(async () => {
    if (!user) return;
    setBookingsLoading(true);
    try {
      const { data: bookData, error: bookErr } = await supabase
        .from("loan_bookings")
        .select("*")
        .eq("borrower_id", user.id)
        .order("created_at", { ascending: false });
      if (bookErr) throw bookErr;

      if (bookData && bookData.length > 0) {
        const loanIds = Array.from(new Set(bookData.map((b: any) => b.loan_id)));
        const { data: loansData } = await supabase
          .from("farmer_loans")
          .select("*")
          .in("id", loanIds);
        const loansMap = new Map((loansData || []).map((l: any) => [l.id, l]));
        const enriched: EnrichedBooking[] = bookData.map((b: any) => {
          const parsed = parseBookingStatus(b.status);
          return {
            ...b,
            parsedStatus: parsed.status,
            callDate: parsed.callDate,
            callTime: parsed.callTime,
            callNote: parsed.callNote,
            scheduleText: parsed.scheduleText,
            loan: loansMap.get(b.loan_id) as FarmerLoan | undefined,
          };
        });
        setMyBookings(enriched);
      } else {
        setMyBookings([]);
      }
    } catch (err: any) {
      console.warn("loan_bookings fetch error:", err.message);
      setMyBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }, [supabase, user]);

  const fetchReceivedBookings = useCallback(async () => {
    if (!user) return;
    setReceivedLoading(true);
    try {
      const { data: bData, error: bErr } = await supabase
        .from("loan_bookings")
        .select("*")
        .eq("lender_id", user.id)
        .order("created_at", { ascending: false });
      if (bErr) throw bErr;

      if (bData && bData.length > 0) {
        const borrowerIds = Array.from(new Set(bData.map((b: any) => b.borrower_id)));

        const { data: borrowersData } = await supabase
          .from("users")
          .select("id, userName, userPhone, userEmail, avatar, village, district, state")
          .in("id", borrowerIds);
        const borrowerMap = new Map((borrowersData || []).map((u: any) => [u.id, u]));

        const { data: farmsData } = await supabase
          .from("farms")
          .select("user_id, area_size, intended_crop, soil_type, field_name")
          .in("user_id", borrowerIds);

        const farmsByUser = new Map<string, any[]>();
        (farmsData || []).forEach((f: any) => {
          const list = farmsByUser.get(f.user_id) || [];
          list.push(f);
          farmsByUser.set(f.user_id, list);
        });

        const loanIds = Array.from(new Set(bData.map((b: any) => b.loan_id)));
        const { data: loansData } = await supabase
          .from("farmer_loans")
          .select("*")
          .in("id", loanIds);
        const loansMap = new Map((loansData || []).map((l: any) => [l.id, l]));

        const enriched: EnrichedBooking[] = bData.map((b: any) => {
          const bUser = borrowerMap.get(b.borrower_id);
          const bFarms = farmsByUser.get(b.borrower_id) || [];
          const parsed = parseBookingStatus(b.status);
          return {
            ...b,
            parsedStatus: parsed.status,
            callDate: parsed.callDate,
            callTime: parsed.callTime,
            callNote: parsed.callNote,
            scheduleText: parsed.scheduleText,
            borrower: bUser ? formatBorrowerDetails(bUser, bFarms) : undefined,
            loan: loansMap.get(b.loan_id) as FarmerLoan | undefined,
          };
        });
        setReceivedBookings(enriched);
      } else {
        setReceivedBookings([]);
      }
    } catch (err: any) {
      console.warn("received bookings fetch error:", err.message);
      setReceivedBookings([]);
    } finally {
      setReceivedLoading(false);
    }
  }, [supabase, user]);

  const refreshAllFarmerData = useCallback(() => {
    fetchFarmerLoans();
    fetchMyBookings();
    fetchReceivedBookings();
  }, [fetchFarmerLoans, fetchMyBookings, fetchReceivedBookings]);

  useEffect(() => {
    if (activeTab === "farmer") {
      refreshAllFarmerData();
    }
  }, [activeTab, refreshAllFarmerData]);

  // Request browser notification permission once
  useEffect(() => {
    requestBrowserNotificationPermission();
  }, []);

  // Global Realtime notification listener for loan requests & status updates for current user
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user_loan_notifications_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "loan_bookings",
          filter: `lender_id=eq.${user.id}`,
        },
        async () => {
          sendInAppNotification(
            "New Loan Request Received! 🌾",
            "A farmer submitted an application for your loan. Review in Received Requests to schedule a call.",
            "🌾"
          );
          refreshAllFarmerData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "loan_bookings",
          filter: `borrower_id=eq.${user.id}`,
        },
        async (payload: any) => {
          const parsed = parseBookingStatus(payload.new?.status);
          if (parsed.status === "approved") {
            sendInAppNotification(
              "Loan Application Approved! 🎉",
              `Lender approved your application! Scheduled call: ${parsed.scheduleText || "Call scheduled"}. Lender contact unlocked!`,
              "🎉"
            );
          } else if (parsed.status === "rejected") {
            sendInAppNotification(
              "Loan Application Declined",
              "The lender was unable to accept your loan application at this time.",
              "❌"
            );
          } else {
            sendInAppNotification(
              "Loan Status Updated",
              "Your loan application was updated by the lender.",
              "ℹ️"
            );
          }
          refreshAllFarmerData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "loan_bookings",
          filter: `lender_id=eq.${user.id}`,
        },
        () => {
          refreshAllFarmerData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, refreshAllFarmerData]);

  // Handle Accept with Call Date & Time from Received Requests tab
  const handleMainScheduleConfirm = async (bookingId: string, callDate: string, callTime: string, note?: string) => {
    setActionLoading(bookingId);
    try {
      const fullStatus = `approved|||${callDate}|||${callTime}|||${note || ""}`;
      const { error } = await supabase
        .from("loan_bookings")
        .update({ status: fullStatus })
        .eq("id", bookingId);
      if (error) throw error;

      const parsed = parseBookingStatus(fullStatus);
      setReceivedBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? {
                ...b,
                status: fullStatus,
                parsedStatus: "approved",
                callDate: parsed.callDate,
                callTime: parsed.callTime,
                callNote: parsed.callNote,
                scheduleText: parsed.scheduleText,
              }
            : b
        )
      );

      // Notify borrower in messages table with full details
      const currentB = receivedBookings.find((a) => a.id === bookingId);
      const isReschedule = currentB?.parsedStatus === "approved";
      const loanAmount = currentB?.loan?.amount ? ` of ₹${currentB.loan.amount.toLocaleString("en-IN")}` : "";
      const lenderPhone = currentB?.loan?.farmer_phone || user?.userPhone || "";

      if (currentB && user) {
        try {
          await supabase.from("messages").insert([
            {
              sender_id: String(user.id),
              receiver_id: String(currentB.borrower_id),
              content: isReschedule
                ? `📅 Connection Call Rescheduled: ${user.userName || "Lender"} rescheduled your loan connection call to ${parsed.scheduleText || callDate + " at " + callTime}.${lenderPhone ? ` Lender Phone: ${lenderPhone}` : ""}${note ? `. Note: "${note}"` : ""}`
                : `🎉 Loan Application Approved! ${user.userName || "Lender"} accepted your loan request${loanAmount}. Connection call scheduled for ${parsed.scheduleText || callDate + " at " + callTime}.${lenderPhone ? ` Lender Phone: ${lenderPhone}` : ""}${note ? `. Note: "${note}"` : ""}`,
              type: "text",
            },
          ]);
        } catch (_) {}
      }

      setMainSchedulingBooking(null);
      toast.success(`Request accepted! Connection call scheduled for ${parsed.scheduleText || callDate} 🎉`);
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule call.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMainReject = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      const { error } = await supabase
        .from("loan_bookings")
        .update({ status: "rejected" })
        .eq("id", bookingId);
      if (error) throw error;
      setReceivedBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "rejected", parsedStatus: "rejected" } : b))
      );

      // Notify borrower in messages table
      const currentB = receivedBookings.find((a) => a.id === bookingId);
      if (currentB && user) {
        try {
          const loanInfo = currentB.loan?.amount ? ` for ₹${currentB.loan.amount.toLocaleString("en-IN")}` : "";
          await supabase.from("messages").insert([
            {
              sender_id: String(user.id),
              receiver_id: String(currentB.borrower_id),
              content: `❌ Loan Application Update: Your loan application${loanInfo} was declined by the lender.`,
              type: "text",
            },
          ]);
        } catch (_) {}
      }

      toast.success("Request rejected.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update booking status.");
    } finally {
      setActionLoading(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Govt handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleSyncFreshData = async () => {
    try {
      setApiLoading(true);
      setApiError(null);
      toast.loading("Syncing fresh search data from Google...", { id: "sync-toast" });
      const res = await fetch("/api/schemes");
      if (!res.ok) throw new Error(`Server returned code ${res.status}`);
      const freshData = await res.json();
      if (freshData && Array.isArray(freshData) && freshData.length > 0) {
        setSchemes(freshData);
        setIsUsingFallback(false);
        try {
          await supabase.from("cached_schemes").delete().neq("id", "dummy");
          const rowsToInsert = freshData.map((s: any) => ({
            id: s.id,
            title: s.title,
            provider: s.provider,
            type: s.type,
            publish_date: s.publishDate,
            eligibility: s.eligibility,
            crops: s.crops,
            interest_rate: s.interestRate || null,
            subsidy_rate: s.subsidyRate || null,
            benefit_amount: s.benefitAmount || null,
            description: s.description,
            details: s.details,
            documents: s.documents,
            apply_link: s.applyLink,
            color: s.color,
            updated_at: new Date().toISOString(),
          }));
          await supabase.from("cached_schemes").insert(rowsToInsert);
          toast.success("Data synced successfully!", { id: "sync-toast" });
        } catch (cacheErr) {
          toast.success("Loaded fresh data, but failed to save cache.", { id: "sync-toast" });
        }
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err: any) {
      console.error("Failed to sync fresh schemes:", err);
      setApiError(err.message || "Failed to sync live data");
      toast.error(err.message || "Sync failed", { id: "sync-toast" });
    } finally {
      setApiLoading(false);
    }
  };

  const handleToggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated: string[];
    if (bookmarks.includes(id)) {
      updated = bookmarks.filter((b) => b !== id);
      toast.success("Removed from saved list");
    } else {
      updated = [...bookmarks, id];
      toast.success("Saved to your list! 🎉");
    }
    setBookmarks(updated);
    localStorage.setItem("bookmarked_schemes", JSON.stringify(updated));
  };

  const handleToggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleToggleCrop = (crop: string) => {
    setSelectedCrops((prev) =>
      prev.includes(crop) ? prev.filter((c) => c !== crop) : [...prev, crop]
    );
  };

  const handleToggleProvider = (provider: string) => {
    setSelectedProviders((prev) =>
      prev.includes(provider) ? prev.filter((p) => p !== provider) : [...prev, provider]
    );
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedTypes([]);
    setSelectedCrops([]);
    setSelectedProviders([]);
    setShowBookmarksOnly(false);
    setSortBy("recent");
  };

  // Filtered Govt schemes
  const filteredSchemes = useMemo(() => {
    return schemes.filter((scheme) => {
      if (
        search &&
        !scheme.title.toLowerCase().includes(search.toLowerCase()) &&
        !scheme.provider.toLowerCase().includes(search.toLowerCase()) &&
        !scheme.description.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      if (selectedTypes.length > 0 && !selectedTypes.includes(scheme.type)) {
        return false;
      }
      if (
        selectedCrops.length > 0 &&
        !scheme.crops.some((c) => selectedCrops.includes(c))
      ) {
        return false;
      }
      if (
        selectedProviders.length > 0 &&
        !selectedProviders.includes(scheme.provider)
      ) {
        return false;
      }
      if (showBookmarksOnly && !bookmarks.includes(scheme.id)) {
        return false;
      }
      return true;
    });
  }, [schemes, search, selectedTypes, selectedCrops, selectedProviders, showBookmarksOnly, bookmarks]);

  // Filtered Farmer loans
  const myPostedLoans = useMemo(() => {
    if (!user) return [];
    return farmerLoans.filter((l) => String(l.farmer_id) === String(user.id));
  }, [farmerLoans, user]);

  const pendingReceivedCount = useMemo(() => {
    return receivedBookings.filter((b) => b.parsedStatus === "pending").length;
  }, [receivedBookings]);

  const filteredFarmerLoans = useMemo(() => {
    let base = farmerSubTab === "my-loans" ? myPostedLoans : farmerLoans;
    if (farmerSearch.trim()) {
      const q = farmerSearch.toLowerCase().trim();
      const amountQ = farmerSearch.replace(/[,₹s]/g, "");
      base = base.filter(
        (l) =>
          l.farmer_name?.toLowerCase().includes(q) ||
          l.description?.toLowerCase().includes(q) ||
          l.crop_type?.toLowerCase().includes(q) ||
          l.location?.toLowerCase().includes(q) ||
          l.duration?.toLowerCase().includes(q) ||
          l.conditions?.toLowerCase().includes(q) ||
          String(l.amount).includes(amountQ)
      );
    }
    return [...base].sort((a, b) => {
      if (farmerSort === "amount-high") return b.amount - a.amount;
      if (farmerSort === "amount-low") return a.amount - b.amount;
      if (farmerSort === "interest") return a.interest_rate - b.interest_rate;
      return 0;
    });
  }, [farmerLoans, myPostedLoans, farmerSearch, farmerSubTab, farmerSort]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 font-inter">
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-sora">
          Loans, Schemes &amp; Subsidies
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Explore government financial aid or connect with fellow farmers for peer-to-peer lending.
        </p>
      </div>

      {/* TAB NAV */}
      <div className="flex items-center gap-1 bg-slate-100 border-2 border-slate-900 rounded-2xl p-1 shadow-[3px_3px_0px_rgba(15,23,42,1)] w-full">
        <button
          onClick={() => setActiveTab("govt")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-extrabold text-sm transition-all cursor-pointer ${
            activeTab === "govt"
              ? "bg-slate-900 text-white shadow-[1px_1px_0px_rgba(255,255,255,0.1)]"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Government Loans
        </button>
        <button
          onClick={() => setActiveTab("farmer")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-extrabold text-sm transition-all cursor-pointer ${
            activeTab === "farmer"
              ? "bg-slate-900 text-white shadow-[1px_1px_0px_rgba(255,255,255,0.1)]"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users className="h-4 w-4" />
          Farmer Loans
          {farmerLoans.length > 0 && (
            <span
              className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                activeTab === "farmer" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
              }`}
            >
              {farmerLoans.length}
            </span>
          )}
          {pendingReceivedCount > 0 && (
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
              {pendingReceivedCount} new
            </span>
          )}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* GOVERNMENT LOANS TAB                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "govt" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-[96px] lg:self-start">
            {/* Assistance Card */}
            <div className="bg-[#0A0E1A] text-white rounded-3xl p-6 border-2 border-slate-900 shadow-[4px_4px_0px_rgba(15,23,42,1)] flex flex-col justify-between h-[260px] relative overflow-hidden">
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div>
                  <h2 className="text-xl font-black font-sora leading-tight tracking-wide">
                    Get the Best Schemes with Farmveda
                  </h2>
                  <p className="text-slate-400 text-xs mt-1.5 leading-relaxed font-semibold">
                    Unsure which subsidy applies to your crop? Talk to our local agriculture consultant.
                  </p>
                </div>
                <button
                  onClick={() => toast.success("Our advisor will reach out to you within 24 hours!")}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-md w-fit border border-blue-500"
                >
                  Request Support
                </button>
              </div>
              <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
                <Sprout className="h-44 w-44 text-emerald-400 rotate-12" />
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white border-2 border-slate-900 rounded-3xl shadow-[3px_3px_0px_rgba(15,23,42,1)] p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-800 text-base font-sora">Filters</h3>
                <button onClick={handleResetFilters} className="text-xs text-blue-600 hover:underline font-bold">
                  Clear All
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search schemes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="bookmarksOnly"
                  checked={showBookmarksOnly}
                  onChange={(e) => setShowBookmarksOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="bookmarksOnly" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  Saved Schemes Only
                </label>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Scheme Type</span>
                <div className="space-y-1.5">
                  {["Loan", "Subsidy", "Govt Scheme"].map((type) => (
                    <label key={type} className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(type)}
                        onChange={() => handleToggleType(type)}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      {type === "Govt Scheme" ? "Govt Schemes" : type === "Subsidy" ? "Subsidies" : "Loans"}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Crop Eligibility</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {["Paddy", "Wheat", "Cotton", "Sugarcane", "General"].map((crop) => (
                    <label key={crop} className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedCrops.includes(crop)}
                        onChange={() => handleToggleCrop(crop)}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      {crop}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Provider</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {["SBI", "NABARD", "Ministry of Agriculture", "RBI"].map((provider) => (
                    <label key={provider} className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedProviders.includes(provider)}
                        onChange={() => handleToggleProvider(provider)}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      {provider}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 border-2 border-slate-900 shadow-[2px_2px_0px_rgba(15,23,42,1)] rounded-2xl">
              <div>
                <span className="font-extrabold text-slate-800 text-base font-sora">
                  Showing {filteredSchemes.length} Results
                </span>
                <p className="text-slate-500 text-xs font-semibold">
                  Subsidized rates and assistance provided by Central &amp; State Governments
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  onClick={handleSyncFreshData}
                  disabled={apiLoading}
                  className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-sm active:translate-y-[1px]"
                >
                  <Sparkles className={`h-3.5 w-3.5 text-blue-600 ${apiLoading ? "animate-spin" : ""}`} />
                  <span>{apiLoading ? "Syncing..." : "Sync Fresh Data"}</span>
                </button>

                <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50">
                  <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-xs font-bold text-slate-700 outline-none cursor-pointer bg-transparent"
                  >
                    <option value="recent">Most Recent</option>
                    <option value="rate">Lowest Interest</option>
                    <option value="subsidy">Highest Subsidy</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Scheme Cards Grid */}
            {apiLoading && schemes.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-slate-100 rounded-3xl p-5 border-2 border-slate-200 h-[300px] animate-pulse" />
                ))}
              </div>
            ) : filteredSchemes.length > 0 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredSchemes.slice(0, visibleCount).map((scheme) => {
                    const isBookmarked = bookmarks.includes(scheme.id);
                    return (
                      <div
                        key={scheme.id}
                        onClick={() => setSelectedScheme(scheme)}
                        className={`${scheme.color} rounded-3xl p-5 border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] flex flex-col justify-between hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(15,23,42,1)] transition-all cursor-pointer min-h-[300px]`}
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="bg-slate-900 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              {scheme.type}
                            </span>
                            <button
                              onClick={(e) => handleToggleBookmark(scheme.id, e)}
                              className="text-slate-700 hover:text-slate-900 p-1 cursor-pointer"
                            >
                              <Bookmark className={`h-4.5 w-4.5 ${isBookmarked ? "fill-slate-900 text-slate-900" : "text-slate-400"}`} />
                            </button>
                          </div>

                          <h3 className="font-extrabold text-slate-900 text-base mt-2.5 leading-snug font-sora line-clamp-2">
                            {scheme.title}
                          </h3>
                          <p className="text-slate-500 text-[11px] font-bold mt-0.5 flex items-center gap-1">
                            <span>{scheme.provider}</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <Calendar className="h-3 w-3" />
                              {scheme.publishDate}
                            </span>
                          </p>

                          <p className="text-slate-600 text-xs mt-2 line-clamp-2 leading-relaxed font-semibold">
                            {scheme.description}
                          </p>
                        </div>

                        <div className="space-y-3 mt-4">
                          <div className="flex flex-wrap gap-1.5">
                            {scheme.interestRate && (
                              <span className="bg-white/80 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                {scheme.interestRate} Interest
                              </span>
                            )}
                            {scheme.subsidyRate && (
                              <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                {scheme.subsidyRate} Subsidy
                              </span>
                            )}
                            {scheme.crops.slice(0, 2).map((c) => (
                              <span key={c} className="bg-white/80 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                                {c}
                              </span>
                            ))}
                          </div>

                          <hr className="border-slate-900/10" />

                          <div className="flex justify-between items-center">
                            <span className="text-[11px] font-black text-slate-900">
                              {scheme.benefitAmount || "Check Eligibility"}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedScheme(scheme);
                              }}
                              className="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black px-4 py-1.5 rounded-lg border border-slate-900 transition-colors shadow-[1px_1px_0px_rgba(15,23,42,1)] cursor-pointer"
                            >
                              Details
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {visibleCount < filteredSchemes.length && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 9)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm py-3 px-8 rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(15,23,42,1)] transition-all cursor-pointer"
                    >
                      Load More
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] p-12 text-center rounded-3xl">
                <Award className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <h4 className="text-base font-extrabold text-slate-800">No Matching Schemes Found</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  No financial aids or subsidies match your active filter selections. Clear filters to explore all entries.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="mt-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2.5 px-6 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* FARMER LOANS TAB                                                     */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "farmer" && (
        <div className="space-y-5">
          {/* Sub-header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 border-2 border-slate-900 shadow-[2px_2px_0px_rgba(15,23,42,1)] rounded-2xl">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <HandCoins className="h-5 w-5 text-amber-500" />
                <span className="font-extrabold text-slate-800 text-base font-sora">
                  Farmer-to-Farmer Loans
                </span>
                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-black">
                  {farmerLoans.length} listings
                </span>
                {pendingReceivedCount > 0 && (
                  <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse flex items-center gap-1">
                    <Inbox className="h-3 w-3" />
                    {pendingReceivedCount} Requests Pending
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-xs font-semibold">
                Community lending — farmers helping farmers with quick, low-interest loans
              </p>
            </div>
            <button
              onClick={() => {
                if (!user) {
                  toast.error("Please log in to post a loan.");
                  return;
                }
                setShowPostModal(true);
              }}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm px-5 py-2.5 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_rgba(15,23,42,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1px_1px_0px_rgba(15,23,42,1)] transition-all cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" />
              Post a Loan
            </button>
          </div>

          {/* ── Toolbar: Tabs left │ Search + Sort right */}
          <div className="bg-white border-2 border-slate-900 shadow-[2px_2px_0px_rgba(15,23,42,1)] rounded-2xl overflow-hidden flex flex-col md:flex-row items-stretch">
            {/* Left: sub-tabs */}
            <div className="flex items-stretch overflow-x-auto">
              {(
                [
                  {
                    key: "all",
                    label: "All Loans",
                    count: farmerLoans.length,
                    activeBar: "bg-slate-900",
                    activeTxt: "text-slate-900",
                    activeBadge: "bg-slate-900 text-white",
                  },
                  {
                    key: "my-loans",
                    label: "My Posted Loans",
                    count: myPostedLoans.length,
                    activeBar: "bg-blue-600",
                    activeTxt: "text-blue-700",
                    activeBadge: "bg-blue-600 text-white",
                  },
                  {
                    key: "received-requests",
                    label: "Received Requests",
                    count: receivedBookings.length,
                    activeBar: "bg-amber-500",
                    activeTxt: "text-amber-700",
                    activeBadge: pendingReceivedCount > 0 ? "bg-amber-400 text-slate-950 font-black animate-pulse" : "bg-amber-500 text-white",
                  },
                  {
                    key: "my-bookings",
                    label: "My Applications",
                    count: myBookings.length,
                    activeBar: "bg-emerald-500",
                    activeTxt: "text-emerald-700",
                    activeBadge: "bg-emerald-500 text-white",
                  },
                ] as const
              ).map(({ key, label, count, activeBar, activeTxt, activeBadge }) => (
                <button
                  key={key}
                  onClick={() => setFarmerSubTab(key)}
                  className={`relative flex items-center gap-2 px-4 py-3.5 font-extrabold text-sm transition-all cursor-pointer whitespace-nowrap ${
                    farmerSubTab === key
                      ? `${activeTxt} bg-slate-50`
                      : "text-slate-400 hover:text-slate-700 hover:bg-slate-50/70"
                  }`}
                >
                  {farmerSubTab === key && (
                    <span className={`absolute bottom-0 left-0 right-0 h-0.5 ${activeBar} rounded-t`} />
                  )}
                  {label}
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded-full transition-colors ${
                      farmerSubTab === key ? activeBadge : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              ))}
            </div>

            {/* Right: Search + Sort */}
            {farmerSubTab !== "my-bookings" && farmerSubTab !== "received-requests" && (
              <div className="flex items-center gap-2 ml-auto px-4 py-2 md:py-0 border-t md:border-t-0 md:border-l-2 border-slate-100">
                <div className={`relative flex items-center transition-all duration-200 ${farmerSearch ? "w-60" : "w-52"}`}>
                  <input
                    type="text"
                    placeholder="Search for loans…"
                    value={farmerSearch}
                    onChange={(e) => setFarmerSearch(e.target.value)}
                    className="w-full pl-4 pr-9 py-2 rounded-full text-sm font-medium outline-none transition-all bg-slate-100 border border-slate-100 focus:border-slate-300 focus:bg-white focus:shadow-sm placeholder:text-slate-400 text-slate-700"
                  />
                  {farmerSearch ? (
                    <button
                      onClick={() => setFarmerSearch("")}
                      className="absolute right-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : (
                    <Search className="absolute right-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  )}
                </div>

                {farmerSearch && (
                  <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                    {filteredFarmerLoans.length}
                  </span>
                )}

                <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl px-3 py-1.5 border border-transparent hover:border-slate-300 transition-colors cursor-pointer">
                  <TrendingUp className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <select
                    value={farmerSort}
                    onChange={(e) => setFarmerSort(e.target.value as any)}
                    className="text-xs font-bold text-slate-700 outline-none cursor-pointer bg-transparent appearance-none"
                  >
                    <option value="recent">Newest</option>
                    <option value="amount-high">₹ High → Low</option>
                    <option value="amount-low">₹ Low → High</option>
                    <option value="interest">Low Interest</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* ── ALL LOANS TAB ── */}
          {farmerSubTab === "all" && (
            farmerLoansLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-slate-100/80 rounded-3xl p-5 border-2 border-slate-200 h-[260px] animate-pulse" />
                ))}
              </div>
            ) : filteredFarmerLoans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredFarmerLoans.map((loan, i) => {
                  const isOwn = user ? String(loan.farmer_id) === String(user.id) : false;
                  return (
                    <FarmerLoanCard
                      key={loan.id}
                      loan={loan}
                      index={i}
                      isOwn={isOwn}
                      onClick={() => setSelectedFarmerLoan(loan)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="bg-white border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] p-16 text-center rounded-3xl">
                <Users className="h-14 w-14 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-extrabold text-slate-800 font-sora">No Loans Available</h4>
                <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                  {farmerSearch ? "No loans match your search filter." : "Be the first farmer in your community to post a loan offer!"}
                </p>
                <button
                  onClick={() => {
                    if (farmerSearch) {
                      setFarmerSearch("");
                    } else {
                      if (!user) { toast.error("Please log in to post a loan."); return; }
                      setShowPostModal(true);
                    }
                  }}
                  className="mt-5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 px-7 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  {farmerSearch ? "Clear Search" : "Post a Loan"}
                </button>
              </div>
            )
          )}

          {/* ── MY POSTED LOANS ── */}
          {farmerSubTab === "my-loans" && (
            farmerLoansLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-slate-100/80 rounded-3xl p-5 border-2 border-slate-200 h-[260px] animate-pulse" />
                ))}
              </div>
            ) : filteredFarmerLoans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredFarmerLoans.map((loan, i) => {
                  const reqs = receivedBookings.filter((b) => b.loan_id === loan.id);
                  const pReqs = reqs.filter((b) => b.parsedStatus === "pending").length;
                  return (
                    <FarmerLoanCard
                      key={loan.id}
                      loan={loan}
                      index={i}
                      isOwn
                      pendingCount={pReqs}
                      totalRequests={reqs.length}
                      onClick={() => setSelectedFarmerLoan(loan)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="bg-white border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] p-16 text-center rounded-3xl">
                <User className="h-14 w-14 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-extrabold text-slate-800 font-sora">You haven&apos;t posted any loans</h4>
                <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                  Post a loan offer to help other farmers in your community.
                </p>
                <button
                  onClick={() => {
                    if (!user) { toast.error("Please log in to post a loan."); return; }
                    setShowPostModal(true);
                  }}
                  className="mt-5 flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 px-7 rounded-xl text-sm transition-colors cursor-pointer mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  Post a Loan
                </button>
              </div>
            )
          )}

          {/* ── RECEIVED REQUESTS (LENDER DASHBOARD WITH SCHEDULED CALL TIME & DATE) ── */}
          {farmerSubTab === "received-requests" && (
            receivedLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-slate-100/80 rounded-2xl p-5 border-2 border-slate-200 h-32 animate-pulse" />
                ))}
              </div>
            ) : receivedBookings.length > 0 ? (
              <div className="space-y-4">
                {receivedBookings.map((b) => (
                  <div
                    key={b.id}
                    className="bg-white border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] rounded-2xl p-5 flex flex-col gap-4 hover:translate-x-[0.5px] hover:translate-y-[0.5px] transition-all"
                  >
                    {/* Top Row: Borrower Header + Loan Tag + Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-900 font-black text-sm shrink-0 shadow">
                          {b.borrower?.avatar ? (
                            <img src={b.borrower.avatar} alt={b.borrower.userName} className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            getInitials(b.borrower?.userName || "Farmer")
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-extrabold text-slate-900 text-base font-sora truncate">
                              {b.borrower?.userName || "Farmer"}
                            </p>
                            <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                              Loan Applicant
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-semibold mt-0.5">
                            Ticket #{b.id.slice(0, 8).toUpperCase()} • Applied {timeAgo(b.created_at)}
                          </p>
                        </div>
                      </div>

                      {/* Status + Loan Amount */}
                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <span className="bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold px-3 py-1 rounded-xl">
                          ₹{Number(b.loan?.amount || 0).toLocaleString("en-IN")} ({b.loan?.duration || "N/A"})
                        </span>
                        <span
                          className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${
                            b.parsedStatus === "approved"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : b.parsedStatus === "rejected"
                              ? "bg-red-100 text-red-700 border border-red-300"
                              : "bg-amber-100 text-amber-800 border border-amber-300"
                          }`}
                        >
                          {b.parsedStatus}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Farmer Credentials (Name, Location, Land they have, Phone Number) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* 1. Location */}
                      <div className="bg-slate-50 border-2 border-slate-150 rounded-xl p-3 flex items-start gap-2.5">
                        <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg shrink-0 mt-0.5">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                            Location / Village
                          </span>
                          <span className="font-extrabold text-slate-900 text-xs block truncate mt-0.5">
                            {b.borrower?.location || "Location not set"}
                          </span>
                        </div>
                      </div>

                      {/* 2. Land They Have */}
                      <div className="bg-emerald-50/60 border-2 border-emerald-150 rounded-xl p-3 flex items-start gap-2.5">
                        <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                          <Sprout className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider block">
                            Land Owned / Farm
                          </span>
                          <span className="font-extrabold text-slate-900 text-xs block truncate mt-0.5">
                            {b.borrower?.landDisplay || "No registered land"}
                          </span>
                        </div>
                      </div>

                      {/* 3. Phone Number */}
                      <div className="bg-amber-50/60 border-2 border-amber-150 rounded-xl p-3 flex items-start gap-2.5">
                        <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg shrink-0 mt-0.5">
                          <Phone className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider block">
                            Contact Phone
                          </span>
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <span className="font-extrabold text-slate-900 text-xs font-mono">
                              {b.borrower?.userPhone || "Not provided"}
                            </span>
                            {b.borrower?.userPhone && (
                              <a
                                href={`tel:${b.borrower.userPhone}`}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black px-2.5 py-1 rounded-md cursor-pointer flex items-center gap-1 transition-colors shadow-sm"
                              >
                                <Phone className="h-2.5 w-2.5" /> Call
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Scheduled Call Info (if approved) */}
                    {b.parsedStatus === "approved" && (
                      <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
                            <CalendarClock className="h-5 w-5 text-emerald-700" />
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase text-emerald-700 block tracking-wider">
                              Scheduled Connection Call
                            </span>
                            <span className="font-extrabold text-slate-900 text-sm block">
                              {b.scheduleText || "Call Scheduled with Farmer"}
                            </span>
                            {b.callNote && (
                              <p className="text-[11px] text-emerald-800 italic mt-0.5 font-medium">
                                &quot;{b.callNote}&quot;
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {b.borrower?.userPhone && (
                            <a
                              href={`tel:${b.borrower.userPhone}`}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors shadow-sm"
                            >
                              <Phone className="h-3.5 w-3.5" /> Call Farmer
                            </a>
                          )}
                          <button
                            onClick={() => setMainSchedulingBooking(b)}
                            className="bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer transition-colors"
                          >
                            Reschedule
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Bottom Row: Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <p className="text-[11px] text-slate-400 font-semibold">
                        Listing: {b.loan?.crop_type || "General"} Crop Loan • {b.loan?.location || "India"}
                      </p>

                      <div className="flex items-center gap-2">
                        {b.parsedStatus === "pending" ? (
                          <>
                            <button
                              onClick={() => setMainSchedulingBooking(b)}
                              disabled={actionLoading === b.id}
                              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors shadow-sm"
                            >
                              <CalendarClock className="h-3.5 w-3.5" />
                              Accept &amp; Schedule Call
                            </button>
                            <button
                              onClick={() => handleMainReject(b.id)}
                              disabled={actionLoading === b.id}
                              className="bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 border border-red-200 text-xs font-black px-3.5 py-2 rounded-xl cursor-pointer flex items-center gap-1 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          </>
                        ) : b.parsedStatus === "approved" ? (
                          <span className="text-xs text-emerald-800 font-extrabold bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Approved — Call Scheduled
                          </span>
                        ) : (
                          <span className="text-xs text-red-600 font-extrabold bg-red-50 px-3.5 py-1.5 rounded-xl border border-red-200">
                            Rejected
                          </span>
                        )}

                        {b.loan && (
                          <button
                            onClick={() => setSelectedFarmerLoan(b.loan!)}
                            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-3.5 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                          >
                            View Loan <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] p-16 text-center rounded-3xl">
                <Inbox className="h-14 w-14 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-extrabold text-slate-800 font-sora">No Loan Requests Received</h4>
                <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                  When other farmers apply for your posted loans, their requests will appear here with full Name, Location, Land, and Contact details.
                </p>
                <button
                  onClick={() => setFarmerSubTab("all")}
                  className="mt-5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 px-7 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Explore Loans
                </button>
              </div>
            )
          )}

          {/* ── MY APPLICATIONS (BORROWER TICKETS WITH SCHEDULED CALL TIME & DATE) ── */}
          {farmerSubTab === "my-bookings" && (
            bookingsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-slate-100/80 rounded-2xl p-5 border-2 border-slate-200 h-24 animate-pulse" />
                ))}
              </div>
            ) : myBookings.length > 0 ? (
              <div className="space-y-4">
                {myBookings.map((booking) => {
                  const isAppApproved = booking.parsedStatus === "approved" || booking.status?.startsWith("approved");
                  return (
                    <div
                      key={booking.id}
                      className="bg-white border-2 border-slate-900 shadow-[2px_2px_0px_rgba(15,23,42,1)] rounded-2xl p-4 flex flex-col gap-3 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_rgba(15,23,42,1)] transition-all"
                    >
                      <div className="flex items-center gap-4">
                        {/* Lender avatar */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-900 font-black text-sm shrink-0 shadow">
                          {booking.loan?.farmer_avatar ? (
                            <img src={booking.loan.farmer_avatar} alt={booking.loan.farmer_name} className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            getInitials(booking.loan?.farmer_name || "FA")
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-extrabold text-slate-900 text-sm font-sora truncate">
                              {booking.loan?.farmer_name || "Lender Farmer"}
                            </p>
                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                                booking.parsedStatus === "pending"
                                  ? "bg-amber-100 text-amber-700 border border-amber-300"
                                  : isAppApproved
                                  ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                                  : "bg-red-100 text-red-600 border border-red-300"
                              }`}
                            >
                              {isAppApproved ? "Approved" : booking.parsedStatus}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-semibold flex-wrap">
                            {booking.loan && (
                              <>
                                <span className="flex items-center gap-1 font-bold text-slate-800">
                                  <IndianRupee className="h-3 w-3" />
                                  {Number(booking.loan.amount).toLocaleString("en-IN")}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Timer className="h-3 w-3" />
                                  {booking.loan.duration}
                                </span>
                                {booking.loan.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {booking.loan.location}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold mt-1">
                            Ticket #{booking.id.slice(0, 8).toUpperCase()} • Applied {timeAgo(booking.created_at)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 shrink-0">
                          {booking.loan && (
                            <button
                              onClick={() => setSelectedFarmerLoan(booking.loan!)}
                              className="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                            >
                              View <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {!isAppApproved && (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center justify-center gap-1">
                              <Lock className="h-3 w-3" /> Hidden
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Scheduled Call Info for Borrower if Approved */}
                      {isAppApproved && (
                        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0">
                              <CalendarClock className="h-4 w-4 text-emerald-700" />
                            </div>
                            <div>
                              <span className="text-[9px] font-black uppercase text-emerald-700 block font-bold">
                                Scheduled Call with Lender
                              </span>
                              <span className="font-extrabold text-slate-900 text-xs block">
                                {booking.scheduleText || "Approved by Lender"}
                              </span>
                              {booking.callNote && (
                                <p className="text-[11px] text-emerald-800 italic mt-0.5 font-medium">
                                  &quot;{booking.callNote}&quot;
                                </p>
                              )}
                            </div>
                          </div>
                          {booking.loan?.farmer_phone && (
                            <a
                              href={`tel:${booking.loan.farmer_phone}`}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-sm shrink-0"
                            >
                              <Phone className="h-3.5 w-3.5" /> Call Lender Now
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] p-16 text-center rounded-3xl">
                <Ticket className="h-14 w-14 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-extrabold text-slate-800 font-sora">No Applications Yet</h4>
                <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                  Browse All Loans and click Apply to get a booking ticket and connect with lenders.
                </p>
                <button
                  onClick={() => setFarmerSubTab("all")}
                  className="mt-5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 px-7 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Browse All Loans
                </button>
              </div>
            )
          )}

          {/* Info banner */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-800 font-extrabold text-sm">Community Lending Note</p>
              <p className="text-amber-700 text-xs mt-0.5 leading-relaxed font-semibold">
                Farmveda connects farmers. We do not mediate or guarantee loans. When the lender accepts your request, a call date and time is scheduled so you can coordinate directly. Always verify identity and written terms before transferring money.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── GOVT SCHEME DETAIL MODAL ────────────────────────────────────────── */}
      {selectedScheme && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border-2 border-slate-900 shadow-[6px_6px_0px_rgba(15,23,42,1)] rounded-3xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-5 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-blue-400" />
                <div>
                  <h3 className="text-base font-extrabold font-sora leading-tight">{selectedScheme.title}</h3>
                  <p className="text-slate-400 text-[10px] font-semibold">
                    {selectedScheme.provider} • Published {selectedScheme.publishDate}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedScheme(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm text-slate-700 font-semibold leading-relaxed">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Scheme Type</p>
                  <p className="text-base font-black text-slate-900 font-sora">{selectedScheme.type}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-black uppercase text-blue-500 tracking-wider mb-1">Financial Aid</p>
                  <p className="text-base font-black text-slate-900 font-sora">
                    {selectedScheme.interestRate || selectedScheme.subsidyRate || selectedScheme.benefitAmount || "Govt Aid"}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Overview</h4>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3 border border-slate-100">
                  {selectedScheme.details}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Who is Eligible?</h4>
                <ul className="space-y-1.5 text-xs text-slate-600 pl-1">
                  {selectedScheme.eligibility.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Eligible Crops</h4>
                <div className="grid grid-cols-2 gap-2">
                  {selectedScheme.crops.map((item) => (
                    <div key={item} className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-2">
                      <Sprout className="h-4 w-4 text-blue-600 shrink-0" />
                      <span className="truncate">{item === "General" ? "Any Crop Eligible" : `${item} Cultivation`}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Documents Needed</h4>
                <ul className="space-y-1.5 text-xs text-slate-600 pl-1">
                  {selectedScheme.documents.map((doc) => (
                    <li key={doc} className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold shrink-0 mt-0.5">•</span>
                      <span>{doc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-4 border-t border-slate-150 bg-slate-50/50 flex gap-3 shrink-0">
              <button
                onClick={(e) => {
                  handleToggleBookmark(selectedScheme.id, e);
                }}
                className="py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-extrabold text-sm text-slate-700 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Bookmark className={`h-4.5 w-4.5 ${bookmarks.includes(selectedScheme.id) ? "fill-slate-900 text-slate-900" : "text-slate-400"}`} />
                <span>{bookmarks.includes(selectedScheme.id) ? "Saved" : "Save Scheme"}</span>
              </button>
              <a
                href={selectedScheme.applyLink}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl transition-all cursor-pointer shadow-md text-center flex items-center justify-center gap-1.5 border border-blue-600"
              >
                <span>Apply Online</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── FARMER LOAN DETAIL MODAL ────────────────────────────────────────── */}
      {selectedFarmerLoan && (
        <FarmerLoanDetailModal
          loan={selectedFarmerLoan}
          onClose={() => setSelectedFarmerLoan(null)}
          currentUser={user}
          onUpdated={refreshAllFarmerData}
        />
      )}

      {/* ── POST LOAN MODAL ─────────────────────────────────────────────────── */}
      {showPostModal && (
        <PostLoanModal
          onClose={() => setShowPostModal(false)}
          onPosted={fetchFarmerLoans}
          user={user}
        />
      )}

      {/* ── SCHEDULE CALL MODAL (FOR MAIN PAGE RECEIVED REQUESTS) ───────────── */}
      {mainSchedulingBooking && (
        <ScheduleCallModal
          booking={mainSchedulingBooking}
          loan={mainSchedulingBooking.loan}
          onClose={() => setMainSchedulingBooking(null)}
          onConfirm={handleMainScheduleConfirm}
          loading={actionLoading === mainSchedulingBooking.id}
        />
      )}
    </div>
  );
}
