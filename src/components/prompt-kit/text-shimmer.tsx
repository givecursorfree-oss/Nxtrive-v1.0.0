import { cn } from "@/lib/utils";
import { createElement, type HTMLAttributes, type ReactNode } from "react";

export type TextShimmerProps = {
  as?: keyof React.JSX.IntrinsicElements;
  duration?: number;
  spread?: number;
  children: ReactNode;
} & HTMLAttributes<HTMLElement>;

export function TextShimmer({
  as: Tag = "span",
  className,
  duration = 4,
  spread = 20,
  children,
  style,
  ...props
}: TextShimmerProps) {
  const dynamicSpread = Math.min(Math.max(spread, 5), 45);

  return createElement(
    Tag,
    {
      className: cn(
        "bg-size-[200%_auto] bg-clip-text font-medium text-transparent",
        "animate-shimmer",
        className,
      ),
      style: {
        backgroundImage: `linear-gradient(to right, var(--color-slate) ${50 - dynamicSpread}%, var(--color-deep-ink) 50%, var(--color-slate) ${50 + dynamicSpread}%)`,
        animationDuration: `${duration}s`,
        ...style,
      },
      ...props,
    },
    children,
  );
}
