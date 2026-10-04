import React from "react";
import { cn } from "src/lib/utils";

interface SectionProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
  bg?: "white" | "muted" | "gradient" | "dark" | "glass" | "darkSlate" | "alwaysWhite";
}

export function Section({ id, className, children, bg = "white" }: SectionProps) {
  const bgClasses = {
    white: "bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50",
    muted: "bg-slate-50 text-slate-900 dark:bg-slate-900/40 dark:text-slate-50 border-y border-slate-100 dark:border-slate-900/50",
    gradient: "bg-gradient-to-b from-indigo-50/40 via-white to-white text-slate-900 dark:from-indigo-950/10 dark:via-slate-950 dark:to-slate-950 dark:text-slate-50",
    dark: "bg-slate-900 text-slate-50 dark:bg-slate-950 dark:text-slate-100 border-y border-slate-800 dark:border-slate-900",
    glass: "bg-white/50 backdrop-blur-md border border-slate-200/50 dark:bg-slate-950/30 dark:border-slate-800/50",
    darkSlate: "bg-[#0f172b] text-white border-y border-slate-800",
    alwaysWhite: "bg-white text-[#0f172b] dark:bg-white dark:text-[#0f172b]",
  };

  return (
    <section id={id} className={cn("w-full py-16 md:py-24 px-4 md:px-8", bgClasses[bg])}>
      <div className={cn("max-w-6xl mx-auto w-full transition-all duration-300", className)}>
        {children}
      </div>
    </section>
  );
}
export default Section;
