/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Star, Stethoscope, Award, ArrowRight } from "lucide-react";
import { ExpertProfile, CommunityService } from "@/lib/communityService";
import { Button } from "@/components/ui/button";

export function ExpertShowcase() {
  const [experts, setExperts] = useState<ExpertProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadExperts() {
      try {
        const data = await CommunityService.getVerifiedExperts();
        setExperts(data.slice(0, 3));
      } finally {
        setLoading(false);
      }
    }
    loadExperts();
  }, []);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight font-sora">
              Verified Agri Doctors
            </h3>
            <p className="text-[11px] text-slate-500">
              ICAR certified crop specialists
            </p>
          </div>
        </div>

        <Link
          href="/home/doctor-connect"
          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 hover:underline"
        >
          <span>All</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Expert Cards */}
      <div className="space-y-3">
        {experts.map((exp) => (
          <div
            key={exp.id}
            className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:bg-emerald-50/40 hover:border-emerald-300 transition-all flex flex-col gap-2.5"
          >
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-emerald-500/30 shrink-0 bg-slate-100">
                <Image src={exp.avatar} alt={exp.name} fill unoptimized className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <h4 className="text-xs font-black text-slate-900 truncate font-sora">
                    {exp.name}
                  </h4>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                </div>
                <p className="text-[11px] text-slate-600 truncate font-medium">
                  {exp.designation}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                  <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    <span>{exp.rating}</span>
                  </span>
                  <span>•</span>
                  <span>{exp.experience_years} yrs exp</span>
                </div>
              </div>
            </div>

            {/* Specialization Pills */}
            <div className="flex items-center gap-1 flex-wrap">
              {exp.expertise_areas.slice(0, 2).map((area, idx) => (
                <span
                  key={idx}
                  className="text-[9px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 truncate"
                >
                  {area}
                </span>
              ))}
            </div>

            {/* Direct Connect Button */}
            <Link
              href={`/home/doctor-connect/${exp.mentor_id || ""}`}
              className="w-full"
            >
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs font-bold h-8 rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
              >
                <Stethoscope className="w-3 h-3 mr-1.5" />
                <span>Consult 1-on-1</span>
              </Button>
            </Link>
          </div>
        ))}
      </div>

      {/* Advisory Banner */}
      <div className="p-3 bg-emerald-50/70 border border-emerald-200/70 rounded-2xl text-[11px] text-emerald-900 leading-snug flex items-start gap-2">
        <Award className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <p>
          Need urgent diagnosis? Verified doctors reply directly on community posts tagged with <strong>#CropDiseases</strong>.
        </p>
      </div>
    </div>
  );
}

