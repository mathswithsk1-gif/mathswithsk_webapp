"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, X, BookOpen, User } from "lucide-react";
import { createClient } from "src/lib/supabase";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  const [activeSection, setActiveSection] = useState("");
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const linkRefs = useRef<{ [key: string]: HTMLAnchorElement | null }>({});

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => {
        setUser(data?.session?.user ?? null);
      })
      .catch((err) => {
        // Silently ignore session fetch errors when offline/paused
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Intersection Observer for scroll-spying
  useEffect(() => {
    const sections = ["courses", "about", "how-it-works", "faq"];
    const observers = sections.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id);
          }
        },
        {
          rootMargin: "-45% 0px -45% 0px", // triggers when section is in middle of screen
        }
      );
      observer.observe(el);
      return { observer, el };
    });

    return () => {
      observers.forEach((obs) => {
        if (obs) obs.observer.unobserve(obs.el);
      });
    };
  }, []);

  // Update sliding pill styling when active section changes
  useEffect(() => {
    const activeRef = linkRefs.current[activeSection];
    if (activeRef) {
      const { offsetLeft, offsetWidth } = activeRef;
      setPillStyle({ left: offsetLeft, width: offsetWidth, opacity: 1 });
    } else {
      setPillStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [activeSection]);

  return (
    <nav className="sticky top-0 z-50 bg-white/45 backdrop-blur-md border-b border-slate-100/35 dark:bg-slate-950/20 dark:border-slate-900/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo Brand */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-2.5 font-black text-lg text-slate-900 tracking-tight dark:text-white">
              <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-xs shadow-sm shadow-primary/45">SK</span>
              <span>Maths with SK</span>
            </Link>
          </div>

          {/* Desktop Nav: Centered Pill Menu */}
          <div className="hidden md:flex items-center justify-center flex-grow">
            <div className="relative rounded-full border border-slate-200/50 bg-white/80 dark:border-slate-800/60 dark:bg-slate-900/80 px-1 py-1 flex items-center shadow-xs gap-0.5">
              
              {/* Sliding Highlight Pill */}
              <div
                className="absolute bg-slate-950 dark:bg-white rounded-full transition-all duration-300 ease-out pointer-events-none"
                style={{
                  left: `${pillStyle.left}px`,
                  width: `${pillStyle.width}px`,
                  height: "calc(100% - 8px)",
                  opacity: pillStyle.opacity,
                  top: "4px"
                }}
              />

              <Link
                ref={(el) => { linkRefs.current["courses"] = el; }}
                href="/#courses"
                className={`relative z-10 text-xs font-bold px-4 py-1.5 rounded-full transition-colors duration-300 ${
                  activeSection === "courses" ? "text-white dark:text-slate-950" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Courses
              </Link>
              <Link
                ref={(el) => { linkRefs.current["about"] = el; }}
                href="/#about"
                className={`relative z-10 text-xs font-bold px-4 py-1.5 rounded-full transition-colors duration-300 ${
                  activeSection === "about" ? "text-white dark:text-slate-950" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                About SK
              </Link>
              <Link
                ref={(el) => { linkRefs.current["how-it-works"] = el; }}
                href="/#how-it-works"
                className={`relative z-10 text-xs font-bold px-4 py-1.5 rounded-full transition-colors duration-300 ${
                  activeSection === "how-it-works" ? "text-white dark:text-slate-950" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                How It Works
              </Link>
              <Link
                ref={(el) => { linkRefs.current["faq"] = el; }}
                href="/#faq"
                className={`relative z-10 text-xs font-bold px-4 py-1.5 rounded-full transition-colors duration-300 ${
                  activeSection === "faq" ? "text-white dark:text-slate-950" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                FAQ
              </Link>
              <Link
                ref={(el) => { linkRefs.current["blog"] = el; }}
                href="/blog"
                className={`relative z-10 text-xs font-bold px-4 py-1.5 rounded-full transition-colors duration-300 ${
                  activeSection === "blog" ? "text-white dark:text-slate-950" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Blog
              </Link>
            </div>
          </div>

          {/* Right side CTA Button (Orange Pill) */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <Link
                href="/portal"
                className="bg-primary hover:bg-primary/95 text-white font-bold text-xs px-5 py-2.5 rounded-full transition-all shadow-md shadow-primary/20 hover:scale-[1.02] inline-flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span>Student Portal</span>
              </Link>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  href="/portal"
                  className="text-xs font-bold text-slate-655 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/#courses"
                  className="bg-primary hover:bg-primary/95 text-white font-bold text-xs px-5 py-2.5 rounded-full transition-all shadow-md shadow-primary/20 hover:scale-[1.02]"
                >
                  Join Course
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-500 hover:text-slate-600 hover:bg-slate-105 dark:text-slate-400 dark:hover:bg-slate-900 transition-colors"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 pt-2 pb-4 space-y-1 sm:px-3">
          <Link
            href="/#courses"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-primary hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            Courses
          </Link>
          <Link
            href="/#about"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-primary hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            About SK
          </Link>
          <Link
            href="/#how-it-works"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-primary hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            How It Works
          </Link>
          <Link
            href="/#faq"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-primary hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            FAQ
          </Link>
          <Link
            href="/blog"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-primary hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            Blog
          </Link>
          
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2 px-3">
            {user ? (
              <Link
                href="/portal"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-full text-sm font-semibold shadow-md"
              >
                <User className="w-4 h-4" />
                <span>Student Portal</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/portal"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center text-slate-700 dark:text-slate-300 py-2 rounded-full text-sm font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                >
                  Sign In
                </Link>
                <Link
                  href="/#courses"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center bg-primary text-white py-2.5 rounded-full text-sm font-semibold shadow-md"
                >
                  Join Now
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
export default Navbar;
