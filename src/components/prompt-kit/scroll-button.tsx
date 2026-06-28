import type * as React from "react";
import { cn } from "@/lib/utils";
import { type VariantProps } from "class-variance-authority";
import { ChevronDown } from "lucide-react";
import { useStickToBottomContext } from "use-stick-to-bottom";

import { Button, buttonVariants } from "./button";

export type ScrollButtonProps = {
  className?: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

function ScrollButton({
  className,
  variant = "outline",
  size = "icon",
  ...props
}: ScrollButtonProps) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      aria-label="Scroll to latest messages"
      className={cn(
        "h-11 w-11 rounded-full shadow-subtle-3 transition-all duration-200 ease-out",
        !isAtBottom
          ? "translate-y-0 scale-100 opacity-100"
          : "pointer-events-none translate-y-3 scale-95 opacity-0",
        className,
      )}
      onClick={() => scrollToBottom()}
      {...props}
    >
      <ChevronDown className="h-6 w-6" aria-hidden />
    </Button>
  );
}

export { ScrollButton };
