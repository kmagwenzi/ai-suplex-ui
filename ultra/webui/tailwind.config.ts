import type { Config } from "tailwindcss";

/**
 * Tailwind is the layout engine only. Colour, type and spacing live in
 * app/globals.css as CSS custom properties — every token here resolves to a
 * var() so the design system has one source of truth (inherited verbatim from
 * 777/lean-webui, plus the Ultra navy/gold mark tokens).
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/shell/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        muted: "var(--muted)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        accent: "var(--accent)",
        "accent-on-dark": "var(--accent-on-dark)",
        attention: "var(--attention)",
        error: "var(--error)",
        "error-on-dark": "var(--error-on-dark)",
        "on-accent": "var(--on-accent)",
        "on-attention": "var(--on-attention)",
        navy: "var(--navy)",
        "navy-ink": "var(--navy-ink)",
        "navy-muted": "var(--navy-muted)",
        gold: "var(--gold)",
        "gold-bright": "var(--gold-bright)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};

export default config;
