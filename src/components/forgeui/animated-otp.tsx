"use client";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import React, { useEffect, useRef, useState } from "react";

type AnimatedOTPProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
};

export default function AnimatedOTP({
  value,
  onChange,
  length = 6,
  disabled = false,
}: AnimatedOTPProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    if (val.length <= length) {
      onChange(val);
    }
  };

  const handleContainerClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      {/* Hidden input for capturing keystrokes */}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={length}
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        className="sr-only"
        autoFocus
      />

      <div
        onClick={handleContainerClick}
        className={cn(
          "flex w-full items-center justify-center gap-3 cursor-pointer",
          disabled && "opacity-60 cursor-not-allowed"
        )}
      >
        {Array.from({ length }).map((_, idx) => {
          const char = value[idx] || "";
          const isActive = isFocused && value.length === idx;

          return (
            <div
              key={idx}
              className={cn(
                "relative flex h-12 w-10 items-center justify-center rounded-xl border bg-white dark:bg-neutral-800 transition-all",
                isActive 
                  ? "border-[#009662] ring-2 ring-emerald-100 dark:border-emerald-500" 
                  : "border-neutral-200 dark:border-neutral-700",
                "shadow-[0_1px_2px_rgb(0,0,0,0.05)]",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="glow"
                  className="absolute inset-0 rounded-xl border border-[#009662] dark:border-emerald-500"
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                  style={{
                    boxShadow: "0 0 8px rgba(0, 150, 98, 0.3)",
                  }}
                >
                  {/* Blinking cursor line */}
                  <motion.div
                    className="absolute left-1/2 top-1/3 -translate-x-1/2 w-[2px] h-1/3 bg-[#009662]"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  />
                </motion.div>
              )}

              <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {char}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
