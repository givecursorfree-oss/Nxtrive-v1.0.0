"use client";

import { motion } from "motion/react";
import Balancer from "react-wrap-balancer";

import { BRAND_NAME } from "@/lib/brand";

const EASE = [0.16, 1, 0.3, 1] as const;

export interface AnimatedTitleFMProps {
  open: boolean;
  tagline?: string;
}

export function AnimatedTitleFM({
  open,
  tagline = "Chat with your documents. Entirely on your machine.",
}: AnimatedTitleFMProps) {
  const letters = BRAND_NAME.split("");

  return (
    <div className="pointer-events-none select-none px-6 text-center">
      <h1
        className="flex justify-center gap-[0.02em] text-5xl font-bold tracking-tight text-white md:text-7xl lg:text-8xl"
        aria-label={BRAND_NAME}
      >
        {letters.map((letter, index) => (
          <motion.span
            key={`${letter}-${index}`}
            aria-hidden
            initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
            animate={
              open
                ? { opacity: 1, y: 0, filter: "blur(0px)" }
                : { opacity: 0, y: 40, filter: "blur(8px)" }
            }
            transition={{ duration: 0.8, ease: EASE, delay: 1 + index * 0.06 }}
          >
            {letter}
          </motion.span>
        ))}
      </h1>
      <motion.p
        className="mx-auto mt-6 max-w-lg text-base text-white/65 md:text-lg"
        initial={{ opacity: 0, y: 16 }}
        animate={open ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: 1, ease: EASE, delay: 1.6 }}
      >
        <Balancer>{tagline}</Balancer>
      </motion.p>
    </div>
  );
}
