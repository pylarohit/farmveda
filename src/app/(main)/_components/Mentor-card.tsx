"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage, DynamicText } from "@/context/LanguageProvider";

export default function SingleCard() {
  const { t } = useLanguage();

  return (
    <div className="relative w-full max-w-[1260px] mx-auto mb-8">
      <div className="relative min-h-[210px] sm:h-52 overflow-hidden rounded-2xl border border-sky-100 shadow-sm bg-gradient-to-r from-sky-50 via-white to-sky-100 flex items-center justify-between">
        {/* Soft background glow */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-sky-200/50 rounded-full blur-3xl pointer-events-none" />

        {/* Left Side Content */}
        <div className="flex-1 px-6 sm:px-12 py-6 sm:py-8 z-20 max-w-xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sora mb-2">
            <DynamicText text="Manage All Your Bookings Here" />
          </h1>
          <p className="text-sm sm:text-base text-slate-500 font-inter mb-5 leading-snug">
            <DynamicText text="Manage all your bookings and get insights on your progress." />
          </p>

          <Link href="/home/doctor-connect/bookings">
            <Button className="bg-[#00a3ff] hover:bg-[#0092e6] text-white rounded-full font-bold px-6 py-2.5 text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer h-auto">
              <DynamicText text="View them" />
              <Eye className="w-4 h-4 ml-0.5" />
            </Button>
          </Link>
        </div>

        {/* Right Side - element3 with static7 swirl */}
        <div className="hidden md:flex relative h-full w-[45%] max-w-[460px] items-center justify-end overflow-hidden self-stretch">
          {/* Swirl background static7 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/static7.png"
              alt="Decorative Swirl"
              width={380}
              height={260}
              className="w-full h-full object-contain opacity-75 scale-110 pointer-events-none"
            />
          </div>

          {/* element3 people with laptop */}
          <div className="relative z-10 h-full flex items-end pr-4">
            <Image
              src="/element3.png"
              alt="Consultation illustration"
              width={420}
              height={210}
              className="h-[96%] w-auto object-contain object-bottom drop-shadow-sm"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
