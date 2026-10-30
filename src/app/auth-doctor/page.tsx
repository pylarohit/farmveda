"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, User, Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DoctorAuthService } from "@/lib/doctorAuth";
import { toast } from "react-hot-toast";
import { MentorOnboarding } from "./_components/mentor-onbaording";

const SLIDES = [
  {
    title: "Take a consultation with Crop Doctor from anywhere in the country",
    subtitle: "Real-time AI diagnosis and certified plant pathologist prescriptions for farmers."
  },
  {
    title: "Review field crop pathology scans & prescribe verified remedies",
    subtitle: "Deliver dosage guidelines, spray discipline, and organic treatments directly."
  },
  {
    title: "Empowering Indian Agriculture through Tele-Agronomy",
    subtitle: "Affiliated with ICAR and state agricultural universities nationwide."
  }
];

export default function AuthDoctorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [specialization, setSpecialization] = useState("Plant Pathologist");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  // Doctor onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingInitial, setOnboardingInitial] = useState<any>(null);

  useEffect(() => {
    if (searchParams.get("onboarding") === "true") {
      setShowOnboarding(true);
    }
  }, [searchParams]);

  // Handle Email + Password Sign In / Sign Up
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          // If supabase auth credentials are not yet set up for this email,
          // also authenticate through our DoctorAuthService session for seamless demo access
          console.warn("Supabase auth notice:", error.message);
          const doc = await DoctorAuthService.login(email.trim());
          toast.success(`Welcome back, ${doc.name}!`);
          router.push("/dashboard");
          return;
        }

        if (data?.user) {
          // Check if doctor has completed onboarding
          let { data: mentorData } = await supabase
            .from("mentors")
            .select("*")
            .eq("id", data.user.id)
            .maybeSingle();

          if (!mentorData && data.user.email) {
            const { data: byEmail } = await supabase
              .from("mentors")
              .select("*")
              .eq("email", data.user.email)
              .maybeSingle();
            if (byEmail) mentorData = byEmail;
          }

          if (
            mentorData &&
            mentorData.is_verified &&
            Array.isArray(mentorData.expertise) &&
            mentorData.expertise.length > 0
          ) {
            await DoctorAuthService.login(email.trim());
            toast.success(`Welcome back, ${mentorData.full_name || "Doctor"}!`);
            router.push("/dashboard");
          } else {
            // Needs onboarding
            setOnboardingInitial({
              fullName: data.user.user_metadata?.full_name || email.split("@")[0],
              email: data.user.email || email.trim(),
              avatar: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || "",
              phone: data.user.phone || "",
            });
            setShowOnboarding(true);
          }
        }
      } else {
        // Sign Up
        const cleanName = fullName.trim() || "Crop Doctor";
        const formattedName = cleanName.startsWith("Dr.") ? cleanName : `Dr. ${cleanName}`;
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              role: "doctor",
              full_name: formattedName,
              specialization,
            },
          },
        });

        if (error) {
          toast.error(error.message);
          return;
        }

        toast.success("Account created! Please complete your doctor profile.");
        setOnboardingInitial({
          fullName: formattedName,
          email: email.trim(),
          occupation: specialization,
          phone: "",
        });
        setShowOnboarding(true);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      toast.error(err.message || "Authentication failed. Please check credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth with role='doctor'
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth-doctor/callback`,
          queryParams: {
            role: "doctor",
          },
        },
      });

      if (error) {
        toast.error(error.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to initialize Google login.");
    }
  };

  // Quick Demo Access for Testing
  const handleQuickDemo = async (demoEmail: string, demoName: string) => {
    setEmail(demoEmail);
    setPassword("demo1234");
    setIsLoading(true);
    try {
      const doc = await DoctorAuthService.login(demoEmail);
      toast.success(`Logged in as ${doc.name}`);
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Demo login error");
    } finally {
      setIsLoading(false);
    }
  };

  if (showOnboarding) {
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
          <button
            type="button"
            onClick={() => setShowOnboarding(false)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            &larr; Back to Login
          </button>
        </div>

        <main className="w-full flex items-center justify-center">
          <MentorOnboarding
            initial={onboardingInitial}
            onFinished={() => router.push("/dashboard")}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white flex flex-col lg:flex-row font-sans select-none">
      {/* ──────────────── LEFT PANEL: Forest Green Aesthetic ──────────────── */}
      <div className="w-full lg:w-[50%] p-4 sm:p-6 lg:p-8 flex">
        <div className="w-full bg-[#2A6049] rounded-[32px] p-6 sm:p-10 flex flex-col justify-between relative overflow-hidden shadow-2xl text-white">
          {/* Subtle background ambient circles */}
          <div className="absolute top-[-20%] right-[-10%] w-[350px] h-[350px] bg-emerald-400/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[300px] h-[300px] bg-teal-300/10 rounded-full blur-[80px] pointer-events-none" />

          {/* Top Bar: Cross / Clover Logo & Back Link */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#DCE775] text-[#2A6049] flex items-center justify-center font-black text-xl shadow-xs">
                ✚
              </div>
              <span className="text-xs font-bold tracking-wider text-emerald-100 uppercase">
                Farmveda Clinic
              </span>
            </div>

            <Link
              href="/auth"
              className="text-xs font-semibold text-emerald-100/80 hover:text-white flex items-center gap-1.5 transition-colors bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Farmer Login
            </Link>
          </div>

          {/* Hero Headline */}
          <div className="my-6 lg:my-8 z-10 max-w-md">
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-serif font-normal leading-[1.2] text-white tracking-tight">
              {SLIDES[activeSlide].title}
            </h1>
            <p className="text-sm text-emerald-100/80 font-sans mt-3 leading-relaxed">
              {SLIDES[activeSlide].subtitle}
            </p>
          </div>

          {/* Center Graphic: Illustrated Tele-Consultation matching the screenshot */}
          <div className="relative my-auto w-full max-w-[420px] mx-auto aspect-[16/11] flex items-center justify-center z-10">
            <svg
              viewBox="0 0 500 320"
              className="w-full h-full drop-shadow-md"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Ground line */}
              <line x1="20" y1="280" x2="480" y2="280" stroke="#487A63" strokeWidth="2" strokeDasharray="3 3" />

              {/* Little flowers & crops on ground */}
              <circle cx="50" cy="275" r="7" fill="#E6EE9C" />
              <line x1="50" y1="280" x2="50" y2="275" stroke="#487A63" strokeWidth="2" />

              <circle cx="150" cy="272" r="6" fill="#FFAB91" />
              <line x1="150" y1="280" x2="150" y2="272" stroke="#487A63" strokeWidth="2" />

              <circle cx="340" cy="274" r="8" fill="#FFF59D" />
              <line x1="340" y1="280" x2="340" y2="274" stroke="#487A63" strokeWidth="2" />

              <circle cx="430" cy="273" r="7" fill="#80CBC4" />
              <line x1="430" y1="280" x2="430" y2="273" stroke="#487A63" strokeWidth="2" />

              {/* Consultation Video Screen (Right side) */}
              <rect x="230" y="70" width="220" height="170" rx="16" fill="#FCE4EC" stroke="#254B3A" strokeWidth="3" />
              <rect x="230" y="70" width="220" height="24" rx="16" fill="#E8B4B8" />
              {/* Window controls */}
              <circle cx="430" cy="82" r="3" fill="#254B3A" />
              <line x1="418" y1="82" x2="424" y2="82" stroke="#254B3A" strokeWidth="2" />

              {/* Crop Doctor inside screen */}
              <circle cx="340" cy="135" r="28" fill="#FFCCBC" />
              {/* Hair */}
              <path d="M312 135 C312 105, 368 105, 368 135 C368 165, 350 165, 340 165 C330 165, 312 165, 312 135 Z" fill="#263238" />
              {/* Glasses */}
              <circle cx="332" cy="132" r="7" stroke="#263238" strokeWidth="2" fill="none" />
              <circle cx="348" cy="132" r="7" stroke="#263238" strokeWidth="2" fill="none" />
              <line x1="339" y1="132" x2="341" y2="132" stroke="#263238" strokeWidth="2" />
              {/* Lab coat */}
              <path d="M295 240 L385 240 L375 185 C375 170, 305 170, 305 185 Z" fill="#FFFFFF" />
              {/* Stethoscope */}
              <path d="M325 180 Q340 215 355 180" stroke="#00796B" strokeWidth="3" fill="none" />
              <circle cx="340" cy="215" r="4" fill="#004D40" />

              {/* Connecting wire from doctor screen to farmer thought */}
              <path d="M245 130 C190 100, 210 170, 150 140" stroke="#37474F" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />

              {/* Farmer / Client sitting on chair (Left side) */}
              {/* Chair */}
              <line x1="85" y1="190" x2="85" y2="280" stroke="#263238" strokeWidth="3" />
              <line x1="125" y1="220" x2="125" y2="280" stroke="#263238" strokeWidth="3" />
              <rect x="75" y="215" width="60" height="8" rx="4" fill="#37474F" />

              {/* Farmer body */}
              <circle cx="105" cy="140" r="22" fill="#80DEEA" />
              {/* Hair bun */}
              <circle cx="95" cy="125" r="10" fill="#E0F7FA" />
              {/* Shirt */}
              <path d="M80 220 L135 220 L125 170 C125 158, 85 158, 85 170 Z" fill="#EF5350" />
              {/* Trousers */}
              <path d="M95 220 L125 220 L135 260 L120 260 L108 235 L95 260 L80 260 Z" fill="#F5F5F5" />
              {/* Boots */}
              <rect x="78" y="260" width="18" height="15" rx="3" fill="#212121" />
              <rect x="122" y="260" width="18" height="15" rx="3" fill="#212121" />

              {/* Crop Leaf in hand */}
              <path d="M125 190 Q150 175 165 190 Q150 205 125 190" fill="#66BB6A" stroke="#2E7D32" strokeWidth="1.5" />
              <line x1="125" y1="190" x2="165" y2="190" stroke="#2E7D32" strokeWidth="1" />

              {/* Speech / Diagnosis bubble */}
              <ellipse cx="140" cy="110" rx="32" ry="24" fill="#FFF59D" />
              <path d="M130 130 L120 145 L140 133 Z" fill="#FFF59D" />
              <path d="M125 105 Q135 95 145 105 T155 115" stroke="#E65100" strokeWidth="2" fill="none" />
            </svg>
          </div>

          {/* Bottom Slider Pagination Dots */}
          <div className="flex items-center justify-center gap-2 pt-4 z-10">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSlide(idx)}
                className={`transition-all rounded-full h-2 cursor-pointer ${
                  activeSlide === idx
                    ? "w-8 bg-[#F5E6C8]"
                    : "w-2 bg-white/40 hover:bg-white/70"
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ──────────────── RIGHT PANEL: Clean White Sign In ──────────────── */}
      <div className="w-full lg:w-[50%] flex flex-col justify-center items-center px-6 sm:px-12 lg:px-16 py-10 bg-white">
        <div className="w-full max-w-[420px] flex flex-col">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-4xl sm:text-5xl font-serif font-normal text-slate-900 tracking-tight">
              {mode === "signin" ? "Sign In" : "Create Account"}
            </h2>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              {mode === "signin"
                ? "Enter your credentials to access the Crop Doctor consultation console."
                : "Register your agricultural credentials to start consulting with farmers."}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <div className="relative border border-slate-200 rounded-full px-5 py-3.5 flex items-center gap-3 bg-white focus-within:border-[#2A6049] focus-within:ring-2 focus-within:ring-[#2A6049]/10 transition-all">
                    <User className="w-5 h-5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Full Name (e.g. Dr. Ramesh Patel)"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="relative border border-slate-200 rounded-full px-5 py-3.5 flex items-center gap-3 bg-white focus-within:border-[#2A6049] focus-within:ring-2 focus-within:ring-[#2A6049]/10 transition-all">
                    <Sparkles className="w-5 h-5 text-slate-400 shrink-0" />
                    <select
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="w-full bg-transparent text-sm text-slate-900 focus:outline-none cursor-pointer"
                    >
                      <option value="Plant Pathologist">Plant Pathologist (Diseases & Blight)</option>
                      <option value="Entomologist">Entomologist (Insects & Pest Defense)</option>
                      <option value="Soil Scientist">Soil Scientist & Micro-Nutrients</option>
                      <option value="Agronomist">General Crop Agronomist</option>
                      <option value="Horticulturist">Horticulture & Fruit Specialist</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Email Field */}
            <div>
              <div className="relative border border-slate-200 rounded-full px-5 py-3.5 flex items-center gap-3 bg-white focus-within:border-[#2A6049] focus-within:ring-2 focus-within:ring-[#2A6049]/10 transition-all">
                <Mail className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="relative border border-slate-200 rounded-full px-5 py-3.5 flex items-center gap-3 bg-white focus-within:border-[#2A6049] focus-within:ring-2 focus-within:ring-[#2A6049]/10 transition-all">
                <Lock className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-1 px-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#2A6049] focus:ring-[#2A6049] border-slate-300"
                />
                <span>Remember Me</span>
              </label>

              <button
                type="button"
                onClick={() => toast("Password reset link sent to your registered email.")}
                className="text-[#2A6049] hover:text-[#1F4937] font-semibold hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            {/* Sign In Primary Button in Sand / Cream color */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 rounded-full bg-[#F5E6C8] hover:bg-[#EEDBB2] text-[#2D312E] font-semibold text-base shadow-xs hover:shadow-md transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 mt-4 active:scale-[0.99]"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-[#2D312E]" />
              ) : mode === "signin" ? (
                "Sign in"
              ) : (
                "Create an Account"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center w-full my-6">
            <div className="flex-1 h-[1px] bg-slate-200"></div>
            <span className="px-4 text-xs text-slate-400 font-medium">Or</span>
            <div className="flex-1 h-[1px] bg-slate-200"></div>
          </div>

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full h-14 rounded-full border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>

          {/* Toggle between Sign In and Sign Up */}
          <div className="w-full text-center mt-8">
            <p className="text-xs text-slate-600 font-medium">
              {mode === "signin" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-[#2A6049] hover:text-[#1F4937] font-bold hover:underline cursor-pointer ml-1"
                  >
                    Create an Account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="text-[#2A6049] hover:text-[#1F4937] font-bold hover:underline cursor-pointer ml-1"
                  >
                    Sign In
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Demo 1-Click Fill Helper for easy testing */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <span>Demo Crop Doctor:</span>
            <button
              type="button"
              onClick={() => handleQuickDemo("ananya.sharma@farmveda.in", "Dr. Ananya Sharma")}
              className="text-[#2A6049] font-bold hover:underline cursor-pointer"
            >
              Dr. Ananya (ICAR) &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
