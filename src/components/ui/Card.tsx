import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  padding?: "sm" | "md" | "lg";
  children: ReactNode;
}

const paddingMap = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  elevated = false,
  padding = "md",
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={[
        "rounded-lg border border-mist bg-card-white",
        elevated ? "shadow-subtle" : "shadow-subtle-2",
        paddingMap[padding],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
