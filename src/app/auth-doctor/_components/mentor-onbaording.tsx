/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { LuChevronRight, LuCheck, LuSparkles, LuSearch } from "react-icons/lu";
import { Stethoscope, CheckCircle2, User, Phone, Mail, Award, BookOpen, Camera, Upload, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUserData } from "@/context/UserDataProvider";
import { useRouter } from "next/navigation";
import { LucideLoader2 } from "lucide-react";
import { DoctorAuthService } from "@/lib/doctorAuth";
import { toast } from "react-hot-toast";

export type MentorOnboardingData = {
  fullName: string;
  phone: string;
  email?: string;
  avatar?: string;
  bio: string;
  occupation: string;
  expertise: string[];
};

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300";

const OCCUPATIONS = [
  "Senior Plant Pathologist",
  "Agricultural University Professor",
  "ICAR Senior Research Scientist",
  "Krishi Vigyan Kendra (KVK) Specialist",
  "Chief Agronomist & Crop Consultant",
  "Entomologist & Pest Defense Specialist",
  "Soil Health & Nutrient Consultant",
  "Horticulture & Orchard Specialist",
  "Organic Farming & Bio-Input Advisor",
  "Crop Protection & Spray Protocol Officer",
  "Seed Treatment & Plant Breeder",
  "Agricultural Extension Specialist",
] as const;

const EXPERTISE_OPTIONS = [
  "Plant Pathology & Disease Diagnosis",
  "Pest & Insect Defense",
  "Soil Nutrient & Fertilizer Management",
  "Fungicide & Pesticide Dosage",
  "Organic Farming & Bio-fertilizers",
  "Horticulture & Fruit Crops",
  "Paddy, Wheat & Cereal Crop Health",
  "Cotton & Cash Crop Pest Management",
  "Seed Treatment & Germination Care",
  "Weed Management & Herbicide Application",
  "Greenhouse & Protected Cultivation",
  "Irrigation & Drought Stress Mitigation",
] as const;

const MIN_EXPERTISE = 1;
const MAX_EXPERTISE = 4;

