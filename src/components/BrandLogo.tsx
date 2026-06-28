import { BRAND_LOGO_LOCKUP_SRC, BRAND_LOGO_MARK_SRC, BRAND_NAME, BRAND_PRODUCT_LINE } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface BrandLogoMarkProps {
  className?: string;
  /** Renders mark inside the standard app chrome frame (sidebar, status bar) */
  framed?: boolean;
  /** sm = sidebar collapsed, md = sidebar expanded, lg = status bar */
  frameSize?: "sm" | "md" | "lg";
}

/** Nxtrive icon mark for chrome, sidebar, and setup screens */
export function BrandLogoMark({ className, framed = false, frameSize = "md" }: BrandLogoMarkProps) {
  const mark = (
    <img
      src={BRAND_LOGO_MARK_SRC}
      alt=""
      aria-hidden
      className={cn(
        "block shrink-0 object-contain object-center",
        framed ? "brand-logo-mark" : "h-10 w-10",
        className,
      )}
    />
  );

  if (!framed) return mark;

  return (
    <span
      className={cn(
        "brand-logo-frame",
        frameSize === "sm" && "brand-logo-frame--sm",
        frameSize === "lg" && "brand-logo-frame--lg",
      )}
      aria-hidden
    >
      {mark}
    </span>
  );
}

interface BrandLogoLockupProps {
  className?: string;
  /** Show "LOCAL DOCUMENT INTELLIGENCE" from the lockup artwork */
  compact?: boolean;
}

/** Mark + wordmark — works on light and dark surfaces without a baked-in PNG background */
export function BrandLogoInline({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandLogoMark framed frameSize="md" />
      <span className="text-base font-semibold tracking-tight text-deep-ink">{BRAND_NAME}</span>
    </div>
  );
}

/** Full horizontal logo for splash, onboarding, and marketing-style panels */
export function BrandLogoLockup({
  className,
  compact = false,
  priority = false,
}: BrandLogoLockupProps & { priority?: boolean }) {
  return (
    <img
      src={BRAND_LOGO_LOCKUP_SRC}
      alt={`${BRAND_NAME} — ${BRAND_PRODUCT_LINE}`}
      fetchPriority={priority ? "high" : undefined}
      decoding={priority ? "sync" : "async"}
      className={cn(
        "w-auto max-w-full object-contain object-center",
        compact ? "h-8" : "h-10",
        className,
      )}
    />
  );
}
