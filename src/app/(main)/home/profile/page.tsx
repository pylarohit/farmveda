/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Globe,
  Check,
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Save,
  Loader2,
  Calendar,
  LogOut,
  Sprout,
  Leaf,
  Stethoscope,
  Video,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ArrowRight,
  ChevronRight,
  Plus,
  RefreshCw,
  Activity,
  Layers,
  Settings,
} from "lucide-react";
import { useLanguage, SUPPORTED_LANGUAGES, LangCode, DynamicText } from "@/context/LanguageProvider";
import { useUserData } from "@/context/UserDataProvider";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { DoctorBookingService, DoctorBookingSession } from "@/lib/doctorBooking";

const STATE_OPTIONS = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Other",
];

export default function ProfilePage() {
  const { lang, setLang, t, langMeta } = useLanguage();
  const { user, ensureUserInDB } = useUserData();
  const router = useRouter();
  const supabase = createClient();

  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      router.push("/auth");
    } catch (err: any) {
      console.error("Error signing out:", err);
      toast.error("Failed to sign out");
    } finally {
      setLoggingOut(false);
    }
  };
  const [formData, setFormData] = useState({
    userName: "",
    userPhone: "",
    userAge: "",
    state: "",
    district: "",
    village: "",
  });

  // Farms and Crops
  const [farms, setFarms] = useState<any[]>([]);
  const [loadingFarms, setLoadingFarms] = useState(true);

  // Doctor Meetings
  const [sessions, setSessions] = useState<DoctorBookingSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // Disease Scans History
  const [diseaseScans, setDiseaseScans] = useState<any[]>([]);
  const [loadingScans, setLoadingScans] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<string>("crops");

  // Sync form data with current user
  useEffect(() => {
    if (user) {
      setFormData({
        userName: user.userName || "",
        userPhone: user.userPhone || "",
        userAge: (user as any).userAge ? String((user as any).userAge) : "",
        state: (user as any).state || "",
        district: (user as any).district || "",
        village: (user as any).village || "",
      });
    }
  }, [user]);

  // Fetch Farms / Crops
  const fetchFarms = async () => {
    if (!user) return;
    setLoadingFarms(true);
    try {
      const { data, error } = await supabase
        .from("farms")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setFarms(data);
      }
    } catch (err) {
      console.error("Error fetching farmer crops:", err);
    } finally {
      setLoadingFarms(false);
    }
  };

  // Fetch Doctor Meetings / Consultations
  const fetchMeetings = async () => {
    setLoadingSessions(true);
    try {
      const data = await DoctorBookingService.getSessionsForUser(
        user?.id ? String(user.id) : undefined
      );
      setSessions(data);
    } catch (err) {
      console.error("Error loading doctor consultations:", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  // Fetch Crop Health & Disease Scans
  const fetchScans = async () => {
    setLoadingScans(true);
    try {
      // 1. First check Supabase disease_scans
      const { data, error } = await supabase
        .from("disease_scans")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data && data.length > 0) {
        setDiseaseScans(
          data.map((item: any) => ({
            id: item.id,
            diseaseName: item.disease_name,
            imageUrl: item.image_data,
            timestamp: new Date(item.created_at).toLocaleDateString(),
            result: item.result_json,
          }))
        );
      } else {
        // Fallback to local storage history
        const stored = localStorage.getItem("crop_disease_history");
        if (stored) {
          setDiseaseScans(JSON.parse(stored));
        }
      }
    } catch (err) {
      console.warn("Could not load disease scans:", err);
    } finally {
      setLoadingScans(false);
    }
  };

  useEffect(() => {
    fetchFarms();
    fetchMeetings();
    fetchScans();
  }, [user?.id]);

  useEffect(() => {
    const unsub = DoctorBookingService.subscribeToUpdates(() => {
      fetchMeetings();
    });
    return () => unsub();
  }, []);

  const handleLanguageChange = async (newCode: LangCode) => {
    setLang(newCode);
    const selected = SUPPORTED_LANGUAGES.find((l) => l.code === newCode);
    toast.success(
      t("profile", "languageChanged", {
        lang: `${selected?.nativeName || newCode}`,
      })
    );

    // Persist to user metadata
    try {
      await supabase.auth.updateUser({
        data: { preferred_language: newCode },
      });
    } catch (err) {
      console.warn("Could not save preferred language to auth metadata:", err);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const updates: any = {
        userName: formData.userName.trim(),
        userPhone: formData.userPhone.trim(),
        userAge: formData.userAge ? Number(formData.userAge) : null,
        state: formData.state,
        district: formData.district.trim(),
        village: formData.village.trim() || null,
      };

      const { error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", user.id);

      if (error) throw error;

      toast.success(t("profile", "savedSuccess"));
      await ensureUserInDB();
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-7 pb-16 animate-in fade-in duration-500 font-sans">
      {/* ── Page Header & Farmer Hero ── */}
      <div className="relative rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-6 md:p-8 text-white shadow-xl overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-1/4 -bottom-16 w-48 h-48 bg-emerald-400/20 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 flex-1">
            <div className="relative">
              <Image
                src={user?.avatar || "/user.png"}
                alt="Farmer Avatar"
                width={100}
                height={100}
                className="rounded-full border-4 border-white/20 shadow-lg object-cover bg-white/10"
              />
              <div className="absolute -bottom-1 -right-1 bg-emerald-400 text-slate-900 rounded-full p-1.5 shadow-md border-2 border-white">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>

            <div className="flex-1 text-center md:text-left space-y-2">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-sora">
                {user?.userName || "Farmer"}
              </h1>

            <p className="text-emerald-100 text-sm flex flex-wrap items-center justify-center md:justify-start gap-4">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 opacity-80" />
                {user?.userEmail || "No email"}
              </span>
              {user?.userPhone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 opacity-80" />
                  {user.userPhone}
                </span>
              )}
              {((user as any)?.district || (user as any)?.state) && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 opacity-80" />
                  {[(user as any)?.village, (user as any)?.district, (user as any)?.state]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              )}
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-emerald-200">
              <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-emerald-300" />
                <span>
                  {t("profile", "currentLanguage")}:{" "}
                  <strong className="text-white font-semibold">
                    {langMeta.flag} {langMeta.nativeName} ({langMeta.name})
                  </strong>
                </span>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-emerald-300" />
                <span>
                  {t("profile", "memberSince")}:{" "}
                  <strong className="text-white font-semibold">
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : "2024"}
                  </strong>
                </span>
              </div>
            </div>
          </div>
          </div>

          {/* Logout Action */}
          <div className="shrink-0 self-center md:self-start">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={loggingOut}
                  className="bg-white/10 hover:bg-red-600 hover:text-white border-white/20 text-white rounded-xl px-4 py-2 text-xs font-bold backdrop-blur-sm transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:border-red-500"
                >
                  {loggingOut ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  <span>Log Out</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-lg font-bold text-slate-900">
                    Log out of Farmveda?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-sm text-slate-600">
                    Are you sure you want to log out? You will need to sign back in with your mobile number or email.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleSignOut}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl"
                  >
                    Yes, Log Out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* ── Key Metrics Overview ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Crops / Farms */}
        <div
          onClick={() => setActiveTab("crops")}
          className="bg-white border border-slate-200/80 hover:border-emerald-400 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3.5"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold font-inter">Registered Crops</p>
            <h3 className="text-2xl font-black text-slate-900 font-sora mt-0.5">{farms.length}</h3>
          </div>
        </div>

        {/* Doctor Meetings */}
        <div
          onClick={() => setActiveTab("meetings")}
          className="bg-white border border-slate-200/80 hover:border-blue-400 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3.5"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold font-inter">Doctor Meetings</p>
            <h3 className="text-2xl font-black text-slate-900 font-sora mt-0.5">{sessions.length}</h3>
          </div>
        </div>

        {/* Disease Scans */}
        <div
          onClick={() => setActiveTab("scans")}
          className="bg-white border border-slate-200/80 hover:border-teal-400 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3.5"
        >
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold font-inter">Health Scans</p>
            <h3 className="text-2xl font-black text-slate-900 font-sora mt-0.5">{diseaseScans.length}</h3>
          </div>
        </div>
      </div>

      {/* ── Main Tabbed Sections ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full bg-slate-100 p-1.5 rounded-2xl font-inter h-auto gap-1">
          <TabsTrigger
            value="crops"
            className="rounded-xl py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm cursor-pointer"
          >
            <Sprout className="w-4 h-4 text-emerald-600" />
            <span>My Crops & Farms</span>
            <span className="text-[11px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
              {farms.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="meetings"
            className="rounded-xl py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm cursor-pointer"
          >
            <Stethoscope className="w-4 h-4 text-blue-600" />
            <span>Meeting History</span>
            <span className="text-[11px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full font-bold">
              {sessions.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="scans"
            className="rounded-xl py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm cursor-pointer"
          >
            <Activity className="w-4 h-4 text-teal-600" />
            <span>Disease Scans</span>
            <span className="text-[11px] bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded-full font-bold">
              {diseaseScans.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="rounded-xl py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-600" />
            <span>Edit Profile</span>
          </TabsTrigger>
        </TabsList>

        {/* ──────────── TAB 1: MY CROPS & FARMS ──────────── */}
        <TabsContent value="crops" className="mt-6 space-y-6 animate-in fade-in-50 duration-300">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold font-sora text-slate-900 flex items-center gap-2">
                <Leaf className="w-5 h-5 text-emerald-600" />
                <span>My Registered Crops & Farm Plots</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Details of crops and agricultural fields you have registered on Farmveda
              </p>
            </div>
            <Link
              href="/home"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Farm Plot</span>
            </Link>
          </div>

          {loadingFarms ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
              <p className="text-xs font-semibold">Loading your registered crops...</p>
            </div>
          ) : farms.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <Sprout className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-sora">No Crops Registered Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6">
                Add your field details and intended crop to receive customized AI roadmaps, soil nutrition advisory, and automated pest defense plans.
              </p>
              <Link
                href="/home"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-sm inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Register Your First Crop
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {farms.map((farm, idx) => {
                const parts = (farm.field_name || "My Farm").split("|||");
                const farmTitle = parts[0] || "Farm Plot";
                const farmLocation = parts[1] || "Field Location";
                const cropName = farm.intended_crop || "Agricultural Crop";
                const insights = farm.ai_insights || {};

                return (
                  <div
                    key={farm.id || idx}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-400 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                          <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{cropName}</span>
                        </span>
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          {farm.area_size ? `${farm.area_size} Acres` : "Area N/A"}
                        </span>
                      </div>

                      {/* Farm Name & Location */}
                      <h3 className="font-bold text-lg text-slate-900 font-sora group-hover:text-emerald-700 transition-colors">
                        {farmTitle}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 line-clamp-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span>{farmLocation}</span>
                      </p>

                      {/* Crop Details Specs */}
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="font-medium text-slate-500">Soil Classification:</span>
                          <span className="font-bold text-slate-800">{farm.soil_type || "Standard Agricultural"}</span>
                        </div>
                        {farm.weather_conditions && (
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="font-medium text-slate-500">Weather Profile:</span>
                            <span className="font-bold text-slate-800">{farm.weather_conditions}</span>
                          </div>
                        )}
                        {insights.expected_yield && (
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="font-medium text-slate-500">Expected Yield:</span>
                            <span className="font-bold text-emerald-700">{insights.expected_yield}</span>
                          </div>
                        )}
                        {insights.growth_duration && (
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="font-medium text-slate-500">Growth Duration:</span>
                            <span className="font-bold text-slate-800">{insights.growth_duration}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* View Farm Action */}
                    <div className="mt-5 pt-3 border-t border-slate-100">
                      <Link
                        href={`/farm/${farm.id}`}
                        className="w-full bg-slate-50 hover:bg-emerald-600 hover:text-white text-slate-800 font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all border border-slate-200 hover:border-emerald-600 cursor-pointer"
                      >
                        <span>Open Farm Dashboard</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ──────────── TAB 2: DOCTOR MEETINGS & CONSULTATION HISTORY ──────────── */}
        <TabsContent value="meetings" className="mt-6 space-y-6 animate-in fade-in-50 duration-300">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold font-sora text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-600" />
                <span>Doctor Consultation & Meeting History</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Past and upcoming 1-on-1 video consultations with verified agricultural doctors
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/home/doctor-connect/bookings"
                className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1"
              >
                <span>Manage All Bookings</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/home/doctor-connect"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-2 rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Book Doctor</span>
              </Link>
            </div>
          </div>

          {loadingSessions ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <p className="text-xs font-semibold">Loading your consultation history...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Stethoscope className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-sora">No Consultations Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6">
                Whenever you book a session with a plant pathologist or agronomist, your meeting history and video call links will appear here.
              </p>
              <Link
                href="/home/doctor-connect"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-sm inline-flex items-center gap-2"
              >
                <Stethoscope className="w-4 h-4" /> Consult a Crop Doctor
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sessions.map((session) => {
                const docName = session.mentorName?.startsWith("Dr.")
                  ? session.mentorName
                  : `Dr. ${session.mentorName || "Crop Specialist"}`;

                return (
                  <div
                    key={session.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-blue-400 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Doctor Info Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={session.mentorAvatar || "/user.png"}
                            alt={session.mentorName || "Doctor"}
                            className="w-12 h-12 rounded-full object-cover border border-slate-200 bg-white shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/user.png";
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-slate-900 text-sm truncate font-sora">
                              {docName}
                            </h4>
                            <p className="text-xs text-blue-700 font-semibold truncate">
                              {session.topic || "Crop Consultation"}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 uppercase tracking-wide ${
                            session.status === "accepted"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : session.status === "pending"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : session.status === "completed"
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : "bg-red-100 text-red-800 border border-red-200"
                          }`}
                        >
                          {session.status === "accepted"
                            ? "Confirmed"
                            : session.status === "pending"
                            ? "Pending"
                            : session.status === "completed"
                            ? "Completed"
                            : "Rejected"}
                        </span>
                      </div>

                      {/* Scheduled Time */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1 mb-3">
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="text-slate-500 font-medium">Scheduled:</span>
                          <span className="font-bold text-slate-900">
                            {session.session_date} at {session.session_time || "10:00"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500 text-[11px]">
                          <span>Requested:</span>
                          <span>
                            {session.requested_at
                              ? new Date(session.requested_at).toLocaleDateString()
                              : "Recently"}
                          </span>
                        </div>
                      </div>

                      {/* Attached Crop Leaf Photo preview if available */}
                      {session.crop_image_url && (
                        <div className="mb-3 p-2 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center gap-2.5">
                          <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-emerald-300 shrink-0 bg-white shadow-2xs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={session.crop_image_url}
                              alt="Crop Scan"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                              Leaf Scan Attached
                            </span>
                            <a
                              href={session.crop_image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-emerald-700 hover:underline font-semibold"
                            >
                              Inspect Photo ↗
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Notes / Reason preview */}
                      {session.notes && (
                        <div className="text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-slate-500 font-semibold block mb-0.5">Problem Notes:</span>
                          <p className="line-clamp-2 leading-relaxed">{session.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      {session.status === "accepted" ? (
                        <button
                          type="button"
                          onClick={() => {
                            const roomTarget = session.call_url || `room-${session.id}`;
                            router.push(`/room/${roomTarget}`);
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Video className="w-4 h-4" />
                          <span>Join Video Consultation</span>
                        </button>
                      ) : (
                        <div className="text-center text-[11px] text-slate-400 font-medium py-1">
                          {session.status === "pending"
                            ? "Awaiting doctor's approval"
                            : session.status === "completed"
                            ? "Consultation successfully concluded"
                            : "Booking request declined"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ──────────── TAB 3: CROP HEALTH & DISEASE SCANS ──────────── */}
        <TabsContent value="scans" className="mt-6 space-y-6 animate-in fade-in-50 duration-300">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold font-sora text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-600" />
                <span>Crop Health & Disease Diagnostic Scans</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                History of leaf scans analyzed by Farmveda AI agricultural pathology model
              </p>
            </div>
            {farms.length > 0 && (
              <Link
                href={`/farm/${farms[0].id}/disease`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 px-3.5 py-2 rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Leaf Scan</span>
              </Link>
            )}
          </div>

          {loadingScans ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-2" />
              <p className="text-xs font-semibold">Loading leaf diagnosis history...</p>
            </div>
          ) : diseaseScans.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
                <Activity className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-sora">No Disease Scans Performed Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6">
                Take a quick photo of an infected leaf in your field to identify pathogens, fungal blights, and receive organic and chemical remedies.
              </p>
              {farms.length > 0 ? (
                <Link
                  href={`/farm/${farms[0].id}/disease`}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-sm inline-flex items-center gap-2"
                >
                  <Activity className="w-4 h-4" /> Run AI Leaf Health Scan
                </Link>
              ) : (
                <Link
                  href="/home"
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-sm inline-flex items-center gap-2"
                >
                  <Sprout className="w-4 h-4" /> Add Farm First
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {diseaseScans.map((scan) => {
                const isHealthy = scan.diseaseName?.toLowerCase().includes("healthy");
                return (
                  <div
                    key={scan.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-teal-400 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Leaf Scan Photo */}
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 mb-3 border border-slate-200 shadow-2xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={scan.imageUrl || "/user.png"}
                          alt={scan.diseaseName}
                          className="w-full h-full object-cover"
                        />
                        <span
                          className={`absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${
                            isHealthy
                              ? "bg-emerald-600 text-white"
                              : "bg-rose-600 text-white"
                          }`}
                        >
                          {isHealthy ? "Healthy Foliage" : "Pathogen Detected"}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-base font-sora line-clamp-1">
                        {scan.diseaseName}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Scanned on: {scan.timestamp}
                      </p>

                      {scan.result?.severity && (
                        <div className="mt-2 flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="text-slate-500 font-medium">Severity:</span>
                          <span className="font-bold text-amber-700">{scan.result.severity}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <Link
                        href="/home/doctor-connect"
                        className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                      >
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>Consult Doctor</span>
                      </Link>
                      {farms.length > 0 && (
                        <Link
                          href={`/farm/${farms[0].id}/disease`}
                          className="text-xs font-bold text-slate-500 hover:text-slate-800"
                        >
                          Scan Again →
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ──────────── TAB 4: PERSONAL DETAILS & SETTINGS ──────────── */}
        <TabsContent value="settings" className="mt-6 space-y-6 animate-in fade-in-50 duration-300">
          {/* Language Preferences Card */}
          <Card className="border-emerald-100 shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-gradient-to-r from-emerald-50/60 to-white border-b border-emerald-100/60 pb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg md:text-xl font-bold text-slate-900 font-sora">
                      {t("profile", "languagePreferences")}
                    </CardTitle>
                    <CardDescription className="text-slate-500 text-sm">
                      {t("profile", "languagePreferencesDesc")}
                    </CardDescription>
                  </div>
                </div>

                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 font-medium hidden sm:flex items-center gap-1.5">
                  <span>{langMeta.flag}</span>
                  <span>{langMeta.nativeName}</span>
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {SUPPORTED_LANGUAGES.map((l) => {
                  const isSelected = lang === l.code;
                  return (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => handleLanguageChange(l.code as LangCode)}
                      className={cn(
                        "flex flex-col items-start justify-between p-3.5 rounded-2xl border transition-all text-left cursor-pointer group relative overflow-hidden",
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/25 ring-2 ring-emerald-500/30"
                          : "bg-white text-slate-800 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 hover:shadow-sm"
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <span className="text-2xl leading-none">{l.flag}</span>
                        {isSelected ? (
                          <span className="h-5 w-5 rounded-full bg-white text-emerald-700 flex items-center justify-center shadow-sm">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-emerald-600">
                            {l.code}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-base font-bold leading-tight truncate">
                          {l.nativeName}
                        </p>
                        <p
                          className={cn(
                            "text-xs mt-0.5 leading-tight truncate",
                            isSelected ? "text-emerald-100" : "text-slate-400"
                          )}
                        >
                          {l.name}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Edit Farmer Details Form */}
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Details Card */}
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">
                        {t("profile", "personalDetails")}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        {t("profile", "personalDetailsDesc")}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="userName" className="text-xs font-semibold text-slate-700">
                      {t("onboarding", "fullName")}
                    </Label>
                    <Input
                      id="userName"
                      value={formData.userName}
                      onChange={(e) =>
                        setFormData({ ...formData, userName: e.target.value })
                      }
                      placeholder={t("onboarding", "fullNamePlaceholder")}
                      className="h-11 bg-slate-50/50"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="userAge" className="text-xs font-semibold text-slate-700">
                        {t("onboarding", "age")}
                      </Label>
                      <Input
                        id="userAge"
                        type="number"
                        min={10}
                        max={100}
                        value={formData.userAge}
                        onChange={(e) =>
                          setFormData({ ...formData, userAge: e.target.value })
                        }
                        placeholder={t("onboarding", "agePlaceholder")}
                        className="h-11 bg-slate-50/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="userPhone" className="text-xs font-semibold text-slate-700">
                        {t("onboarding", "mobileNumber")}
                      </Label>
                      <Input
                        id="userPhone"
                        type="tel"
                        maxLength={10}
                        value={formData.userPhone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            userPhone: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        placeholder={t("onboarding", "phonePlaceholder")}
                        className="h-11 bg-slate-50/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="userEmail" className="text-xs font-semibold text-slate-700">
                      {t("onboarding", "emailAddress")}
                    </Label>
                    <Input
                      id="userEmail"
                      type="email"
                      value={user?.userEmail || ""}
                      disabled
                      className="h-11 bg-slate-100 text-slate-500 cursor-not-allowed"
                    />
                    <p className="text-[11px] text-slate-400">
                      {t("onboarding", "emailPrefilled")}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Location Details Card */}
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">
                        {t("profile", "locationDetails")}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        {t("profile", "locationDetailsDesc")}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      {t("onboarding", "state")}
                    </Label>
                    <Select
                      value={formData.state}
                      onValueChange={(v) => setFormData({ ...formData, state: v })}
                    >
                      <SelectTrigger className="h-11 w-full bg-slate-50/50">
                        <SelectValue placeholder={t("onboarding", "statePlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {STATE_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="district" className="text-xs font-semibold text-slate-700">
                      {t("onboarding", "district")}
                    </Label>
                    <Input
                      id="district"
                      value={formData.district}
                      onChange={(e) =>
                        setFormData({ ...formData, district: e.target.value })
                      }
                      placeholder={t("onboarding", "districtPlaceholder")}
                      className="h-11 bg-slate-50/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="village" className="text-xs font-semibold text-slate-700">
                      {t("onboarding", "villageOptional")}
                    </Label>
                    <Input
                      id="village"
                      value={formData.village}
                      onChange={(e) =>
                        setFormData({ ...formData, village: e.target.value })
                      }
                      placeholder={t("onboarding", "villagePlaceholder")}
                      className="h-11 bg-slate-50/50"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loggingOut}
                    className="h-12 px-6 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log Out</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-lg font-bold text-slate-900">
                      Log out of Farmveda?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm text-slate-600">
                      Are you sure you want to log out? You will need to sign back in with your mobile number or email.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleSignOut}
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl"
                    >
                      Yes, Log Out
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                type="submit"
                disabled={saving}
                className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md cursor-pointer disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("profile", "saving")}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t("profile", "saveChanges")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
