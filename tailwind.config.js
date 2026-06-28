/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "var(--color-mist)",
        input: "var(--color-mist)",
        ring: "var(--color-deep-indigo)",
        background: "var(--color-card-white)",
        foreground: "var(--color-deep-ink)",
        muted: {
          DEFAULT: "var(--color-paper-white)",
          foreground: "var(--color-slate)",
        },
        accent: {
          DEFAULT: "var(--color-paper-white)",
          foreground: "var(--color-deep-indigo)",
        },
        popover: {
          DEFAULT: "var(--color-card-white)",
          foreground: "var(--color-deep-ink)",
        },
        primary: {
          DEFAULT: "var(--color-deep-indigo)",
          foreground: "#ffffff",
        },
        destructive: {
          DEFAULT: "var(--color-ember-orange)",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "var(--color-paper-white)",
          foreground: "var(--color-deep-ink)",
        },
        "paper-white": "var(--color-paper-white)",
        "card-white": "var(--color-card-white)",
        "deep-ink": "var(--color-deep-ink)",
        carbon: "var(--color-carbon)",
        slate: "var(--color-slate)",
        mist: "var(--color-mist)",
        fog: "var(--color-fog)",
        helper: "var(--color-text-helper)",
        graphite: "var(--color-graphite)",
        "deep-indigo": "var(--color-deep-indigo)",
        "ember-orange": "var(--color-ember-orange)",
        "midnight-teal": "var(--color-midnight-teal)",
        "forest-teal": "var(--color-forest-teal)",
        "sky-blue": "var(--color-sky-blue)",
        "pale-cyan": "var(--color-pale-cyan)",
        "pale-cyan-muted": "var(--color-pale-cyan-muted)",
        "on-accent": "var(--color-on-accent)",
        mint: "var(--color-mint)",
        lavender: "var(--color-lavender)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
        label: ["var(--font-label)"],
      },
      fontSize: {
        caption: ["var(--text-caption)", { lineHeight: "var(--leading-caption)" }],
        "body-sm": ["var(--text-body-sm)", { lineHeight: "var(--leading-body-sm)" }],
        body: ["var(--text-body)", { lineHeight: "var(--leading-body)" }],
        "body-lg": [
          "var(--text-body-lg)",
          { lineHeight: "var(--leading-body-lg)", letterSpacing: "var(--tracking-body-lg)" },
        ],
        subheading: [
          "var(--text-subheading)",
          { lineHeight: "var(--leading-subheading)", letterSpacing: "var(--tracking-subheading)" },
        ],
        "heading-sm": [
          "var(--text-heading-sm)",
          { lineHeight: "var(--leading-heading-sm)", letterSpacing: "var(--tracking-heading-sm)" },
        ],
        heading: [
          "var(--text-heading)",
          { lineHeight: "var(--leading-heading)", letterSpacing: "var(--tracking-heading)" },
        ],
        "heading-lg": [
          "var(--text-heading-lg)",
          { lineHeight: "var(--leading-heading-lg)", letterSpacing: "var(--tracking-heading-lg)" },
        ],
      },
      borderRadius: {
        card: "var(--radius-cards)",
        button: "var(--radius-buttons)",
        input: "var(--radius-inputs)",
        badge: "var(--radius-badges)",
      },
      boxShadow: {
        subtle: "var(--shadow-subtle)",
        "subtle-2": "var(--shadow-subtle-2)",
        "subtle-3": "var(--shadow-subtle-3)",
        sm: "var(--shadow-sm)",
        xl: "var(--shadow-xl)",
      },
      spacing: {
        4: "var(--spacing-4)",
        8: "var(--spacing-8)",
        12: "var(--spacing-12)",
        16: "var(--spacing-16)",
        20: "var(--spacing-20)",
        24: "var(--spacing-24)",
        32: "var(--spacing-32)",
      },
      width: {
        sidebar: "var(--sidebar-width)",
      },
      backgroundSize: {
        "size-[200%_auto]": "200% auto",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% center" },
          "100%": { backgroundPosition: "-200% center" },
        },
      },
      animation: {
        shimmer: "shimmer 4s infinite linear",
      },
    },
  },
  plugins: [],
};
