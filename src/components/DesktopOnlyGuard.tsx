import { useEffect, useState, type ReactNode } from "react";

import { BrandLogoMark } from "@/components/BrandLogo";
import { BRAND_NAME } from "@/lib/brand";

import { isTauriApp } from "@/lib/tauri";

/** Nxtrive is a desktop app — block viewports narrower than this. */
export const DESKTOP_MIN_WIDTH = 1024;

function isDesktopTauriApp(): boolean {
  return isTauriApp();
}

export function DesktopOnlyGuard({ children }: { children: ReactNode }) {
  const [allowed, setAllowed] = useState(
    () =>
      isDesktopTauriApp() ||
      (typeof window !== "undefined" && window.innerWidth >= DESKTOP_MIN_WIDTH),
  );

  useEffect(() => {
    if (isDesktopTauriApp()) return;

    const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`);
    const onChange = () => setAllowed(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (allowed) return children;

  return (
    <div className="desktop-only-block fixed inset-0 z-[9999] flex items-center justify-center bg-deep-ink p-10 text-center">
      <div className="max-w-md space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-card bg-paper-white p-2 shadow-subtle">
          <BrandLogoMark className="h-10 w-10" />
        </div>
        <h1 className="type-heading font-semibold text-white">Desktop only</h1>
        <p className="type-body text-slate">
          {BRAND_NAME} is built for desktop. Open it on a PC or Mac with a window at least{" "}
          {DESKTOP_MIN_WIDTH}px wide, or use the installed desktop app.
        </p>
      </div>
    </div>
  );
}
