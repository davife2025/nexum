import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Nexum Brand Palette ──────────────────────────
        navy:   "#0A2540",  // Primary — logos, headlines, main buttons
        teal:   "#00E5C9",  // Accent — CTAs, progress, flow highlights
        violet: "#7B5EFF",  // Secondary — success, confirmations, agents
        void:   "#0F172A",  // Neutral dark — backgrounds, panels
        cloud:  "#F8FAFC",  // Neutral light — text, light accents

        // ── Semantic nx.* tokens used throughout UI ───────
        nx: {
          bg:      "#0F172A",   // page background
          surface: "#0A2540",   // card / panel surface
          raised:  "#112847",   // slightly elevated surface
          border:  "#1E3A5F",   // border / divider
          teal:    "#00E5C9",   // accent teal
          "teal-dim": "#00B8A3", // dimmed teal
          violet:  "#7B5EFF",   // commerce violet
          "violet-dim": "#5B3FCC", // dimmed violet
          cloud:   "#F8FAFC",   // cloud white
          muted:   "#4A7090",   // secondary text
          text:    "#B8D4E8",   // primary body text
          error:   "#FF4D6A",   // error
          amber:   "#FFB300",   // warning
        },
      },
      fontFamily: {
        sans:    ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        mono:    ["'IBM Plex Mono'", "monospace"],
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "slide-up":   "slideUp 0.4s ease-out forwards",
        "fade-in":    "fadeIn 0.3s ease-out forwards",
        "blink":      "blink 1s step-end infinite",
        "shimmer":    "shimmer 2.4s linear infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.45" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
      },
      boxShadow: {
        "teal":   "0 0 28px rgba(0, 229, 201, 0.20)",
        "violet": "0 0 28px rgba(123, 94, 255, 0.22)",
        "navy":   "0 8px 32px rgba(10, 37, 64, 0.50)",
        "inner":  "inset 0 0 40px rgba(0, 229, 201, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
