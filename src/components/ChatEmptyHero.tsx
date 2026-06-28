"use client";

import { motion, useReducedMotion } from "motion/react";
import Balancer from "react-wrap-balancer";
import { dismissOnboardingFlow } from "../lib/onboarding-events";
import { Button } from "./ui/Button";

const EASE = [0.22, 1, 0.36, 1] as const;

interface ChatEmptyHeroProps {
  collectionLabel: string;
  showOnboarding: boolean;
  onDismissOnboarding?: () => void;
}

export function ChatEmptyHero({
  collectionLabel,
  showOnboarding,
  onDismissOnboarding,
}: ChatEmptyHeroProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="chat-empty-hero panel-enter flex w-full flex-1 flex-col items-center justify-center px-6 py-8">
      <div className="chat-empty-hero__content w-full max-w-5xl text-center">
        <motion.h2
          className="chat-empty-hero__title type-heading-lg font-semibold tracking-heading-lg text-deep-ink"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: reduceMotion ? 0 : 0.08 }}
        >
          <Balancer>What can I help with?</Balancer>
        </motion.h2>
        <motion.p
          className="mx-auto mt-3 max-w-xl type-body text-slate"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: reduceMotion ? 0 : 0.18 }}
        >
          <Balancer>
            Ask anything about <span className="font-medium text-deep-ink">{collectionLabel}</span>.
            Answers come only from what you indexed locally.
          </Balancer>
        </motion.p>

        {showOnboarding && (
          <motion.div
            className="mx-auto mt-8 w-full max-w-lg rounded-card border border-mist bg-card-white p-6 text-center shadow-subtle"
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: reduceMotion ? 0 : 0.28 }}
            role="note"
          >
            <p className="type-subheading font-semibold text-deep-ink">Ready to chat</p>
            <p className="mt-2 type-body-sm text-slate">
              Use Search to scan chunks, Think for step-by-step answers, or Citations to
              emphasize sources.
            </p>
            <Button
              variant="ghost"
              className="mt-5"
              onClick={() => {
                dismissOnboardingFlow();
                onDismissOnboarding?.();
              }}
            >
              Got it
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
