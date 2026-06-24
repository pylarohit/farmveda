/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { StepIndicator } from "./StepIndicator";
import {
    ChevronLeft,
    ChevronRight,
    Loader2,
    Sprout,
} from "lucide-react";
import { toast }        from "react-hot-toast";
import { useRouter }    from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATE_OPTIONS = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal", "Other",
];

// ─── Types ─────────────────────────────────────────────────────────────────────

type FormData = {
    name:     string;
    age:      string;
    phone:    string;
    email:    string;
    state:    string;
    district: string;
    village:  string;
};

// ─── Review row helper ─────────────────────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between py-2.5 border-b border-slate-100 last:border-0">
            <span className="text-sm font-medium text-slate-500 min-w-[110px]">{label}</span>
            <span className="text-sm font-semibold text-slate-800 text-right max-w-[60%] break-words">
                {value || <span className="text-slate-300 font-normal">—</span>}
            </span>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OnboardingCard() {
    const [step, setStep]       = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(false);
    const supabase              = createClient();
    const router                = useRouter();

    const [data, setData] = useState<FormData>({
        name:     "",
        age:      "",
        phone:    "",
        email:    "",
        state:    "",
        district: "",
        village:  "",
    });

    // Pre-fill name + email from Google session
    useEffect(() => {
        const fetchSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setData(prev => ({
                    ...prev,
                    name:  session.user.user_metadata?.full_name || "",
                    email: session.user.email || "",
                }));
            }
        };
        fetchSession();
    }, [supabase]);

    // Per-step validation
    const canProceed = useMemo(() => {
        const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRx = /^[0-9]{10}$/;
        switch (step) {
            case 1:
                return (
                    data.name.trim().length  >= 2 &&
                    !!data.age && Number(data.age) >= 10 && Number(data.age) <= 100 &&
                    phoneRx.test(data.phone) &&
                    emailRx.test(data.email.trim())
                );
            case 2: return !!data.state && data.district.trim().length >= 2;
            case 3: return true; // review — always can finish
            default: return false;
        }
    }, [step, data]);

    function nextStep() { if (step < 3 && canProceed) setStep(s => s + 1); }
    function prevStep() { if (step > 1) setStep(s => s - 1); }

    async function finish() {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                toast.error("Session not found. Please log in again.");
                router.push("/auth");
                return;
            }

            const payload: any = {
                id:           session.user.id,
                "userName":   data.name.trim(),
                "userAge":    Number(data.age),
                "userPhone":  data.phone.trim(),
                "userEmail":  data.email.trim(),
                state:        data.state,
                district:     data.district.trim(),
                village:      data.village.trim() || null,
                is_verified:  true,
            };

            const { error } = await supabase.from("users").upsert(payload);

            if (error) {
                toast.error("Failed to save: " + error.message);
                return;
            }

            localStorage.setItem("isOnboardingDone", "true");
            toast.success("Welcome to Farmveda! 🌾");
            router.push("/home");
        } catch (err) {
            console.error("Onboarding error:", err);
            toast.error("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card className="w-full max-w-2xl border-border shadow-sm">

            {/* ── Header ── */}
            <CardHeader className="space-y-3">
                <CardTitle className="text-balance text-xl font-bold text-slate-800 flex items-center gap-2">
                    Let&apos;s set up your farming profile
                    <Sprout className="h-5 w-5 text-emerald-500" />
                </CardTitle>
                <CardDescription className="text-pretty text-base font-medium text-slate-500">
                    Complete the steps to get personalised crop insights and market data.
                </CardDescription>
                <div className="w-full pt-1">
                    <StepIndicator current={step} onStepClick={s => setStep(s)} />
                </div>
            </CardHeader>

            {/* ── Body ── */}
            <CardContent className="space-y-8">

                {/* ══ STEP 1: Profile ══ */}
                {step === 1 && (
                    <section className="space-y-6" aria-label="Basic information">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                            {/* Full Name */}
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="name" className="text-sm font-semibold text-slate-700">
                                    Full Name
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Ramesh Kumar"
                                    value={data.name}
                                    onChange={e => setData({ ...data, name: e.target.value })}
                                    className="h-12 bg-emerald-50/40 border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-100"
                                />
                            </div>

                            {/* Age */}
                            <div className="space-y-2">
                                <Label htmlFor="age" className="text-sm font-semibold text-slate-700">
                                    Age
                                </Label>
                                <Input
                                    id="age"
                                    type="number"
                                    min={10}
                                    max={100}
                                    placeholder="Age"
                                    value={data.age}
                                    onChange={e => setData({ ...data, age: e.target.value })}
                                    className="h-12 bg-emerald-50/40 border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-100"
                                />
                            </div>

                            {/* Phone */}
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-sm font-semibold text-slate-700">
                                    Mobile Number
                                </Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    maxLength={10}
                                    placeholder="Phone Number"
                                    value={data.phone}
                                    onChange={e => setData({ ...data, phone: e.target.value.replace(/\D/g, "") })}
                                    className="h-12 bg-emerald-50/40 border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-100"
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
                                    Email Address
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={data.email}
                                    onChange={e => setData({ ...data, email: e.target.value })}
                                    className="h-12 bg-emerald-50/40 border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-100"
                                />
                                <p className="text-xs text-slate-400">Pre-filled from your Google account.</p>
                            </div>
                        </div>
                    </section>
                )}

                {/* ══ STEP 2: Address ══ */}
                {step === 2 && (
                    <section className="space-y-5" aria-label="Address">

                        {/* State */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">State</Label>
                            <Select
                                value={data.state}
                                onValueChange={v => setData({ ...data, state: v })}
                            >
                            <SelectTrigger className="!h-12 w-full bg-emerald-50/40 border-slate-200 focus:ring-emerald-100 focus:border-emerald-500">
                                    <SelectValue placeholder="Select your state…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATE_OPTIONS.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* District */}
                        <div className="space-y-2">
                            <Label htmlFor="district" className="text-sm font-semibold text-slate-700">
                                District
                            </Label>
                            <Input
                                id="district"
                                placeholder="e.g. Guntur"
                                value={data.district}
                                onChange={e => setData({ ...data, district: e.target.value })}
                                className="h-12 bg-emerald-50/40 border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-100"
                            />
                        </div>

                        {/* Village / Town — optional */}
                        <div className="space-y-2">
                            <Label htmlFor="village" className="text-sm font-semibold text-slate-700">
                                Village / Town
                                <span className="ml-2 text-xs font-normal text-slate-400">— optional</span>
                            </Label>
                            <Input
                                id="village"
                                placeholder="e.g. Narasaraopet"
                                value={data.village}
                                onChange={e => setData({ ...data, village: e.target.value })}
                                className="h-12 bg-emerald-50/40 border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-100"
                            />
                        </div>
                    </section>
                )}

                {/* ══ STEP 3: Review ══ */}
                {step === 3 && (
                    <section className="space-y-5" aria-label="Review your information">
                        <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-700">
                                Review your information
                            </p>
                            <p className="text-xs text-slate-400">
                                Please check all details before submitting. Click Back to edit anything.
                            </p>
                        </div>

                        {/* Profile */}
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 overflow-hidden">
                            <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-100">
                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Profile</p>
                            </div>
                            <div className="px-4">
                                <ReviewRow label="Full Name" value={data.name} />
                                <ReviewRow label="Age"       value={data.age ? `${data.age} years` : ""} />
                                <ReviewRow label="Phone"     value={data.phone} />
                                <ReviewRow label="Email"     value={data.email} />
                            </div>
                        </div>

                        {/* Address */}
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 overflow-hidden">
                            <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-100">
                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Address</p>
                            </div>
                            <div className="px-4">
                                <ReviewRow label="State"        value={data.state}    />
                                <ReviewRow label="District"     value={data.district} />
                                <ReviewRow label="Village/Town" value={data.village || "Not provided"} />
                            </div>
                        </div>
                    </section>
                )}
            </CardContent>

            {/* ── Footer ── */}
            <CardFooter className="flex items-center justify-between gap-2 mt-2">
                <div className="text-sm text-muted-foreground">Step {step} of 3</div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={prevStep}
                        disabled={step === 1 || loading}
                        className="h-11 px-6 text-base cursor-pointer"
                    >
                        <ChevronLeft className="mr-1.5 h-4 w-4" /> Back
                    </Button>

                    {step < 3 ? (
                        <Button
                            onClick={nextStep}
                            disabled={!canProceed}
                            className="h-11 px-6 text-base bg-emerald-600 hover:bg-emerald-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Continue <ChevronRight className="ml-1.5 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={finish}
                            disabled={loading}
                            className="h-11 px-6 text-base bg-emerald-600 hover:bg-emerald-700 cursor-pointer disabled:opacity-50"
                        >
                            {loading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                            ) : (
                                <><Sprout className="mr-2 h-4 w-4" /> Complete Setup</>
                            )}
                        </Button>
                    )}
                </div>
            </CardFooter>
        </Card>
    );
}
