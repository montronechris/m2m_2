import type { Config } from "tailwindcss";
const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: "#F7F2E9", 50: "#FBF8F1", 100: "#F1E8D8", 200: "#E6D7BF" },
        ink:   { DEFAULT: "#2B2620", soft: "#6B5B4A", faint: "#9B8C79" },
        gold:  { DEFAULT: "#B6794C", soft: "#CDA277" },
        sage:  { DEFAULT: "#5E7355", soft: "#7E9472" },
        wood:  { DEFAULT: "#7A4F30", dark: "#5C3A22" },
        espresso: "#1B1714",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'Playfair Display'", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgba(43,38,32,0.25)",
        card: "0 2px 24px -8px rgba(43,38,32,0.18)",
        gold: "0 14px 40px -12px rgba(182,121,76,0.55)",
      },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        pulseGlow: { "0%,100%": { opacity: "0.6" }, "50%": { opacity: "1" } },
      },
      animation: {
        float: "float 5s ease-in-out infinite",
        pulseGlow: "pulseGlow 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;