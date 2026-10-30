/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LuSearch,
  LuHistory,
  LuFilter,
  LuScreenShare,
  LuLoader,
} from "react-icons/lu";
import { Star, Stethoscope, ChevronRight } from "lucide-react";
import SingleCard from "@/app/(main)/_components/Mentor-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { DBMentor } from "@/lib/types/allTypes";
import { useLanguage, DynamicText } from "@/context/LanguageProvider";

const SPECIALIZATIONS = [
  "All",
  "Plant Pathology",
  "Pest Management",
  "Soil Health",
  "Horticulture",
  "Organic Farming",
  "Agronomy",
];

const HEADER_BG_COLORS = [
  "bg-blue-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-yellow-500",
  "bg-blue-600",
  "bg-emerald-500",
  "bg-teal-600",
];

function getHeaderColor(id: string, index: number) {
  if (id && id.length > 2) {
    const sum = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return HEADER_BG_COLORS[sum % HEADER_BG_COLORS.length];
  }
  return HEADER_BG_COLORS[index % HEADER_BG_COLORS.length];
}

export default function DoctorConnectPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useLanguage();

  const [doctors, setDoctors] = useState<DBMentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpec, setSelectedSpec] = useState("All");
  const [availableOnly, setAvailableOnly] = useState(false);

  // Fetch only real crop doctors directly from Supabase mentors table
  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("mentors")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading doctors from mentors table:", error);
        setDoctors([]);
      } else if (data) {
        setDoctors(data as DBMentor[]);
      } else {
        setDoctors([]);
      }
    } catch (err) {
      console.error("Failed to load crop doctors:", err);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();

    // Realtime listener for new doctor onboarding from Supabase
    const channel = supabase
      .channel("public:mentors_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mentors" },
        () => {
          fetchDoctors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filtered doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      if (availableOnly && doc.availability === false) {
        return false;
      }

      if (selectedSpec !== "All") {
        const hasSpec = doc.expertise?.some((exp) =>
          exp.toLowerCase().includes(selectedSpec.toLowerCase())
        );
        if (!hasSpec) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = doc.full_name?.toLowerCase().includes(q);
        const matchPosition = doc.current_position?.toLowerCase().includes(q);
        const matchBio = doc.bio?.toLowerCase().includes(q);
        const matchExpertise = doc.expertise?.some((exp) =>
          exp.toLowerCase().includes(q)
        );
        if (!matchName && !matchPosition && !matchBio && !matchExpertise) {
          return false;
        }
      }

      return true;
    });
  }, [doctors, searchQuery, selectedSpec, availableOnly]);

  const exactMatchesCount = useMemo(() => {
    if (selectedSpec === "All" && !searchQuery) return Math.min(4, filteredDoctors.length);
    return filteredDoctors.length;
  }, [selectedSpec, searchQuery, filteredDoctors]);

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8 select-none">
      {/* ──── TOP CARD: Manage All Your Bookings Here (element3 + static7) ──── */}
      <SingleCard />

      <div className="max-w-[1260px] mx-auto">
        {/* ──── CATEGORY HEADER: Discover More By Category (No Software Engineer) ──── */}
        <div className="flex items-center justify-center gap-3 my-7">
          <h2 className="text-2xl sm:text-3xl font-semibold font-sora text-slate-900 tracking-tight text-center">
            <DynamicText text="Discover More By Category" />
          </h2>
          <div className="flex items-center gap-2 font-inter text-sm font-semibold bg-white py-2 px-3.5 shadow-sm border border-gray-200 rounded-lg text-slate-800">
            <Image
              src="/briefcase-medical.png"
              alt="Crop Doctor"
              width={18}
              height={18}
              className="object-contain"
            />
            <span>{selectedSpec === "All" ? "Crop Specialist" : selectedSpec}</span>
          </div>
        </div>

        {/* ──── Category Quick Filter Pills ──── */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
          {SPECIALIZATIONS.map((spec) => {
            const isSelected = selectedSpec === spec;
            return (
              <button
                key={spec}
                type="button"
                onClick={() => setSelectedSpec(spec)}
                className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium font-inter transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-700 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                <DynamicText text={spec} />
              </button>
            );
          })}
        </div>

        {/* ──── STATS & CONTROLS BAR (Matches Screenshot 2) ──── */}
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 px-2 py-3 mb-6 bg-transparent">
          {/* Left stats */}
          <div className="flex items-center gap-6">
            <p className="font-inter text-sm text-slate-800">
              <span className="font-bold">{filteredDoctors.length}</span>{" "}
              <DynamicText text="Mentors Fetched" />
            </p>

            <p className="font-inter text-sm tracking-tight text-amber-500 font-medium">
              <span className="font-bold">{exactMatchesCount}</span>{" "}
              <DynamicText text="Exact Matches Found" />
            </p>
          </div>

          {/* Right actions: Search, Available toggle, My Bookings, Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            {/* Search Bar */}
            <div className="flex items-center w-full sm:w-[260px] bg-white border border-gray-200 rounded-lg px-3 py-1 shadow-xs">
              <LuSearch className="text-gray-400 text-base shrink-0 mr-2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search mentors"
                className="bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm p-0 h-8"
              />
            </div>

            {/* Available Toggle Switch */}
            <div className="flex items-center gap-2.5 font-inter text-sm py-1.5 px-3 bg-white border border-gray-200 shadow-xs rounded-md">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
              <span className="text-xs font-medium text-slate-700">Available</span>
            </div>

            {/* My Bookings */}
            <Button
              variant="outline"
              onClick={() => router.push("/home/doctor-connect/bookings")}
              className="bg-white border-gray-200 font-inter text-sm shadow-xs cursor-pointer flex items-center gap-2 text-slate-700 hover:bg-gray-50 h-9"
            >
              <LuHistory className="w-4 h-4" />
              <DynamicText text="My Bookings" />
            </Button>

            {/* Filters */}
            <Button
              variant="outline"
              className="bg-white border-gray-200 font-inter text-sm shadow-xs cursor-pointer flex items-center gap-2 text-slate-700 hover:bg-gray-50 h-9"
              onClick={() => {
                // cycle through categories on click
                const nextIdx = (SPECIALIZATIONS.indexOf(selectedSpec) + 1) % SPECIALIZATIONS.length;
                setSelectedSpec(SPECIALIZATIONS[nextIdx]);
              }}
            >
              <LuFilter className="w-4 h-4" />
              <DynamicText text="Filters" />
            </Button>
          </div>
        </div>

        {/* ──── DOCTOR CARDS GRID (Matches Screenshot 2 Exactly) ──── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <LuLoader className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-slate-600 font-inter text-sm">
              <DynamicText text="Loading crop specialists..." />
            </p>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center max-w-md mx-auto my-8">
            <Stethoscope className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold font-sora text-slate-800">
              <DynamicText text="No Crop Doctors Found" />
            </h3>
            <p className="text-sm text-slate-500 font-inter mt-1 mb-4">
              <DynamicText text="Try clearing your search or specialization filter." />
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setSelectedSpec("All");
                setAvailableOnly(false);
              }}
              className="text-xs font-inter"
            >
              <DynamicText text="Clear Filters" />
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 max-w-[1180px] mx-auto mt-6 mb-16 px-2">
            {filteredDoctors.map((doc, idx) => {
              const headerColor = getHeaderColor(doc.id, idx);
              const avatarSrc =
                doc.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  doc.full_name || "Doctor"
                )}&background=059669&color=fff&size=200`;

              return (
                <div
                  key={doc.id}
                  className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 rounded-xl h-[310px] w-full max-w-[340px] mx-auto relative flex flex-col group"
                >
                  {/* Recommended Badge on top border */}
                  <div className="bg-white border border-yellow-500 shadow-xs px-3.5 py-0.5 absolute -top-3 left-1/2 -translate-x-1/2 rounded-full z-30">
                    <h3 className="text-xs font-semibold text-slate-800 tracking-tight font-inter">
                      Recommended
                    </h3>
                  </div>

                  {/* Header Band with color and folded corners */}
                  <div className={`h-16 ${headerColor} w-full relative rounded-t-xl overflow-hidden`}>
                    {/* Top right folded corner accent */}
                    <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
                      <div className="w-full h-full bg-white/25 rounded-tr-xl rotate-45 transform origin-top-right"></div>
                    </div>
                    {/* Top left folded corner accent */}
                    <div className="absolute top-0 left-0 w-16 h-16 pointer-events-none">
                      <div className="w-full h-full bg-white/30 rounded-tr-xl rotate-6 transform origin-top-right"></div>
                    </div>
                  </div>

                  {/* Avatar (overlapping the header band) */}
                  <img
                    src={avatarSrc}
                    alt={doc.full_name || "Doctor"}
                    className="rounded-full border-2 border-white absolute top-5 left-5 z-20 object-cover w-[72px] h-[72px] shadow-sm bg-white"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/user.png";
                    }}
                  />

                  {/* Star Rating Badge (on right side of header) */}
                  <div className="absolute py-1 px-2.5 text-xs font-semibold font-inter rounded-full bg-white border border-gray-100 top-10 right-4 shadow-xs flex items-center gap-1 z-20 text-slate-800">
                    <Star
                      className="fill-yellow-400 text-yellow-400 shrink-0"
                      size={14}
                    />
                    <span>{doc.rating ? Number(doc.rating).toFixed(1) : "4.9"}</span>
                  </div>

                  {/* Card Body */}
                  <div className="px-5 pt-8 pb-4 flex flex-col flex-1">
                    {/* Doctor Name */}
                    <h3 className="font-inter text-base font-bold text-slate-900 tracking-tight capitalize line-clamp-1">
                      {doc.full_name?.startsWith("Dr.")
                        ? doc.full_name
                        : `Dr. ${doc.full_name}`}
                    </h3>

                    {/* Position / Title (Agricultural, NOT Software Engineer) */}
                    <h4 className="font-inter text-sm text-slate-500 capitalize line-clamp-1 mt-0.5">
                      {doc.current_position || "Crop Health Specialist"}
                    </h4>

                    {/* Expertise */}
                    <div className="text-xs font-inter mt-3 text-center text-slate-600 line-clamp-2 px-1">
                      <span className="font-bold text-slate-800">Expertise: </span>
                      <span>
                        {doc.expertise && doc.expertise.length > 0
                          ? doc.expertise.join(" , ")
                          : "plant health , fungal disease , crop advisory"}
                      </span>
                    </div>

                    {/* Perfect Match */}
                    <p className="text-center mt-2 capitalize font-bold text-yellow-500 font-sora text-xs">
                      Perfect Match
                    </p>

                    {/* Footer Button: Connect */}
                    <div className="mt-auto pt-3">
                      <Button
                        variant="outline"
                        className="w-full font-inter text-sm font-semibold border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-800 flex items-center justify-center gap-2 cursor-pointer h-9 rounded-lg"
                        onClick={() => router.push(`/home/doctor-connect/${doc.id}`)}
                      >
                        <span>Connect</span>
                        <LuScreenShare className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
