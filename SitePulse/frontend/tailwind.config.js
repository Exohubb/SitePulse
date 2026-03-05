export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      screens: {
        xs: "480px",   // ← new: enables xs: prefix in Tailwind classes
      },
      colors: {
        surface: { DEFAULT: "#0f172a", card: "#1e293b", muted: "#334155" },
        brand:   { 400: "#38bdf8", 500: "#0ea5e9", 600: "#0284c7" },
        up:      "#22c55e",
        down:    "#ef4444",
        slow:    "#f59e0b",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        fadein:     "fadein 0.3s ease-in-out",
        slidein:    "slidein 0.25s ease-out",
        pulse_slow: "pulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadein:  { from: { opacity: 0 },                              to: { opacity: 1 }                             },
        slidein: { from: { opacity: 0, transform: "translateY(-6px)" }, to: { opacity: 1, transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};
