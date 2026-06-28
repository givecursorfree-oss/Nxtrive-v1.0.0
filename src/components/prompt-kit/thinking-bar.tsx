import { TextShimmer } from "@/components/prompt-kit/text-shimmer";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

type ThinkingBarProps = {
  className?: string;
  text?: string;
  onStop?: () => void;
  stopLabel?: string;
  onClick?: () => void;
};

export function ThinkingBar({
  className,
  text = "Thinking",
  onStop,
  stopLabel = "Answer now",
  onClick,
}: ThinkingBarProps) {
  return (
    <div className={cn("flex w-full items-center justify-between gap-3", className)}>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="flex min-w-0 items-center gap-1 text-sm transition-opacity hover:opacity-80"
        >
          <TextShimmer className="truncate font-medium">{text}</TextShimmer>
          <ChevronRight className="size-4 shrink-0 text-slate" aria-hidden />
        </button>
      ) : (
        <TextShimmer className="cursor-default font-medium">{text}</TextShimmer>
      )}
      {onStop ? (
        <button
          onClick={onStop}
          type="button"
          className="shrink-0 border-b border-dotted border-fog text-sm text-slate transition-colors hover:border-deep-ink hover:text-deep-ink"
        >
          {stopLabel}
        </button>
      ) : null}
    </div>
  );
}
