/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useUserData } from "@/context/UserDataProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-hot-toast";
import {
  Stethoscope,
  CheckCircle2,
  Upload,
  User,
  Phone,
  Mail,
  Briefcase,
  Sparkles,
  ShieldCheck,
  Plus,
  X,
} from "lucide-react";

const SUGGESTED_EXPERTISE = [
  "Plant Pathology",
  "Pest Management",
  "Soil Health",
  "Horticulture",
  "Organic Farming",
  "Agronomy",
  "Fungal Blight",
  "Irrigation Advisory",
  "Crop Nutrition",
];

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1594824813583-14902b37be80?w=300&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=300&auto=format&fit=crop&q=80",
];

export default function DoctorOnboardingModal() {
  const supabase = createClient();
  const { mentor, setMentor, loading: userLoading } = useUserData();

  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [currentPosition, setCurrentPosition] = useState("");
  const [expertise, setExpertise] = useState<string[]>([]);
  const [customExpInput, setCustomExpInput] = useState("");
  const [avatar, setAvatar] = useState(AVATAR_PRESETS[0]);
  const [bio, setBio] = useState("");

  // Check if onboarding is needed
  useEffect(() => {
    async function checkOnboardingStatus() {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;
      if (!authUser) return;

      const userRole = authUser.user_metadata?.role;
      // If user is a doctor or mentor
      if (userRole === "doctor" || userRole === "mentor" || !userRole) {
        // Pre-fill email and name from auth
        if (!email) {
          setEmail(authUser.email || mentor?.email || "");
        }
        if (!fullName) {
          const authName =
            authUser.user_metadata?.full_name ||
            authUser.user_metadata?.name ||
            mentor?.full_name ||
            "";
          setFullName(authName.startsWith("Dr.") ? authName : authName ? `Dr. ${authName}` : "Dr. ");
        }
        if (mentor?.phone) setPhone(mentor.phone);
        if (mentor?.current_position) setCurrentPosition(mentor.current_position);
        if (mentor?.expertise && mentor.expertise.length > 0) setExpertise(mentor.expertise);
        if (mentor?.avatar) setAvatar(mentor.avatar);
        if (mentor?.bio) setBio(mentor.bio);

        const doneKey = `doctor_onboarded_${authUser.id}`;
        const hasCompletedFlag = localStorage.getItem(doneKey) === "true";

        // If mentor record has missing details or flag not set
        const isIncomplete =
          !mentor?.phone ||
          !mentor?.current_position ||
          !mentor?.expertise ||
          mentor.expertise.length === 0;

        if (!hasCompletedFlag || isIncomplete) {
          setIsOpen(true);
        }
      }
    }

    if (!userLoading) {
      checkOnboardingStatus();
    }
  }, [mentor, userLoading]);

  const toggleExpertise = (tag: string) => {
    if (expertise.includes(tag)) {
      setExpertise(expertise.filter((t) => t !== tag));
    } else {
      setExpertise([...expertise, tag]);
    }
  };

  const handleAddCustomExpertise = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    const trimmed = customExpInput.trim();
    if (trimmed && !expertise.includes(trimmed)) {
      setExpertise([...expertise, trimmed]);
      setCustomExpInput("");
    }
  };

  const removeExpertise = (tag: string) => {
    setExpertise(expertise.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || fullName.trim() === "Dr.") {
      toast.error("Please enter your full name with credentials");
      return;
    }
    if (!phone.trim()) {
      toast.error("Please provide your contact phone number");
      return;
    }
    if (!email.trim()) {
      toast.error("Please provide a valid professional email address");
      return;
    }
    if (!currentPosition.trim()) {
      toast.error("Please specify your current position / institution");
      return;
    }
    if (expertise.length === 0) {
      toast.error("Please select at least 1 area of expertise");
      return;
    }

    setSubmitting(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;

      if (!authUser) {
        toast.error("No logged-in user detected. Please log in first.");
        setSubmitting(false);
        return;
      }

      const formattedName = fullName.startsWith("Dr.")
        ? fullName.trim()
        : `Dr. ${fullName.trim()}`;

      const doctorPayload = {
        id: authUser.id,
        full_name: formattedName,
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        current_position: currentPosition.trim(),
        expertise: expertise,
        avatar: avatar || AVATAR_PRESETS[0],
        bio: bio.trim() || "Certified Crop Doctor available for plant disease diagnosis and agronomy consultations.",
        availability: true,
        rating: mentor?.rating || 5.0,
        is_verified: true,
      };

      const { data: updatedDoctor, error } = await supabase
        .from("mentors")
        .upsert(doctorPayload, { onConflict: "id" })
        .select()
        .single();

      if (error) {
        console.error("Failed to save doctor details in mentors table:", error);
        throw error;
      }

      // Update local state
      setMentor(updatedDoctor);
      localStorage.setItem(`doctor_onboarded_${authUser.id}`, "true");

      toast.success("Doctor profile onboarded successfully! You are now live on Farmveda Doctor Connect.");
      setIsOpen(false);
    } catch (err: any) {
      console.error("Doctor onboarding error:", err);
      toast.error(err.message || "Failed to complete onboarding. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Prevent closing if details are still empty
      if (!open && (!mentor?.phone || !mentor?.current_position)) {
        toast.error("Please complete your doctor registration to continue to the dashboard.");
        return;
      }
      setIsOpen(open);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xl">
        <DialogHeader className="space-y-2 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold w-fit">
            <Image
              src="/briefcase-medical.png"
              alt="Crop Doctor"
              width={16}
              height={16}
              className="object-contain"
            />
            <span>Farmveda Crop Doctor Portal</span>
          </div>

          <DialogTitle className="text-2xl font-bold font-sora text-slate-900 tracking-tight flex items-center justify-between">
            <span>Crop Doctor Onboarding</span>
            <span className="text-xs font-medium text-slate-400 font-inter">Step 1 of 1</span>
          </DialogTitle>

          <DialogDescription className="text-sm text-slate-600 font-inter leading-relaxed">
            Welcome to Farmveda! Complete your professional credentials below. Once submitted, your profile will instantly be accessible to farmers seeking expert crop disease diagnosis and treatment advisory.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Avatar Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-inter">
              Profile Photo / Avatar
            </label>
            <div className="flex items-center gap-4">
              <img
                src={avatar}
                alt="Selected Avatar"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm"
              />
              <div className="space-y-1.5 flex-1">
                <p className="text-xs text-slate-500 font-inter">
                  Choose a preset professional avatar or enter your photo URL:
                </p>
                <div className="flex items-center gap-2">
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatar(preset)}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        avatar === preset ? "border-emerald-600 scale-105 shadow" : "border-slate-200 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={preset} alt={`Preset ${idx + 1}`} className="w-9 h-9 object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <Input
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="Or paste a custom image URL (https://...)"
              className="text-xs font-inter mt-1.5 bg-slate-50"
            />
          </div>

          {/* Full Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-inter flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                Doctor Full Name *
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. Rajesh Kumar"
                required
                className="bg-slate-50 font-inter text-sm focus-visible:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-inter flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                Phone Number (WhatsApp) *
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                required
                className="bg-slate-50 font-inter text-sm focus-visible:ring-emerald-500"
              />
            </div>
          </div>

          {/* Email & Current Position */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-inter flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                Professional Email *
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@agri-institute.org"
                required
                className="bg-slate-50 font-inter text-sm focus-visible:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-inter flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                Current Position / Institute *
              </label>
              <Input
                value={currentPosition}
                onChange={(e) => setCurrentPosition(e.target.value)}
                placeholder="Senior Pathologist, ICAR Institute"
                required
                className="bg-slate-50 font-inter text-sm focus-visible:ring-emerald-500"
              />
            </div>
          </div>

          {/* Expertise / Specialization */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-inter flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Area of Specialization & Crops *
              </label>
              <span className="text-[11px] text-slate-400 font-inter">
                {expertise.length} selected
              </span>
            </div>

            {/* Suggested Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {SUGGESTED_EXPERTISE.map((tag) => {
                const isSelected = expertise.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleExpertise(tag)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium font-inter transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom tag input */}
            <div className="flex items-center gap-2 mt-2">
              <Input
                value={customExpInput}
                onChange={(e) => setCustomExpInput(e.target.value)}
                onKeyDown={handleAddCustomExpertise}
                placeholder="Add other specialization (e.g., Rice Blast, Cotton Bollworm)..."
                className="text-xs font-inter bg-slate-50"
              />
              <Button
                type="button"
                onClick={handleAddCustomExpertise}
                variant="outline"
                className="text-xs font-inter shrink-0"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>

            {/* Active Selected Tags Display */}
            {expertise.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {expertise.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-md font-inter font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeExpertise(tag)}
                      className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-inter">
              Professional Bio & Advice for Farmers
            </label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="e.g., 10+ years advising farmers across Punjab and Haryana on bacterial leaf blight, organic fungicides, and pest management..."
              className="bg-slate-50 text-sm font-inter focus-visible:ring-emerald-500 resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-inter font-semibold px-8 py-2.5 h-auto shadow-lg cursor-pointer"
            >
              {submitting ? "Saving & Publishing Profile..." : "Complete Onboarding & Go to Dashboard"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
