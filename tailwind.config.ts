import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0a0a0b",
          900: "#101013",
          800: "#16161a",
          700: "#1d1d22",
          600: "#2a2a32",
          500: "#3d3d48",
          400: "#5a5a68",
          300: "#8a8a98",
          200: "#b8b8c4",
          100: "#e4e4ec",
        },
        pulse: {
          DEFAULT: "#ff3b3b",
          dim: "#c92a2a",
          glow: "#ff6b6b",
        },
        signal: {
          green: "#4ade80",
          amber: "#fbbf24",
          red: "#ff3b3b",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        widest: "0.2em",
        ultra: "0.32em",
      },
    },
  },
  plugins: [],
};

export default config;
