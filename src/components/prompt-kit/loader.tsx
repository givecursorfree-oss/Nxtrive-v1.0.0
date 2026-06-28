import { cn } from "@/lib/utils";

export function TextShimmerLoader({
  text = "Thinking",
  className,
  size = "md",
}: {
  text?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div
      className={cn(
        "bg-size-[200%_auto] bg-clip-text font-medium text-transparent animate-shimmer",
        textSizes[size],
        className,
      )}
      style={{
        backgroundImage:
          "linear-gradient(to right, var(--color-slate) 30%, var(--color-deep-ink) 50%, var(--color-slate) 70%)",
        animationDuration: "4s",
      }}
    >
      {text}
    </div>
  );
}
