import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#0A1628",
        "navy-light": "#0D2137",
        teal: { DEFAULT: "#0E7490", light: "#0891B2", bright: "#06B6D4" },
        amber: { DEFAULT: "#F59E0B", bright: "#EAB308" },
        cement: "#8B8B7A",
        concrete: "#C4C4B0",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui"],
        mono: ["var(--font-geist-mono)", "monospace"],
        display: ["var(--font-display)", "system-ui"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 3s linear infinite",
        "bounce-slow": "bounce 2s infinite",
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        "glow": "glow 2s ease-in-out infinite alternate",
        "typing": "typing 1.5s steps(30, end)",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { transform: "translateY(20px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        glow: { "0%": { boxShadow: "0 0 5px rgba(8, 145, 178, 0.3)" }, "100%": { boxShadow: "0 0 20px rgba(8, 145, 178, 0.8)" } },
        typing: { "0%": { width: "0" }, "100%": { width: "100%" } },
      },
    },
  },
  plugins: [],
};

export default config;
