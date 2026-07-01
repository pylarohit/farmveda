"use client";

import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const SlidingCards = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const cards = [
    {
      id: 1,
      tag: "AI Roadmap",
      title: "Grow Smarter. Harvest Better.",
      description:
        "Get a personalized AI roadmap that guides you from planning to harvest with daily tasks, reminders, and progress tracking.",
      accent: "border-blue-500",
      gradient: "from-blue-300 to-indigo-400",
      textAccent: "text-blue-600",
      tagColor: "bg-blue-50 text-blue-600 border-blue-100",
      buttonGradient: "from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700",
      image: "/adv1.jpg",
    },
    {
      id: 2,
      tag: "Disease Detection",
      title: "Protect Your Crops Before It's Too Late",
      description:
        "Upload a crop photo to instantly detect diseases and receive AI-powered treatment and prevention recommendations.",
      accent: "border-purple-500",
      gradient: "from-purple-300 to-pink-400",
      textAccent: "text-purple-600",
      tagColor: "bg-purple-50 text-purple-600 border-purple-100",
      buttonGradient: "from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700",
      image: "/adv2.png",
    },
    {
      id: 3,
      tag: "Rent & Hire",
      title: "Everything Your Farm Needs, Nearby",
      description:
        "Rent equipment, hire farm workers, lease land, and connect with trusted farmers in your local community.",
      accent: "border-emerald-500",
      gradient: "from-emerald-300 to-teal-400",
      textAccent: "text-emerald-600",
      tagColor: "bg-emerald-50 text-emerald-600 border-emerald-100",
      buttonGradient: "from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700",
      image: "/adv3.jpg",
    },
    {
      id: 4,
      tag: "Direct Sales",
      title: "Reach Buyers Without Middlemen",
      description:
        "Sell your harvest directly to consumers and businesses, get better prices, and maximize your profits.",
      accent: "border-rose-500",
      gradient: "from-rose-300 to-red-400",
      textAccent: "text-rose-600",
      tagColor: "bg-rose-50 text-rose-600 border-rose-100",
      buttonGradient: "from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700",
      image: "/adv4.png",
    },
  ];

  // Auto-slide functionality every 6 seconds
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
    <div className="relative w-full p-4 pl-0 group select-none">

      {/* Main Card Container */}
      <div className="relative h-64 overflow-hidden rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] bg-white transition-all duration-300">

        {/* Navigation Arrows (Visible on Hover) */}
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

        {/* Carousel Tracks */}
        <div
          className="flex transition-transform duration-700 ease-in-out h-full"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {cards.map((card) => (
            <div
              key={card.id}
              className="min-w-full h-full flex flex-col md:flex-row items-center relative overflow-hidden"
            >

              {/* Background Accent Glow */}
              <div
                className={`absolute -top-14 -left-5 bg-gradient-to-r ${card.gradient} opacity-25 blur-2xl w-36 h-48 rounded-full`}
              />

              {/* Left Side - Content */}
              <div className="flex-1 px-8 md:px-12 py-8 md:py-10 z-10">
                <div className="max-w-md text-left flex flex-col items-start">



                  {/* Title */}
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mb-2.5 font-sora leading-snug">
                    {card.title}
                  </h2>

                  {/* Description */}
                  <p className="text-xs md:text-sm text-slate-600 font-inter mb-6 leading-relaxed font-medium">
                    {card.description}
                  </p>

                  {/* CTA Button */}
                  <Button
                    className={`bg-gradient-to-r ${card.buttonGradient} text-white text-xs px-5 py-2.5 rounded-full font-bold transition-all duration-300 shadow-md cursor-pointer hover:shadow-lg flex items-center gap-1.5`}
                  >
                    <span>Get Started</span>
                    <ArrowRight
                      size={14}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </Button>
                </div>
              </div>

              {/* Right Side - Visual Element */}
              <div className="hidden md:flex flex-1 h-full relative overflow-hidden group/image">

                {/* Curved visual separator */}
                <div className="absolute inset-y-0 -left-6 w-12 bg-white transform -skew-x-6 z-10" />

                {/* Cover Image */}
                <Image
                  src={card.image}
                  alt={card.title}
                  width={400}
                  height={256}
                  className="absolute inset-0 w-full h-full object-cover z-0 transition-transform duration-700 ease-out group-hover/image:scale-105"
                  priority={true}
                />

                {/* Card ID indicator */}
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

      {/* Slide Indicators */}
      <div className="flex justify-center mt-6 space-x-2">
        {cards.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`transition-all duration-300 cursor-pointer ${index === currentSlide
                ? "w-8 h-2 bg-blue-600 rounded-full"
                : "w-2 h-2 bg-slate-200 hover:bg-slate-300 rounded-full"
              }`}
          />
        ))}
      </div>

    </div>
  );
};

export default SlidingCards;
