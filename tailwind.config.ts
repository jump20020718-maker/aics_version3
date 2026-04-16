import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "#f6f7f9",
        card: "#ffffff",
        border: "#e5e7eb",
        "border-soft": "#f1f2f4",
        "text-1": "#0f172a",
        "text-2": "#475569",
        "text-3": "#94a3b8",
        primary: {
          DEFAULT: "#4f46e5",
          50: "#eef2ff",
          100: "#e0e7ff",
          600: "#4338ca"
        },
        success: { DEFAULT: "#059669", 50: "#ecfdf5" },
        warning: { DEFAULT: "#d97706", 50: "#fffbeb" },
        danger: { DEFAULT: "#dc2626", 50: "#fef2f2" },
        purple: "#a855f7",
        indigo: "#6366f1"
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "PingFang SC",
          "Microsoft YaHei",
          "sans-serif"
        ],
        mono: ["JetBrains Mono", "monospace"]
      },
      fontSize: {
        "13": "13px",
        "13.5": "13.5px"
      },
      boxShadow: {
        "sm-soft": "0 1px 2px rgba(15, 23, 42, 0.04)",
        soft: "0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)"
      }
    }
  },
  plugins: []
};

export default config;
