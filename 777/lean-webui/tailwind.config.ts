import type { Config } from "tailwindcss";

/**
 * Tailwind is the layout engine only. Colour, type and spacing live in
 * app/globals.css as CSS custom properties — every token here resolves to a
 * var() so the design system has one source of truth.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
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
