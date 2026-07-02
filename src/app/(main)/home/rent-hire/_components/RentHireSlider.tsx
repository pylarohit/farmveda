"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const RentHireSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const cards = [
    {
      id: 1,
      title: "Hire Skilled Farm Labor",
      description: "Find experienced farm hands, agronomists, and harvesters available for hire in your local community.",
      accent: "border-blue-500",
      gradient: "from-blue-300 to-indigo-400",
      textAccent: "text-blue-600",
      buttonGradient: "from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700",
      image: "/farmer1.jpg",
      buttonText: "Hire Now"
    },
    {
      id: 2,
      title: "Rent Premium Equipment",
      description: "Access heavy machinery, tractors, and specialized farming tools without the burden of ownership.",
      accent: "border-[#D3F36B]",
      gradient: "from-[#D3F36B] to-emerald-400",
      textAccent: "text-emerald-600",
      buttonGradient: "from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700",
      image: "/rent.jpg",
      buttonText: "Rent Now"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % cards.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [cards.length]);

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % cards.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div className="relative w-full group select-none">
      <div className="relative h-52 overflow-hidden rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] bg-white dark:bg-[#0A0E1A] transition-all duration-300">

        <button
          onClick={handlePrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-white/90 hover:bg-white border border-slate-200/60 shadow-md flex items-center justify-center text-slate-700 hover:text-slate-900 transition-all opacity-0 group-hover:opacity-100 hover:scale-105 cursor-pointer"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-white/90 hover:bg-white border border-slate-200/60 shadow-md flex items-center justify-center text-slate-700 hover:text-slate-900 transition-all opacity-0 group-hover:opacity-100 hover:scale-105 cursor-pointer"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          className="flex transition-transform duration-700 ease-in-out h-full"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {cards.map((card) => (
            <div
              key={card.id}
              className="min-w-full h-full flex flex-col md:flex-row items-center relative overflow-hidden"
            >
              <div
                className={`absolute -top-14 -left-5 bg-gradient-to-r ${card.gradient} opacity-25 blur-2xl w-36 h-48 rounded-full`}
              />

              <div className="flex-1 px-8 md:px-12 py-8 md:py-10 z-10">
                <div className="max-w-md text-left flex flex-col items-start">
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2.5 font-sora leading-snug">
                    {card.title}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-inter mb-6 leading-relaxed font-medium">
                    {card.description}
                  </p>
                  <Button
                    className={`bg-gradient-to-r ${card.buttonGradient} text-white text-xs px-6 py-3 rounded-full font-bold transition-all duration-300 shadow-md cursor-pointer hover:shadow-lg flex items-center gap-1.5`}
                  >
                    <span>{card.buttonText}</span>
                    <ArrowRight
                      size={16}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </Button>
                </div>
              </div>

              <div className="hidden md:flex flex-1 h-full relative overflow-hidden group/image">
                <div className="absolute inset-y-0 -left-6 w-12 bg-white dark:bg-[#0A0E1A] transform -skew-x-6 z-10 transition-colors" />
                <Image
                  src={card.image}
                  alt={card.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className={`absolute inset-0 z-0 transition-transform duration-700 ease-out object-cover`}
                  priority={true}
                />
                <div className="absolute bottom-6 right-8 z-20">
                  <span className={`text-6xl font-black tracking-tighter ${card.textAccent} opacity-10 select-none`}>
                    0{card.id}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center mt-6 space-x-2">
        {cards.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`transition-all duration-300 cursor-pointer ${index === currentSlide
              ? "w-8 h-2 bg-blue-600 rounded-full"
              : "w-2 h-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-full"
              }`}
          />
        ))}
      </div>
    </div>
  );
};

export default RentHireSlider;
