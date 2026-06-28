/**
 * Nxtrive Design System Tokens
 * Cyber-technical aesthetic: dark surfaces, indigo accent, glass depth.
 */

export const tokens = {
  colors: {
    surface: {
      base: "#0b0f1a",
      sidebar: "#111827",
      panel: "#151b2b",
      elevated: "#1c2438",
      overlay: "rgba(17, 24, 39, 0.72)",
    },
    accent: {
      DEFAULT: "#6366f1",
      hover: "#818cf8",
      muted: "rgba(99, 102, 241, 0.15)",
      glow: "rgba(99, 102, 241, 0.35)",
    },
    text: {
      primary: "#f8fafc",
      secondary: "#94a3b8",
      muted: "#64748b",
    },
    border: {
      DEFAULT: "rgba(148, 163, 184, 0.12)",
      strong: "rgba(148, 163, 184, 0.22)",
    },
    status: {
      success: "#34d399",
      error: "#f87171",
      warning: "#fbbf24",
    },
  },
  radius: {
    sm: "0.375rem",
    md: "0.625rem",
    lg: "0.875rem",
    xl: "1.25rem",
    full: "9999px",
  },
  spacing: {
    sidebar: "300px",
    touchMin: "44px",
  },
  typography: {
    fontFamily: '"Inter", system-ui, sans-serif',
    sizes: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      display: "clamp(1.25rem, 2vw, 1.5rem)",
    },
  },
  motion: {
    fast: "150ms",
    normal: "250ms",
    slow: "400ms",
  },
} as const;
