/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DoctorAuthService } from "@/lib/doctorAuth";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import Image from "next/image";
import Link from "next/link";
import { MentorOnboarding } from "../_components/mentor-onbaording";

export default function DoctorCallbackPage() {
  const supabase = createClient();
  const router = useRouter();
  const [validating, setValidating] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth error:", error.message);
          toast.error("Doctor authentication failed: " + error.message);
          router.push("/auth-doctor");
          return;
        }

        if (session?.user) {
          const email = session.user.email || "";
          
          // Check if already registered in mentors table with completed profile
          let { data: mentorData } = await supabase
            .from("mentors")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();

          if (!mentorData && email) {
            const { data: byEmail } = await supabase
              .from("mentors")
              .select("*")
              .eq("email", email)
              .maybeSingle();
            if (byEmail) mentorData = byEmail;
          }

          if (
            mentorData &&
            mentorData.is_verified &&
            Array.isArray(mentorData.expertise) &&
            mentorData.expertise.length > 0 &&
            mentorData.current_position
          ) {
            await DoctorAuthService.login(email);
            toast.success(`Welcome back, ${mentorData.full_name || "Doctor"}!`);
            router.push("/dashboard");
          } else {
            // Needs onboarding
            setInitialData({
              fullName: session.user.user_metadata?.full_name || "",
              email: email,
              avatar:
                session.user.user_metadata?.avatar_url ||
                session.user.user_metadata?.picture ||
                "",
              phone: session.user.phone || "",
            });
            setNeedsOnboarding(true);
            setValidating(false);
          }
        } else {
          // Listen for change
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            if (event === "SIGNED_IN" && currentSession?.user) {
              subscription.unsubscribe();
              const email = currentSession.user.email || "";

              let { data: mentorData } = await supabase
                .from("mentors")
                .select("*")
                .eq("id", currentSession.user.id)
                .maybeSingle();

              if (!mentorData && email) {
                const { data: byEmail } = await supabase
                  .from("mentors")
                  .select("*")
                  .eq("email", email)
                  .maybeSingle();
                if (byEmail) mentorData = byEmail;
              }

              if (
                mentorData &&
                mentorData.is_verified &&
                Array.isArray(mentorData.expertise) &&
                mentorData.expertise.length > 0
              ) {
                await DoctorAuthService.login(email);
                toast.success(`Welcome to Crop Doctor Portal, ${mentorData.full_name || "Doctor"}!`);
                router.push("/dashboard");
              } else {
                setInitialData({
                  fullName: currentSession.user.user_metadata?.full_name || "",
                  email: email,
                  avatar:
                    currentSession.user.user_metadata?.avatar_url ||
                    currentSession.user.user_metadata?.picture ||
                    "",
                  phone: currentSession.user.phone || "",
                });
                setNeedsOnboarding(true);
                setValidating(false);
              }
            }
          });

          const timeout = setTimeout(() => {
            subscription.unsubscribe();
            router.push("/auth-doctor");
          }, 8000);

          return () => {
            clearTimeout(timeout);
            subscription.unsubscribe();
          };
        }
      } catch (err) {
        console.error("Doctor callback exception:", err);
        router.push("/auth-doctor");
      }
    };

    handleAuth();
  }, [router, supabase]);

  if (validating) {
    return (
      <div className="min-h-screen bg-[#2A6049] flex flex-col items-center justify-center p-6 text-white font-sans select-none">
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 flex flex-col items-center text-center max-w-sm shadow-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-[#DCE775] mb-4" />
          <h3 className="text-xl font-serif font-bold text-white mb-2">Validating Doctor Profile</h3>
          <p className="text-xs text-emerald-100/80">Checking certification and clinic session credentials...</p>
        </div>
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <div className="min-h-screen w-full bg-[#f8faf9] flex flex-col items-center justify-center p-4 sm:p-6 relative select-none">
        {/* Top Navbar */}
        <div className="w-full max-w-[620px] flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Image
              src="/logo-bg.png"
              alt="Farmveda Logo"
              width={38}
              height={38}
              className="object-contain"
            />
            <span className="font-serif font-bold text-xl text-[#2A6049]">Farmveda Clinic</span>
          </div>
          <Link
            href="/auth-doctor"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            Cancel
          </Link>
        </div>

        <main className="w-full flex items-center justify-center">
          <MentorOnboarding
            initial={initialData}
            onFinished={() => router.push("/dashboard")}
          />
        </main>
      </div>
    );
  }

  return null;
}
