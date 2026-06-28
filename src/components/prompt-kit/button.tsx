import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-button text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-deep-indigo/30 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:h-6 [&_svg]:w-6 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-deep-indigo text-white shadow-subtle hover:bg-midnight-teal",
        outline:
          "border border-mist bg-card-white text-deep-ink shadow-subtle-2 hover:border-fog hover:bg-paper-white",
        secondary: "bg-paper-white text-deep-ink hover:bg-mist/40",
        ghost: "text-slate hover:bg-paper-white hover:text-deep-ink",
        link: "text-deep-indigo underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 min-h-10 px-4 py-2",
        sm: "h-9 min-h-9 rounded-button px-3 text-xs",
        lg: "h-11 min-h-11 rounded-button px-6",
        icon: "h-10 w-10 min-h-10 min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
