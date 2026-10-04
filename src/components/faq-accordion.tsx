"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FAQItem {
  q: string;
  a: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="w-full max-w-3xl space-y-4">
      {items.map((faq, idx) => {
        const isOpen = openIndex === idx;
        
        return (
          <div
            key={idx}
            onClick={() => toggleItem(idx)}
            className="bg-[#0f172a]/60 hover:bg-[#0f172a]/90 dark:bg-slate-900/30 dark:hover:bg-slate-900/50 p-6 rounded-2xl border border-slate-800/80 shadow-sm transition-all duration-200 text-white cursor-pointer select-none"
          >
            {/* Header / Question row */}
            <div className="flex justify-between items-center gap-4 w-full">
              <h3 className="font-bold text-white text-sm md:text-base tracking-wide leading-relaxed">
                {faq.q}
              </h3>
              <motion.div
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="text-slate-400 dark:text-slate-500 shrink-0"
              >
                <Plus className="w-5 h-5 stroke-[2]" />
              </motion.div>
            </div>

            {/* Expandable Answer row */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <p className="mt-4 text-xs md:text-sm text-slate-300 leading-relaxed pr-6">
                    {faq.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
