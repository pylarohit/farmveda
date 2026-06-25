/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import AnimatedOTP from "@/components/forgeui/animated-otp";

export default function AuthPage() {
    const router = useRouter();
    const supabase = createClient();
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otpValue, setOtpValue] = useState("");
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

    const handleLogin = async (provider: "google" | "otp") => {
        if (provider === "google") {
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
                toast.error(error.message);
            }
        } else {
            if (!email) {
                toast.error("Please enter a valid email address.");
                return;
            }
            setIsLoading(true);
            try {
                const { error } = await supabase.auth.signInWithOtp({
                    email,
                    options: {
                        shouldCreateUser: true,
                    },
                });

                if (error) {
                    toast.error(error.message);
                } else {
                    toast.success("OTP sent to your email!");
                    setShowOtpModal(true);
                }
            } catch (err: any) {
                toast.error(err.message || "An unexpected error occurred.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleVerifyOtp = async () => {
        if (otpValue.length !== 6) {
            toast.error("Please enter a valid 6-digit OTP.");
            return;
        }
        setIsVerifyingOtp(true);
        try {
            const { error } = await supabase.auth.verifyOtp({
                email,
                token: otpValue,
                type: "email",
            });

            if (error) {
                toast.error(error.message);
            } else {
                toast.success("Successfully authenticated!");
                router.push("/auth/callback");
            }
        } catch (err: any) {
            toast.error(err.message || "Verification failed.");
        } finally {
            setIsVerifyingOtp(false);
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
                                Sign in with your email or Google
                            </p>
                        </div>

                        {/* Email Login */}
                        <div className="flex flex-col gap-1.5 w-full mb-4">
                            <label className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1">
                                Email Address
                            </label>

                            <div className="relative flex items-center w-full mb-3">
                                <Input
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-14 px-4 border border-slate-300 focus:border-[#009662] focus:ring-2 focus:ring-emerald-100 rounded-xl text-base font-semibold text-slate-700 transition-all placeholder-slate-400 shadow-xs"
                                    disabled={isLoading}
                                />
                            </div>

                            <button
                                className="font-inter text-base font-bold tracking-wide bg-white text-[#1e293b] rounded-xl border border-slate-200 shadow-xs hover:bg-slate-50 hover:scale-[1.01] hover:border-slate-300 transition-all cursor-pointer w-full h-14 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => handleLogin("otp")}
                                disabled={isLoading}
                            >
                                <Image
                                    src="/mail.svg"
                                    alt="Email"
                                    width={26}
                                    height={26}
                                    className="shrink-0"
                                />
                                <span>{isLoading ? "Sending..." : "continue with Email"}</span>
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

            {showOtpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full border border-slate-100 shadow-2xl flex flex-col items-center">
                        <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                            <Image
                                src="/mail.svg"
                                alt="Email"
                                width={24}
                                height={24}
                                className="text-[#009662]"
                            />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 text-center mb-2">
                            Enter Verification Code
                        </h3>
                        <p className="text-sm text-slate-500 text-center mb-6 px-2">
                            We have sent a 6-digit OTP to <span className="font-semibold text-slate-700">{email}</span>
                        </p>

                        <div className="w-full mb-6">
                            <AnimatedOTP
                                value={otpValue}
                                onChange={setOtpValue}
                                disabled={isVerifyingOtp}
                            />
                        </div>

                        <div className="flex flex-col gap-3 w-full">
                            <button
                                onClick={handleVerifyOtp}
                                disabled={isVerifyingOtp || otpValue.length !== 6}
                                className="w-full h-12 bg-[#009662] hover:bg-[#008556] text-white rounded-xl font-bold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isVerifyingOtp ? "Verifying..." : "Verify & Continue"}
                            </button>

                            <button
                                onClick={() => {
                                    setShowOtpModal(false);
                                    setOtpValue("");
                                }}
                                disabled={isVerifyingOtp}
                                className="w-full h-12 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl font-semibold transition-all flex items-center justify-center text-sm cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
