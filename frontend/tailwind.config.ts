import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    screens: {
      xs: "360px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1440px",
      "3xl": "1680px",
      "4xl": "1920px",
      ultrawide: "2560px",
    },
    extend: {
      colors: {
        background: {
          DEFAULT: "#0a0a0c",
          dark: "#060608",
          card: "#131318",
          elevated: "#1b1b22",
          hover: "#22222b",
        },
        border: {
          subtle: "rgba(255, 255, 255, 0.08)",
          glow: "rgba(255, 255, 255, 0.15)",
        },
        accent: {
          DEFAULT: "var(--accent, #8b7cf6)",
          hover: "var(--accent-hover, #7c6be8)",
          glow: "var(--accent-glow, rgba(139, 124, 246, 0.35))",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        none: "none",
        sm: "none",
        DEFAULT: "none",
        md: "none",
        lg: "none",
        xl: "none",
        "2xl": "none",
        inner: "none",
        glow: "none",
        card: "none",
        float: "none",
      },
      dropShadow: {
        none: "none",
        sm: "none",
        DEFAULT: "none",
        md: "none",
        lg: "none",
        xl: "none",
        "2xl": "none",
      },
      animation: {
        shimmer: "shimmer 2s infinite linear",
        "pulse-subtle": "pulseSubtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.75" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
