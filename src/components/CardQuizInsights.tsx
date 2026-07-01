"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LuCheck, LuLoader } from "react-icons/lu";

export default function CardQuizInsights({ insights }: { insights: any }) {
  const steps = [
    {
      key: "decision",
      loadingText: "🔍 Analyzing crop decision...",
      completedText: "Decision Validation",
      value: insights?.decision,
      delay: 1500,
    },
    {
      key: "expenses",
      loadingText: "💰 Calculating estimated expenses...",
      completedText: "Estimated Expenses",
      value: insights?.expenses,
      delay: 2000,
    },
    {
      key: "recommendations",
      loadingText: "💡 Generating expert recommendations...",
      completedText: "Key Recommendations",
      value: insights?.recommendations,
      delay: 2500,
    },
    {
      key: "risks",
      loadingText: "⚠️ Identifying potential risks...",
      completedText: "Potential Risks",
      value: insights?.risks,
      delay: 2000,
    }
  ];

  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState<"loading" | "done">("loading");
  const [revealed, setRevealed] = useState<number[]>([]);

  useEffect(() => {
    if (currentStep < steps.length) {
      // Phase 1: show loading text
      setStatus("loading");

      const timer = setTimeout(() => {
        // Phase 2: show actual value
        setStatus("done");

        // After a short pause, move to next step
        const nextTimer = setTimeout(() => {
          setRevealed((prev) => [...prev, currentStep]);
          setCurrentStep((prev) => prev + 1);
        }, 800);

        return () => clearTimeout(nextTimer);
      }, steps[currentStep].delay);

      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  return (
    <div className="space-y-4 font-inter">
      {steps.map((step, index) => {
        const isActive = currentStep === index;

        return (
          <div key={step.key}>
            {/* Loading text */}
            {isActive && status === "loading" && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-base font-inter text-slate-800 font-medium bg-emerald-50 px-4 py-3 flex items-center gap-2 border border-emerald-300 rounded-xl"
              >
                <LuLoader className="animate-spin inline mr-4 text-2xl text-emerald-600" />{" "}
                {step.loadingText}
              </motion.p>
            )}

            {/* Final value after reveal */}
            {(revealed.includes(index) || (isActive && status === "done")) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-start gap-3"
              >
                <div className="mt-1.5 min-w-[8px]">
                  <span className="bg-emerald-500 rounded-full w-2 h-2 inline-block"></span>
                </div>
                <div>
                  <h4 className="mb-1 text-base font-semibold font-sora text-slate-900">
                    {step.completedText}
                  </h4>
                  <p className="font-inter font-medium text-sm leading-relaxed text-slate-700">
                    {step.value}
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        );
      })}

      {/* Final message after last step */}
      {currentStep === steps.length && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="mt-6 p-5 bg-emerald-50 border-2 border-emerald-500 rounded-xl flex items-start gap-4 shadow-sm"
        >
          <LuCheck className="text-emerald-600 mt-0.5" size={35}/>
          <p className="text-sm font-inter text-slate-800 leading-relaxed">
            <span className="font-semibold font-sora text-base">Analysis Complete!</span>
            <br />
            Your personalized agronomist insights are ready. Use this information to guide your farming decisions.
          </p>
        </motion.div>
      )}
    </div>
  );
}
