"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type ComposerBloomPhase = "idle" | "focus" | "streaming" | "complete";

interface ComposerBloomProps {
  phase: ComposerBloomPhase;
  className?: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;

interface OrbProps {
  className: string;
  reduceMotion: boolean | null;
  active: boolean;
  animate: {
    x: number[];
    y: number[];
    scaleX: number[];
    scaleY: number[];
    opacity: number[];
  };
  duration?: number;
}

function BloomOrb({ className, reduceMotion, active, animate, duration = 4 }: OrbProps) {
  if (!active) return null;

  return (
    <motion.div
      className={cn("composer-bloom__orb", className)}
      initial={false}
      animate={
        reduceMotion
          ? { opacity: animate.opacity[0] ?? 0.5 }
          : {
              x: animate.x,
              y: animate.y,
              scaleX: animate.scaleX,
              scaleY: animate.scaleY,
              opacity: animate.opacity,
            }
      }
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              duration,
              ease: EASE,
              repeat: Infinity,
              repeatType: "mirror",
            }
      }
    />
  );
}

export function ComposerBloom({ phase, className }: ComposerBloomProps) {
  const reduceMotion = useReducedMotion();
  const streaming = phase === "streaming";
  const focus = phase === "focus";
  const complete = phase === "complete";
  const intense = streaming || complete;

  return (
    <div
      className={cn("composer-bloom", `composer-bloom--${phase}`, className)}
      aria-hidden="true"
    >
      <div className="composer-bloom__floor" />

      <BloomOrb
        className="composer-bloom__orb--indigo"
        reduceMotion={reduceMotion}
        active
        duration={streaming ? 3.6 : focus ? 5.2 : 8}
        animate={{
          x: streaming ? [-18, 10, -12] : focus ? [-8, 6, -6] : [-4, 4, -3],
          y: streaming ? [0, -6, 2] : [0, -3, 0],
          scaleX: streaming ? [1, 1.08, 0.98] : [0.98, 1.02, 1],
          scaleY: streaming ? [1, 1.12, 0.96] : [0.96, 1.04, 1],
          opacity: streaming ? [0.52, 0.68, 0.56] : focus ? [0.38, 0.5, 0.42] : [0.28, 0.36, 0.3],
        }}
      />

      <BloomOrb
        className="composer-bloom__orb--sky"
        reduceMotion={reduceMotion}
        active
        duration={streaming ? 3.1 : focus ? 4.8 : 7}
        animate={{
          x: streaming ? [6, -8, 12] : focus ? [4, -4, 4] : [2, -2, 2],
          y: streaming ? [-4, -10, -2] : focus ? [-2, -5, -2] : [0, -2, 0],
          scaleX: streaming ? [1.02, 1.14, 1] : [1, 1.05, 1],
          scaleY: streaming ? [1.05, 1.22, 1.02] : [1, 1.08, 1],
          opacity: streaming ? [0.48, 0.64, 0.52] : focus ? [0.34, 0.46, 0.38] : [0.22, 0.3, 0.26],
        }}
      />

      <BloomOrb
        className="composer-bloom__orb--warm"
        reduceMotion={reduceMotion}
        active={intense || focus}
        duration={streaming ? 2.8 : 4.2}
        animate={{
          x: streaming ? [14, -6, 18] : [8, -4, 10],
          y: streaming ? [-8, -14, -6] : [-4, -8, -4],
          scaleX: streaming ? [0.92, 1.18, 0.96] : [0.94, 1.08, 0.98],
          scaleY: streaming ? [1, 1.28, 1.04] : [0.98, 1.12, 1],
          opacity: streaming ? [0.42, 0.58, 0.46] : [0.28, 0.38, 0.32],
        }}
      />

      <BloomOrb
        className="composer-bloom__orb--teal"
        reduceMotion={reduceMotion}
        active
        duration={streaming ? 3.4 : focus ? 5 : 7.5}
        animate={{
          x: streaming ? [-10, 14, -16] : focus ? [-6, 8, -8] : [-3, 5, -4],
          y: streaming ? [2, -4, 0] : [0, -2, 0],
          scaleX: streaming ? [1, 1.1, 0.98] : [0.98, 1.04, 1],
          scaleY: streaming ? [0.98, 1.1, 1] : [0.96, 1.02, 0.98],
          opacity: streaming ? [0.4, 0.56, 0.44] : focus ? [0.3, 0.42, 0.34] : [0.2, 0.28, 0.24],
        }}
      />

      <BloomOrb
        className="composer-bloom__orb--cyan"
        reduceMotion={reduceMotion}
        active={intense}
        duration={streaming ? 2.4 : 3.2}
        animate={{
          x: streaming ? [0, 8, -6] : [0, 4, 0],
          y: streaming ? [-6, -12, -4] : [-2, -6, -2],
          scaleX: streaming ? [0.88, 1.06, 0.92] : [0.9, 1, 0.94],
          scaleY: streaming ? [0.9, 1.16, 0.94] : [0.92, 1.04, 0.96],
          opacity: streaming ? [0.36, 0.5, 0.4] : [0.24, 0.34, 0.28],
        }}
      />

      {streaming && (
        <motion.div
          className="composer-bloom__streak"
          initial={reduceMotion ? false : { opacity: 0.3, scaleX: 0.92 }}
          animate={
            reduceMotion
              ? { opacity: 0.45 }
              : {
                  opacity: [0.34, 0.58, 0.38],
                  scaleX: [0.94, 1.08, 0.96],
                  x: ["-8%", "6%", "-4%"],
                }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 2.6, ease: EASE, repeat: Infinity, repeatType: "mirror" }
          }
        />
      )}

      {complete && (
        <motion.div
          className="composer-bloom__flash"
          initial={{ opacity: 0.7, scale: 1.04 }}
          animate={{ opacity: 0, scale: 1 }}
          transition={{ duration: 1.6, ease: EASE }}
        />
      )}
    </div>
  );
}
