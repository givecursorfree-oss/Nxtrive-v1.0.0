"use client";

import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "../lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

interface ChatExampleSuggestionsProps {
  prompts: readonly string[];
  onSelect: (prompt: string) => void;
  className?: string;
}

export function ChatExampleSuggestions({
  prompts,
  onSelect,
  className,
}: ChatExampleSuggestionsProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn("chat-example-suggestions", className)}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE, delay: reduceMotion ? 0 : 0.22 }}
      aria-label="Example queries"
    >
      <p className="chat-example-suggestions__label type-label font-semibold text-deep-ink">
        Examples of queries
      </p>
      <ul className="chat-example-suggestions__list" role="list">
        {prompts.map((prompt, index) => (
          <motion.li
            key={prompt}
            initial={reduceMotion ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.4,
              ease: EASE,
              delay: reduceMotion ? 0 : 0.28 + index * 0.07,
            }}
          >
            <button
              type="button"
              className="chat-example-suggestions__pill"
              onClick={() => onSelect(prompt)}
            >
              <span className="min-w-0 flex-1 text-left">{prompt}</span>
              <ChevronRightIcon className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
            </button>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
