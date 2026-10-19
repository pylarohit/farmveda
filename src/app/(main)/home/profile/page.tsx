/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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
  Sparkles,
  Award,
} from "lucide-react";
import { useLanguage, SUPPORTED_LANGUAGES, LangCode } from "@/context/LanguageProvider";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  const supabase = createClient();

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    userName: "",
    userPhone: "",
    userAge: "",
    state: "",
    district: "",
    village: "",
  });

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
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      {/* ── Page Header & Farmer Hero ── */}
      <div className="relative rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-6 md:p-8 text-white shadow-xl overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-1/4 -bottom-16 w-48 h-48 bg-emerald-400/20 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
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
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-sora">
                {user?.userName || "Farmer"}
              </h1>
              <Badge className="bg-emerald-400/25 text-emerald-100 hover:bg-emerald-400/30 border border-emerald-300/30 px-2.5 py-0.5 text-xs font-semibold gap-1">
                <Sparkles className="h-3 w-3" />
                {t("profile", "verifiedFarmer")}
              </Badge>
            </div>

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
      </div>

      {/* ── SECTION 1: LANGUAGE PREFERENCES (Highlighted) ── */}
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

      {/* ── SECTION 2: EDIT FARMER PROFILE DETAILS ── */}
      <form onSubmit={handleSaveProfile}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Info */}
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

          {/* Location Details */}
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

        {/* Submit Actions */}
        <div className="flex justify-end pt-6">
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
    </div>
  );
}
