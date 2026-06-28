import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "ghost" | "danger";
type ButtonSize = "default" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
}

function IconSlot({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center leading-none" aria-hidden>
      {children}
    </span>
  );
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-deep-indigo text-white shadow-subtle hover:bg-midnight-teal hover:shadow-sm focus-visible:ring-2 focus-visible:ring-deep-indigo/30",
  ghost:
    "bg-card-white text-deep-ink border border-mist shadow-subtle-2 hover:border-fog hover:text-deep-indigo",
  danger:
    "bg-card-white text-ember-orange border border-mist hover:bg-ember-orange/5 focus-visible:ring-ember-orange/25",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "min-h-[44px] min-w-[44px] gap-2 px-5 py-2.5 type-body-sm",
  sm: "min-h-9 gap-2 px-3 py-2 type-body-sm",
};

const iconSizeClasses: Record<ButtonSize, string> = {
  default: "[&_svg]:h-5 [&_svg]:w-5",
  sm: "[&_svg]:h-[1.125rem] [&_svg]:w-[1.125rem]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "default",
    icon,
    iconRight,
    fullWidth = false,
    className = "",
    children,
    disabled,
    loading = false,
    type = "button",
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={[
        "inline-flex items-center justify-center rounded-button font-medium",
        "transition-[transform,box-shadow,color,background-color,border-color] duration-200 ease-out",
        "focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        "motion-safe:active:scale-[0.98]",
        "[&_svg]:shrink-0",
        iconSizeClasses[size],
        sizeClasses[size],
        variantClasses[variant],
        fullWidth ? "w-full min-w-0 max-w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {icon ? <IconSlot>{icon}</IconSlot> : null}
      {children ? (
        <span className="min-w-0 truncate leading-none">{children}</span>
      ) : null}
      {iconRight ? <IconSlot>{iconRight}</IconSlot> : null}
    </button>
  );
});
