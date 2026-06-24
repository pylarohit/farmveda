"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import Image from "next/image";
import { OnboardingCard } from "../_components/OnBoardingCard";

export default function CallbackPage() {
    const supabase = createClient();
    const router = useRouter();
    const [validating, setValidating] = useState(true);
    const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Get current session
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error("Auth callback error:", error.message);
                    toast.error("Authentication failed: " + error.message);
                    router.push("/auth");
                    return;
                }

                if (session?.user) {
                    // Check verification/onboarding status from the database
                    const { data: userData, error: dbError } = await supabase
                        .from("users")
                        .select("is_verified")
                        .eq("id", session.user.id)
                        .maybeSingle();

                    if (dbError) {
                        console.error("Error checking onboarding status:", dbError.message);
                    }

                    const isVerified = userData?.is_verified;

                    if (isVerified) {
                        toast.success(`Welcome back, ${session.user.email || "User"}!`);
                        router.push("/home");
                    } else {
                        // User needs onboarding
                        setNeedsOnboarding(true);
                        setValidating(false);
                    }
                } else {
                    // Listen to auth state changes in case the session is still loading
                    const { data: { subscription } } = supabase.auth.onAuthStateChange(
                        async (event, currentSession) => {
                            if (event === "SIGNED_IN" && currentSession?.user) {
                                subscription.unsubscribe();

                                // Check database status for dynamic onboarding check
                                const { data: userData } = await supabase
                                    .from("users")
                                    .select("is_verified")
                                    .eq("id", currentSession.user.id)
                                    .maybeSingle();

                                const isVerified = userData?.is_verified;

                                if (isVerified) {
                                    toast.success(`Welcome back, ${currentSession.user.email || "User"}!`);
                                    router.push("/home");
                                } else {
                                    setNeedsOnboarding(true);
                                    setValidating(false);
                                }
                            }
                        }
                    );

                    // Timeout fallback
                    const timeout = setTimeout(() => {
                        subscription.unsubscribe();
                        toast.error("Session timeout. Please try logging in again.");
                        router.push("/auth");
                    }, 6000);

                    return () => {
                        clearTimeout(timeout);
                        subscription.unsubscribe();
                    };
                }
            } catch (err: any) {
                console.error("Callback exception:", err);
                toast.error("An unexpected error occurred during login.");
                router.push("/auth");
            }
        };

        handleCallback();
    }, [router, supabase]);

    if (validating) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50 select-none">
                <div className="flex flex-col items-center max-w-[400px] text-center p-8 bg-white border border-slate-100 rounded-3xl shadow-xl">
                    <div className="flex items-center text-xl font-bold text-slate-800 tracking-tight mb-4">
                        <Loader2 className="animate-spin text-[#009662] mr-3 h-6 w-6" />
                        <p>Validating user...</p>
                    </div>
                    <p className="font-semibold text-sm text-slate-400 mt-2">
                        Please wait while we establish your secure session. Tighten your seatbelt!
                    </p>
                </div>
            </div>
        );
    }

    if (needsOnboarding) {
        return (
            <div className="w-full h-screen relative bg-white overflow-hidden select-none">
                {/* Emerald light radial background */}
                <div
                    className="absolute inset-0 z-0 bg-white"
                    style={{
                        background:
                            "radial-gradient(125% 125% at 50% 90%, #ffffff 40%, #e2f0d9 100%)",
                    }}
                />

                {/* Header Logo */}
                <div className="absolute top-4 left-6 z-10">
                    <div className="flex items-center gap-2">
                        <Image
                            src="/logo-bg.png"
                            alt="logo"
                            width={50}
                            height={50}
                            className="object-contain"
                        />
                        <h1 className="font-raleway text-2xl font-black text-slate-800 tracking-tight">
                            Farmveda
                        </h1>
                    </div>
                </div>

                <div className="absolute top-6 right-8 z-10 hidden sm:block">
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">
                        learn more • earn more • grow more
                    </p>
                </div>

                <main className="relative z-10 h-full w-full flex items-center justify-center p-4">
                    <OnboardingCard />
                </main>
            </div>
        );
    }

    return null;
}
