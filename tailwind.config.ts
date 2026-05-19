import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        forge: {
          background: "rgb(var(--forge-background) / <alpha-value>)",
          surface: "rgb(var(--forge-surface) / <alpha-value>)",
          surfaceAlt: "rgb(var(--forge-surface-alt) / <alpha-value>)",
          gold: "rgb(var(--forge-gold) / <alpha-value>)",
          goldSoft: "rgb(var(--forge-gold-soft) / <alpha-value>)",
          text: "rgb(var(--forge-text) / <alpha-value>)",
          muted: "rgb(var(--forge-muted) / <alpha-value>)",
          line: "rgb(var(--forge-line) / <alpha-value>)"
        }
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        glow: "var(--shadow-glow)"
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
