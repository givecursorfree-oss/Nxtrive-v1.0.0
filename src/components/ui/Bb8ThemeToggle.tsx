import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

interface Bb8ThemeToggleProps {
  isDark: boolean;
  onChange: (isDark: boolean) => void;
  className?: string;
  /** Scales the toggle via --toggle-size (px). */
  size?: number;
}

export function Bb8ThemeToggle({
  isDark,
  onChange,
  className,
  size = 9,
}: Bb8ThemeToggleProps) {
  return (
    <label
      className={cn("bb8-theme-toggle bb8-toggle", className)}
      style={{ "--toggle-size": `${size}px` } as CSSProperties}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <input
        type="checkbox"
        className="bb8-toggle__checkbox"
        checked={isDark}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      />
      <div className="bb8-toggle__container">
        <div className="bb8">
          <div className="bb8__head-container">
            <div className="bb8__head">
              <div className="bb8__antenna" />
              <div className="bb8__antenna" />
            </div>
          </div>
          <div className="bb8__body" />
        </div>

        <div className="bb8__shadow" />

        <div className="bb8-toggle__scenery">
          <div className="bb8-toggle__star" />
          <div className="bb8-toggle__star" />
          <div className="bb8-toggle__star" />
          <div className="bb8-toggle__star" />
          <div className="bb8-toggle__star" />
          <div className="bb8-toggle__star" />
          <div className="bb8-toggle__star" />
          <div className="gomrassen" />
          <div className="hermes" />
          <div className="chenini" />
          <div className="tatto-1" />
          <div className="tatto-2" />
          <div className="bb8-toggle__cloud" />
          <div className="bb8-toggle__cloud" />
          <div className="bb8-toggle__cloud" />
        </div>

        <div className="artificial__hidden" />
      </div>
    </label>
  );
}
