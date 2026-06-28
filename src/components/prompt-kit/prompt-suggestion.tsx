import type * as React from "react";
import { cn } from "@/lib/utils";
import { type VariantProps } from "class-variance-authority";

import { Button, buttonVariants } from "./button";

export type PromptSuggestionProps = {
  children: React.ReactNode;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

function PromptSuggestion({
  children,
  variant,
  size,
  className,
  ...props
}: PromptSuggestionProps) {
  return (
    <Button
      variant={variant ?? "outline"}
      size={size ?? "sm"}
      className={cn(
        "h-auto min-h-10 max-w-full whitespace-normal rounded-full px-4 py-2 text-left type-caption font-normal",
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

export { PromptSuggestion };
