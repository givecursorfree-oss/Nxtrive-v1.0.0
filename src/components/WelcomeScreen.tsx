import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { BrandLogoLockup } from "@/components/BrandLogo";
import GlowHorizonFM from "@/components/ui/glow-horizon";
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button";
import { BRAND_NAME, BRAND_PRODUCT_LINE } from "@/lib/brand";

const EASE = [0.16, 1, 0.3, 1] as const;
const EXIT_DURATION = 0.85;

interface WelcomeScreenProps {
  onEnterStart: () => void;
  onEnterComplete: () => void;
}

export function WelcomeScreen({ onEnterStart, onEnterComplete }: WelcomeScreenProps) {
  const reduceMotion = useReducedMotion();
  const [exiting, setExiting] = useState(false);
  const open = !exiting;

  const beginExit = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    onEnterStart();
    if (reduceMotion) {
      onEnterComplete();
    }
  }, [exiting, onEnterStart, onEnterComplete, reduceMotion]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        beginExit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [beginExit]);

  return (
    <motion.div
      className="fixed inset-0 z-[300] overflow-hidden"
      style={{ background: "#050507" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-brand-title"
      aria-describedby="welcome-brand-tagline"
      initial={false}
      animate={
        exiting && !reduceMotion
          ? { opacity: 0, scale: 1.03, y: -28, filter: "blur(14px)" }
          : { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }
      }
      transition={{ duration: EXIT_DURATION, ease: EASE }}
      onAnimationComplete={() => {
        if (exiting && !reduceMotion) onEnterComplete();
      }}
    >
      <GlowHorizonFM variant="top" />

      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center px-6"
        animate={
          exiting && !reduceMotion
            ? { opacity: 0, y: -16, filter: "blur(6px)" }
            : { opacity: 1, y: 0, filter: "blur(0px)" }
        }
        transition={{ duration: EXIT_DURATION * 0.7, ease: EASE }}
      >
        <motion.h1
          id="welcome-brand-title"
          className="flex w-full max-w-2xl flex-col items-center"
          initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.94 }}
          animate={
            open
              ? { opacity: 1, y: 0, scale: 1 }
              : { opacity: 0, y: 28, scale: 0.94 }
          }
          transition={{ duration: 0.9, ease: EASE, delay: reduceMotion ? 0 : 0.35 }}
        >
          <motion.span
            className="mb-4 text-center text-sm font-medium tracking-[0.22em] text-white/85 sm:mb-5 sm:text-base"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={open ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.75, ease: EASE, delay: reduceMotion ? 0 : 0.2 }}
          >
            Welcome to
          </motion.span>
          <BrandLogoLockup
            className="h-auto w-full max-w-[min(100%,22rem)] sm:max-w-md md:max-w-lg"
            priority
          />
        </motion.h1>

        <p id="welcome-brand-tagline" className="sr-only">
          Welcome to {BRAND_NAME}. {BRAND_PRODUCT_LINE}.
        </p>
      </motion.div>

      <motion.footer
        className="absolute inset-x-0 bottom-0 z-10 flex justify-center px-6 pb-12 pt-6"
        animate={exiting && !reduceMotion ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
        transition={{ duration: EXIT_DURATION * 0.55, ease: EASE }}
      >
        <LiquidMetalButton
          label="Enter"
          disabled={exiting}
          onClick={beginExit}
        />
      </motion.footer>
    </motion.div>
  );
}
