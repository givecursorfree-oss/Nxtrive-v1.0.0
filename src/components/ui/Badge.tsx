import type { HTMLAttributes, ReactNode } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "section" | "source" | "status";
  children: ReactNode;
}

const variantClasses = {
  section: "surface-accent type-label",
  source: "bg-paper-white text-helper border border-mist type-caption normal-case tracking-normal",
  status: "surface-accent-soft type-caption font-medium normal-case tracking-normal",
};

export function Badge({ variant = "section", className = "", children, ...props }: BadgeProps) {
  return (
    <span
      className={["inline-flex items-center rounded-full px-3 py-1.5", variantClasses[variant], className].join(
        " ",
      )}
      {...props}
    >
      {children}
    </span>
  );
}
