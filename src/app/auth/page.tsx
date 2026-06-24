/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";

export default function AuthPage() {
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (provider: "google" | "otp") => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    role: "user",
                },
            },
        });

        if (error) {
            console.error("Login error:", error.message);
        }
    };

    return (
        <section className="h-screen overflow-hidden bg-white select-none">
            <main className="flex flex-col lg:flex-row h-full">

                {/* LEFT SIDE design */}
                <div className="flex-1 min-h-screen lg:min-h-0 bg-white relative overflow-hidden flex items-center justify-center">
                    <div className="w-full max-w-[340px] flex flex-col items-center z-10 px-2">

                        {/* Logo */}
                        <div className="flex items-center gap-4 mb-6 cursor-pointer justify-center">
                            <Link href="/">
                                <Image
                                    src="/logo-bg.png"
                                    alt="Farmveda logo"
                                    width={130}
                                    height={130}
                                    className="object-contain"
                                    priority
                                />
                            </Link>
                        </div>

                        {/* Title and Subtitle */}
                        <div className="text-center mb-8">
                            <h2 className="text-[28px] font-bold text-[#1e293b] tracking-tight leading-tight">
                                Welcome to Farmveda
                            </h2>
                            <p className="text-sm font-medium text-slate-500 mt-1">
                                Sign in with your mobile number or Google
                            </p>
                        </div>

                        {/* Phone Number Login */}
                        <div className="flex flex-col gap-1.5 w-full mb-4">
                            <label className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1">
                                Email Login
                            </label>

                            <div className="relative flex items-center w-full mb-3">
                                <div className="absolute left-4 flex items-center gap-1.5 text-xs font-bold text-slate-400 select-none">
                                    <span>IN</span>
                                    <span className="text-slate-500 font-semibold">+91</span>
                                    <div className="w-[1px] h-5 bg-slate-200 ml-2"></div>
                                </div>
                                <Input
                                    type="tel"
                                    maxLength={10}
                                    className="w-full h-14 pl-20 pr-4 border border-slate-300 focus:border-[#009662] focus:ring-2 focus:ring-emerald-100 rounded-xl text-base font-semibold text-slate-700 transition-all placeholder-slate-400 shadow-xs"
                                />
                            </div>

                            <button
                                className="font-inter text-base font-bold tracking-wide bg-white text-[#1e293b] rounded-xl border border-slate-200 shadow-xs hover:bg-slate-50 hover:scale-[1.01] hover:border-slate-300 transition-all cursor-pointer w-full h-14 flex items-center justify-center gap-3"
                                onClick={() => handleLogin("otp")}
                            >
                                <Image
                                    src="/phone.svg"
                                    alt="Phone"
                                    width={26}
                                    height={26}
                                    className="shrink-0"
                                />
                                <span>continue with OTP</span>
                            </button>
                        </div>




                        {/* divider */}
                        <div className="flex items-center w-full mb-6">
                            <div className="flex-1 h-[1px] bg-slate-200"></div>
                            <span className="px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                OR
                            </span>
                            <div className="flex-1 h-[1px] bg-slate-200"></div>
                        </div>





                        {/* Google Button */}
                        <div className="w-full mb-6">
                            <button
                                className="font-inter text-base font-bold tracking-wide bg-white text-[#1e293b] rounded-xl border border-slate-200 shadow-xs hover:bg-slate-50 hover:scale-[1.01] hover:border-slate-300 transition-all cursor-pointer w-full h-14 flex items-center justify-center gap-3"
                                onClick={() => handleLogin("google")}
                            >
                                <Image
                                    src="/search.png"
                                    alt="Google"
                                    width={26}
                                    height={26}
                                    className="shrink-0"
                                />
                                <span>continue with Google</span>
                            </button>
                        </div>

                        {/* vendor link to change the login page */}
                        <div className="w-full text-center">
                            <p
                                onClick={() => router.push("/auth-mentor")}
                                className="text-base font-semibold cursor-pointer text-[#475569]"
                            >
                                Are you a Vendor ?{" "}
                                <span className="text-[#009662] hover:text-[#008556] font-bold cursor-pointer hover:underline transition-colors">
                                    Click here!
                                </span>
                            </p>
                        </div>

                    </div>
                </div>




                {/* RIGHT Side design */}
                <div className="hidden lg:flex h-screen w-full lg:w-[55%] bg-[#e2f0d9] relative overflow-hidden flex-col justify-between">
                    {/* Curve overlay (white circle sticking into the left edge) */}
                    <div
                        className="absolute top-1/2 -translate-y-1/2 bg-white z-10 select-none pointer-events-none"
                        style={{
                            left: "-180px",
                            width: "360px",
                            height: "140%",
                            borderRadius: "50%",
                        }}
                    />

                    {/* The vector illustration */}
                    <div className="absolute inset-0 w-full h-full z-0 select-none pointer-events-none">
                        <Image
                            src="/farmers-paddy.png"
                            alt="Rice farmers paddy"
                            fill
                            className="object-cover object-bottom"
                            priority
                        />
                    </div>
                </div>





            </main>
        </section>
    );
}