export function MentorOnboarding({
  className,
  initial,
  onFinished,
}: {
  className?: string;
  initial?: Partial<MentorOnboardingData>;
  onFinished?: () => void;
}) {
  const [step, setStep] = React.useState(1);
  const total = 3;
  const supabase = createClient();
  const { mentor, setMentor } = useUserData();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);

  const [data, setData] = React.useState<MentorOnboardingData>({
    fullName: initial?.fullName ?? mentor?.full_name ?? "",
    phone: initial?.phone ?? mentor?.phone ?? "",
    email: initial?.email ?? mentor?.email ?? "",
    avatar: initial?.avatar ?? mentor?.avatar ?? "",
    bio: initial?.bio ?? mentor?.bio ?? "",
    occupation: initial?.occupation ?? mentor?.current_position ?? OCCUPATIONS[0],
    expertise: (initial?.expertise && initial.expertise.length > 0)
      ? initial.expertise
      : (mentor?.expertise && mentor.expertise.length > 0)
      ? mentor.expertise
      : [],
  });

  const [expertiseSearch, setExpertiseSearch] = React.useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size should be less than 5MB.");
      return;
    }

    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setData((prev) => ({ ...prev, avatar: base64 }));
      setUploadingPhoto(false);
      toast.success("Profile photo uploaded successfully!");
    };
    reader.onerror = () => {
      toast.error("Failed to read image file.");
      setUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  // Auto populate from supabase user if available
  React.useEffect(() => {
    async function loadCurrentUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setData((prev) => ({
            ...prev,
            fullName: prev.fullName || user.user_metadata?.full_name || user.user_metadata?.name || "",
            email: prev.email || user.email || "",
            avatar: prev.avatar || user.user_metadata?.avatar_url || user.user_metadata?.picture || "",
          }));
        }
      } catch (e) {
        console.error("Error reading auth user in onboarding:", e);
      }
    }
    loadCurrentUser();
  }, [supabase]);

  const update = <K extends keyof MentorOnboardingData>(
    key: K,
    value: MentorOnboardingData[K]
  ) => {
    setData((d) => ({ ...d, [key]: value }));
  };

  const toggleExpertise = (value: string) => {
    setData((d) => {
      const alreadySelected = d.expertise.includes(value);
      if (alreadySelected) {
        return { ...d, expertise: d.expertise.filter((v) => v !== value) };
      } else {
        if (d.expertise.length >= MAX_EXPERTISE) {
          toast.error(`You can select up to ${MAX_EXPERTISE} areas of expertise.`);
          return d;
        }
        return { ...d, expertise: [...d.expertise, value] };
      }
    });
  };

  const stepValid = React.useMemo(() => {
    if (step === 1) {
      return data.fullName.trim().length >= 2 && data.phone.trim().length >= 7;
    }
    if (step === 2) {
      return data.occupation.trim().length > 0;
    }
    if (step === 3) {
      return (
        data.expertise.length >= MIN_EXPERTISE &&
        data.expertise.length <= MAX_EXPERTISE
      );
    }
    return false;
  }, [step, data]);

  const next = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!stepValid) return;
    setStep((s) => Math.min(total, s + 1));
  };

  const back = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setStep((s) => Math.max(1, s - 1));
  };

  const handleComplete = React.useCallback(
    async (payload: MentorOnboardingData) => {
      setLoading(true);
      setError(null);

      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const doctorId = currentUser?.id || mentor?.id || `doc-${Date.now()}`;
        const doctorEmail = payload.email || currentUser?.email || "doctor@farmveda.in";
        const cleanName = payload.fullName.trim().startsWith("Dr.")
          ? payload.fullName.trim()
          : `Dr. ${payload.fullName.trim()}`;

        const normalizedData = {
          id: doctorId,
          full_name: cleanName,
          email: doctorEmail,
          phone: payload.phone || null,
          avatar: payload.avatar || DEFAULT_AVATAR,
          bio: payload.bio || "Certified Crop Protection Specialist & Agronomist.",
          current_position: payload.occupation,
          expertise: payload.expertise,
          availability: true,
          rating: 4.9,
          is_verified: true,
        };

        console.log("Upserting crop doctor into mentors table:", normalizedData);

        // 1. Upsert into Supabase mentors table
        const { data: savedMentor, error: updateError } = await supabase
          .from("mentors")
          .upsert(normalizedData, { onConflict: "id" })
          .select()
          .maybeSingle();

        if (updateError) {
          console.warn("Mentors table warning:", updateError.message);
          // If table row exists with another primary constraint, try update by id or email
          await supabase
            .from("mentors")
            .update(normalizedData)
            .eq("email", doctorEmail);
        }

        // 2. Register with DoctorAuthService for synchronous session & registry
        await DoctorAuthService.register({
          name: cleanName,
          qualification: payload.occupation,
          specialization: "plant_pathologist",
          institute: "National Agricultural Research & KVK Network",
          email: doctorEmail,
          phone: payload.phone,
        });

        // 3. Update application state
        if (setMentor) {
          setMentor(savedMentor || (normalizedData as any));
        }

        localStorage.setItem("isOnboardingDoneMentor", "true");
        toast.success(`Welcome aboard, ${cleanName}! Your profile is live.`);

        if (onFinished) {
          onFinished();
        } else {
          router.push("/dashboard");
        }
      } catch (err: any) {
        console.error("Onboarding error:", err);
        setError(err.message || "Failed to complete onboarding");
        toast.error(err.message || "Failed to save profile");
      } finally {
        setLoading(false);
      }
    },
    [mentor?.id, router, setMentor, supabase, onFinished]
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepValid) return;
    handleComplete(data);
  };

  const progress = (step / total) * 100;

  const filteredExpertise = EXPERTISE_OPTIONS.filter((opt) =>
    opt.toLowerCase().includes(expertiseSearch.toLowerCase())
  );

  return (
    <div
      className={cn(
        "w-full max-w-[620px] rounded-3xl border border-emerald-100 bg-white p-6 sm:p-8 shadow-2xl",
        "flex flex-col gap-6 text-slate-800",
        className
      )}
      aria-labelledby="mentor-onboarding-title"
    >
      {/* Header with progress */}
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#2A6049] text-white flex items-center justify-center text-sm shadow-xs">
              <Stethoscope className="w-4 h-4 text-[#DCE775]" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#2A6049]">
              Farmveda Clinic • Crop Doctor Onboarding
            </span>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
            Step {step} of {total}
          </span>
        </div>

        <h1
          id="mentor-onboarding-title"
          className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight"
        >
          {step === 1 && "Personal & Professional Information"}
          {step === 2 && "Current Position & Agricultural Affiliation"}
          {step === 3 && "Core Crop & Pathology Expertise"}
        </h1>

        <p className="text-xs text-slate-500 font-sans -mt-1">
          {step === 1 && "Complete your doctor identity so farmers can consult with you confidently."}
          {step === 2 && "Select your current designation and research or field background."}
          {step === 3 && "Choose the domains where you can assist farmers with diagnoses & prescriptions."}
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-1">
          <div
            className="h-full bg-[#2A6049] transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {error && (
        <div className="p-3 text-xs text-red-600 bg-red-50 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {/* ──────────────── STEP 1: Basic Info & Avatar ──────────────── */}
      {step === 1 && (
        <section aria-label="Basic details" className="flex flex-col gap-4">
          {/* Photo Upload Section */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Profile Photo / Doctor Picture
            </Label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            {data.avatar ? (
              <div className="flex items-center gap-4 p-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/40">
                <div className="relative shrink-0 w-20 h-20 rounded-full overflow-hidden border-2 border-[#2A6049] shadow-sm bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={data.avatar}
                    alt="Doctor preview"
                    className="w-full h-full object-cover"
                  />
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <LucideLoader2 className="w-5 h-5 animate-spin text-white" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1 flex-1">
                  <span className="text-xs font-bold text-slate-800">
                    Photo Uploaded Successfully
                  </span>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    This photo will be displayed on your verified crop specialist profile.
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold text-[#2A6049] hover:text-[#1F4937] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Upload className="w-3.5 h-3.5" /> Change Photo
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => update("avatar", "")}
                      className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-emerald-200 hover:border-[#2A6049] bg-emerald-50/20 hover:bg-emerald-50/40 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#2A6049] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-800 group-hover:text-[#2A6049]">
                  Click to Upload Doctor Photo
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  PNG, JPG, or WebP (max 5MB)
                </span>
              </div>
            )}
          </div>

          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fullName" className="text-xs font-bold text-slate-700">
              Full Name with Title
            </Label>
            <div className="relative flex items-center">
              <User className="absolute left-3.5 w-4 h-4 text-slate-400" />
              <Input
                id="fullName"
                placeholder="e.g. Dr. Ramesh Patel"
                value={data.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                className="pl-10 h-11 rounded-xl border-slate-200 focus:border-[#2A6049] text-sm"
                required
              />
            </div>
          </div>

          {/* Phone Number */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone" className="text-xs font-bold text-slate-700">
              Consultation Contact Number
            </Label>
            <div className="relative flex items-center">
              <Phone className="absolute left-3.5 w-4 h-4 text-slate-400" />
              <Input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={data.phone}
                onChange={(e) => update("phone", e.target.value)}
                className="pl-10 h-11 rounded-xl border-slate-200 focus:border-[#2A6049] text-sm"
                required
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-xs font-bold text-slate-700">
              Official Email
            </Label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 w-4 h-4 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="doctor@farmveda.in"
                value={data.email || ""}
                onChange={(e) => update("email", e.target.value)}
                className="pl-10 h-11 rounded-xl border-slate-200 focus:border-[#2A6049] text-sm"
              />
            </div>
          </div>

          {/* Short Bio */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bio" className="text-xs font-bold text-slate-700">
              Doctor Bio / Clinical Summary
            </Label>
            <Textarea
              id="bio"
              placeholder="e.g. Senior Agricultural Scientist specializing in crop protection, fungal disease diagnosis, and integrated pest management with over 10 years experience."
              value={data.bio}
              onChange={(e) => update("bio", e.target.value)}
              rows={3}
              className="resize-none rounded-xl border-slate-200 focus:border-[#2A6049] text-sm"
            />
          </div>
        </section>
      )}

      {/* ──────────────── STEP 2: Current Occupation / Position ──────────────── */}
      {step === 2 && (
        <section aria-label="Current occupation" className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#2A6049]" /> Current Designation / Professional Role
            </Label>
            <Select
              value={data.occupation}
              onValueChange={(val) => update("occupation", val)}
            >
              <SelectTrigger className="w-full h-12 rounded-xl border-slate-200 text-sm">
                <SelectValue placeholder="Select current position" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {OCCUPATIONS.map((role) => (
                  <SelectItem key={role} value={role} className="text-sm cursor-pointer py-2.5">
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">
              This title will be showcased on your public consultation card and diagnosis reports.
            </p>
          </div>
        </section>
      )}

      {/* ──────────────── STEP 3: Expertise Areas ──────────────── */}
      {step === 3 && (
        <section aria-label="Areas of expertise" className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#2A6049]" /> Specialization Fields
              </Label>
              <span className="text-xs font-bold text-[#2A6049]">
                {data.expertise.length} / {MAX_EXPERTISE} selected
              </span>
            </div>

            {/* Search filter for fast discovery */}
            <div className="relative flex items-center my-1">
              <LuSearch className="absolute left-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search crop specializations..."
                value={expertiseSearch}
                onChange={(e) => setExpertiseSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                  }
                }}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#2A6049]"
              />
            </div>

            {/* Grid of expertise badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[260px] overflow-y-auto p-1 scrollbar-thin">
              {filteredExpertise.map((opt) => {
                const selected = data.expertise.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleExpertise(opt);
                    }}
                    className={cn(
                      "text-left p-2.5 rounded-xl text-xs font-medium border transition-all flex items-center justify-between gap-2 cursor-pointer",
                      selected
                        ? "bg-[#2A6049] text-white border-[#2A6049] shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-300"
                    )}
                  >
                    <span>{opt}</span>
                    {selected ? (
                      <LuCheck className="w-4 h-4 text-[#DCE775] shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-500 mt-2">
              Select between {MIN_EXPERTISE} and {MAX_EXPERTISE} specializations. Farmers filter doctors by these categories.
            </p>
          </div>
        </section>
      )}

      {/* ──────────────── FOOTER NAVIGATION ──────────────── */}
      <footer className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          type="button"
          onClick={back}
          className="cursor-pointer rounded-full px-5 h-11 border-slate-200"
          disabled={step === 1 || loading}
        >
          Back
        </Button>

        {step < total ? (
          <Button
            key={`next-btn-${step}`}
            type="button"
            onClick={next}
            disabled={!stepValid || loading}
            className="cursor-pointer rounded-full px-6 h-11 bg-[#2A6049] hover:bg-[#1F4937] text-white"
          >
            Next Step <LuChevronRight className="ml-1" />
          </Button>
        ) : (
          <Button
            key="complete-btn-final"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (step === total && stepValid && !loading) {
                handleComplete(data);
              }
            }}
            disabled={!stepValid || loading}
            className="cursor-pointer rounded-full px-7 h-11 bg-[#2A6049] hover:bg-[#1F4937] text-white font-semibold shadow-md active:scale-98 disabled:opacity-50"
          >
            {loading ? (
              <>
                <LucideLoader2 className="mr-2 animate-spin w-4 h-4" />
                Saving Profile...
              </>
            ) : (
              <>
                <LuSparkles className="mr-1.5 w-4 h-4 text-[#DCE775]" />
                Complete & Enter Dashboard
              </>
            )}
          </Button>
        )}
      </footer>
    </div>
  );
}

export default MentorOnboarding;
