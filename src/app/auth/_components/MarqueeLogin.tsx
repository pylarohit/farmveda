"use client"

import React from "react"

const testimonials = [
  {
    name: "Ramesh Kumar",
    role: "Farmer (Karnataka)",
    text: "Farmveda has helped me improve my crop yield through direct mentor guidance.",
    avatar: "🌾",
  },
  {
    name: "Dr. Anjali Patil",
    role: "Agricultural Scientist",
    text: "Guiding enthusiastic farmers and seeing them implement scientific methods is rewarding.",
    avatar: "🔬",
  },
  {
    name: "Suresh Hegde",
    role: "Farmer (Maharashtra)",
    text: "The direct market connections changed our cooperative's income entirely.",
    avatar: "🚜",
  },
  {
    name: "Priya Sharma",
    role: "Agritech Investor",
    text: "A beautiful bridge between technology and grassroots agricultural communities.",
    avatar: "👩‍🌾",
  },
  {
    name: "Vikram Reddy",
    role: "Mentor (Soil Health)",
    text: "Helping farmers test soil and optimize fertilizers has been incredibly satisfying.",
    avatar: "🌱",
  },
]

export function MarqueeDemo() {
  return (
    <div className="relative flex w-full flex-col items-center justify-center overflow-hidden rounded-xl py-4 bg-transparent select-none">
      <div className="flex w-max animate-marquee gap-4">
        {/* First set */}
        {testimonials.map((t, idx) => (
          <div
            key={idx}
            className="w-72 shrink-0 rounded-xl border border-emerald-100/80 bg-white/90 p-4 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:shadow-md hover:border-emerald-200"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-lg">
                {t.avatar}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-800">{t.name}</h4>
                <p className="text-[10px] font-medium text-emerald-600">{t.role}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-600 line-clamp-2 italic leading-relaxed">
              "{t.text}"
            </p>
          </div>
        ))}
        {/* Duplicate set for seamless loop */}
        {testimonials.map((t, idx) => (
          <div
            key={`dup-${idx}`}
            className="w-72 shrink-0 rounded-xl border border-emerald-100/80 bg-white/90 p-4 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:shadow-md hover:border-emerald-200"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-lg">
                {t.avatar}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-800">{t.name}</h4>
                <p className="text-[10px] font-medium text-emerald-600">{t.role}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-600 line-clamp-2 italic leading-relaxed">
              "{t.text}"
            </p>
          </div>
        ))}
      </div>
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}
