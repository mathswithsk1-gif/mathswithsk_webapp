"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Testimonial {
  text: string;
  name: string;
  role: string;
  initials: string;
}

const testimonials: Testimonial[] = [
  {
    text: "We were very worried about our son's P1 grades. After registering for SK's Quadratic equations course and completing the unlocking chain, his concepts became crystal clear. He ended up getting an A in his AS level!",
    name: "Aisha Malik",
    role: "Parent, Lahore",
    initials: "AM",
  },
  {
    text: "The anti-skip system in the course portal actually helped me focus. In normal courses, I skip ahead and miss foundational details. SK's lectures are structured so well that unlocking the next video felt like a game reward.",
    name: "Zain Khan",
    role: "A-Level Student, Karachi",
    initials: "ZK",
  },
  {
    text: "I got an A* in my CIE A-Level Maths! The topical exercises and step-by-step video solutions were life-savers. SK's teaching style builds pure mathematical intuition.",
    name: "Hamza Yousaf",
    role: "A-Level Student, Islamabad",
    initials: "HY",
  },
  {
    text: "Highly recommended. The progression locks keep the kids disciplined. SK's lectures are incredibly detailed and make the hardest calculus problems seem simple.",
    name: "Sarah Ahmed",
    role: "Parent, Rawalpindi",
    initials: "SA",
  },
];

export function TestimonialCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startAutoplay = () => {
    stopAutoplay();
    autoplayTimerRef.current = setInterval(() => {
      handleNext();
    }, 4000);
  };

  const stopAutoplay = () => {
    if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!isHovered) {
      startAutoplay();
    } else {
      stopAutoplay();
    }
    return () => stopAutoplay();
  }, [isHovered, currentIndex]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  return (
    <div
      className="relative w-full max-w-3xl mx-auto px-4 py-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden rounded-3xl min-h-[220px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="w-full bg-[#0f172b]/5 backdrop-blur-md border border-[#0f172b]/10 shadow-xl shadow-[#0f172b]/5 p-8 rounded-3xl flex flex-col justify-between"
          >
            <div>
              <MessageSquare className="w-8 h-8 text-primary/40 mb-4" />
              <p className="text-sm md:text-base text-[#0f172b] italic leading-relaxed">
                "{testimonials[currentIndex].text}"
              </p>
            </div>
            
            <div className="mt-8 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-black text-sm text-primary shadow-inner">
                {testimonials[currentIndex].initials}
              </div>
              <div>
                <span className="block font-black text-[#0f172b] text-sm md:text-base">
                  {testimonials[currentIndex].name}
                </span>
                <span className="block text-[10px] md:text-xs text-[#0f172b]/70 font-semibold mt-0.5">
                  {testimonials[currentIndex].role}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Controls */}
      <div className="flex justify-between items-center mt-6">
        <div className="flex gap-1.5">
          {testimonials.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                idx === currentIndex ? "bg-primary w-6" : "bg-[#0f172b]/20 hover:bg-[#0f172b]/40"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handlePrev}
            className="p-2.5 rounded-full bg-[#0f172b]/5 border border-[#0f172b]/10 text-[#0f172b] hover:bg-[#0f172b]/10 transition-colors cursor-pointer"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="p-2.5 rounded-full bg-[#0f172b]/5 border border-[#0f172b]/10 text-[#0f172b] hover:bg-[#0f172b]/10 transition-colors cursor-pointer"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

