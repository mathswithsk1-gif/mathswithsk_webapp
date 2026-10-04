"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface SquishyCardProps {
  step: string;
  title: string;
  description: string;
  buttonText: string;
  buttonHref: string;
  variant: 1 | 2 | 3;
}

export function SquishyCard({
  step,
  title,
  description,
  buttonText,
  buttonHref,
  variant,
}: SquishyCardProps) {
  // Brand color based on variant
  const bgClass =
    variant === 1
      ? "bg-primary" // Orange (#f35c2d)
      : variant === 2
      ? "bg-rose-600" // Rose (#e11d48)
      : "bg-indigo-600"; // Indigo (#4f46e5)

  return (
    <motion.div
      whileHover="hover"
      transition={{
        duration: 1,
        ease: "backInOut",
      }}
      variants={{
        hover: {
          scale: 1.05,
        },
      }}
      className={`relative h-96 w-full max-w-sm sm:w-80 shrink-0 overflow-hidden rounded-[2rem] p-8 flex flex-col justify-between shadow-xl text-white ${bgClass}`}
    >
      <div className="relative z-10">
        <span className="mb-4 inline-block w-fit rounded-full bg-white/20 px-3 py-1 text-[10px] font-extrabold text-white backdrop-blur-md border border-white/10 uppercase tracking-widest">
          Step {step}
        </span>
        
        <h3 className="my-2 text-2xl font-black tracking-tight leading-tight">
          {title}
        </h3>
        
        <p className="text-xs mt-3 text-white/90 leading-relaxed font-medium">
          {description}
        </p>
      </div>

      <div className="relative z-20 mt-auto">
        <Link
          href={buttonHref}
          className="block w-full rounded-full border border-white bg-white py-3 text-center text-xs font-black uppercase text-slate-900 transition-all duration-300 hover:bg-white/20 hover:text-white"
        >
          {buttonText}
        </Link>
      </div>

      {variant === 1 && <Background1 />}
      {variant === 2 && <Background2 />}
      {variant === 3 && <Background3 />}
    </motion.div>
  );
}

// Background for Card 1 (Circle + Ellipse)
const Background1 = () => {
  return (
    <motion.svg
      width="320"
      height="384"
      viewBox="0 0 320 384"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 z-0 pointer-events-none"
      variants={{
        hover: {
          scale: 1.15,
        },
      }}
      transition={{
        duration: 1,
        ease: "backInOut",
      }}
    >
      <motion.circle
        variants={{
          hover: {
            scaleY: 0.5,
            y: -25,
          },
        }}
        transition={{
          duration: 1,
          ease: "backInOut",
          delay: 0.2,
        }}
        cx="160.5"
        cy="114.5"
        r="101.5"
        fill="#0f172b" // cut out to dark slate background
      />
      <motion.ellipse
        variants={{
          hover: {
            scaleY: 2.25,
            y: -25,
          },
        }}
        transition={{
          duration: 1,
          ease: "backInOut",
          delay: 0.2,
        }}
        cx="160.5"
        cy="265.5"
        rx="101.5"
        ry="43.5"
        fill="#0f172b"
      />
    </motion.svg>
  );
};

// Background for Card 2 (Two Rectangles)
const Background2 = () => {
  return (
    <motion.svg
      width="320"
      height="384"
      viewBox="0 0 320 384"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 z-0 pointer-events-none"
      variants={{
        hover: {
          scale: 1.05,
        },
      }}
      transition={{
        duration: 1,
        ease: "backInOut",
      }}
    >
      <motion.rect
        x="14"
        width="153"
        height="153"
        rx="15"
        fill="#0f172b"
        variants={{
          hover: {
            y: 219,
            rotate: "90deg",
            scaleX: 2,
          },
        }}
        style={{
          y: 12,
        }}
        transition={{
          delay: 0.2,
          duration: 1,
          ease: "backInOut",
        }}
      />
      <motion.rect
        x="155"
        width="153"
        height="153"
        rx="15"
        fill="#0f172b"
        variants={{
          hover: {
            y: 12,
            rotate: "90deg",
            scaleX: 2,
          },
        }}
        style={{
          y: 219,
        }}
        transition={{
          delay: 0.2,
          duration: 1,
          ease: "backInOut",
        }}
      />
    </motion.svg>
  );
};

// Background for Card 3 (Three Diamonds)
const Background3 = () => {
  return (
    <motion.svg
      width="320"
      height="384"
      viewBox="0 0 320 384"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 z-0 pointer-events-none"
      variants={{
        hover: {
          scale: 1.25,
        },
      }}
      transition={{
        duration: 1,
        ease: "backInOut",
      }}
    >
      <motion.path
        variants={{
          hover: {
            y: -50,
          },
        }}
        transition={{
          delay: 0.3,
          duration: 1,
          ease: "backInOut",
        }}
        d="M148.893 157.531C154.751 151.673 164.249 151.673 170.107 157.531L267.393 254.818C273.251 260.676 273.251 270.173 267.393 276.031L218.75 324.674C186.027 357.397 132.973 357.397 100.25 324.674L51.6068 276.031C45.7489 270.173 45.7489 260.676 51.6068 254.818L148.893 157.531Z"
        fill="#0f172b"
      />
      <motion.path
        variants={{
          hover: {
            y: -50,
          },
        }}
        transition={{
          delay: 0.2,
          duration: 1,
          ease: "backInOut",
        }}
        d="M148.893 99.069C154.751 93.2111 164.249 93.2111 170.107 99.069L267.393 196.356C273.251 202.213 273.251 211.711 267.393 217.569L218.75 266.212C186.027 298.935 132.973 298.935 100.25 266.212L51.6068 217.569C45.7489 211.711 45.7489 202.213 51.6068 196.356L148.893 99.069Z"
        fill="#0f172b"
      />
      <motion.path
        variants={{
          hover: {
            y: -50,
          },
        }}
        transition={{
          delay: 0.1,
          duration: 1,
          ease: "backInOut",
        }}
        d="M148.893 40.6066C154.751 34.7487 164.249 34.7487 170.107 40.6066L267.393 137.893C273.251 143.751 273.251 153.249 267.393 159.106L218.75 207.75C186.027 240.473 132.973 240.473 100.25 207.75L51.6068 159.106C45.7489 153.249 45.7489 143.751 51.6068 137.893L148.893 40.6066Z"
        fill="#0f172b"
      />
    </motion.svg>
  );
};
