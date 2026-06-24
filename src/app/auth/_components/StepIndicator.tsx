"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS = [
    { number: 1, label: "Profile" },
    { number: 2, label: "Address" },
    { number: 3, label: "Review"  },
];

interface StepIndicatorProps {
    current: number;
    onStepClick?: (step: number) => void;
}

export function StepIndicator({ current, onStepClick }: StepIndicatorProps) {
    return (
        <div className="flex items-center w-full">
            {STEPS.map((s, idx) => {
                const done   = current > s.number;
                const active = current === s.number;

                return (
                    <div key={s.number} className="flex items-center flex-1 last:flex-none">
                        {/* Circle */}
                        <button
                            type="button"
                            onClick={() => done && onStepClick?.(s.number)}
                            className={cn(
                                "flex flex-col items-center gap-1.5 group shrink-0",
                                done ? "cursor-pointer" : "cursor-default"
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-200",
                                done   ? "bg-emerald-600 border-emerald-600 text-white"
                                : active ? "bg-white border-emerald-600 text-emerald-600 ring-4 ring-emerald-100"
                                         : "bg-white border-slate-200 text-slate-400"
                            )}>
                                {done ? <Check className="h-3.5 w-3.5" /> : s.number}
                            </div>
                            <span className={cn(
                                "text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap",
                                active ? "text-emerald-600"
                                : done  ? "text-emerald-500"
                                        : "text-slate-400"
                            )}>
                                {s.label}
                            </span>
                        </button>

                        {/* Connector */}
                        {idx < STEPS.length - 1 && (
                            <div className="relative flex-1 mx-2 mb-5">
                                <div className="h-[2px] w-full bg-slate-100 rounded-full" />
                                <div
                                    className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full transition-all duration-500"
                                    style={{ width: current > s.number ? "100%" : "0%" }}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
