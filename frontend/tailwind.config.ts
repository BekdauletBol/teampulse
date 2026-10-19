import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        ink: "var(--text)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        "accent-2": "var(--accent-2)",
        bubble: "var(--bubble)",
        "bubble-ink": "var(--bubble-text)",
        line: "var(--border)",
        todo: "var(--todo)",
        progress: "var(--progress)",
        done: "var(--done)",
        "todo-ink": "var(--todo-text)",
        "progress-ink": "var(--progress-text)",
        "done-ink": "var(--done-text)",
        danger: "var(--danger)",
        "danger-soft": "var(--danger-soft)",
      },
      fontFamily: {
        display: ['"Instrument Serif"', "Georgia", "serif"],
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        soft: "var(--shadow)",
        lift: "var(--shadow-lift)",
      },
      keyframes: {
        float: {
          "0%": { transform: "translateY(0) rotate(var(--rot, 0deg))" },
          "100%": { transform: "translateY(-14px) rotate(calc(var(--rot, 0deg) + 4deg))" },
        },
      },
      animation: {
        float: "float 5s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [],
} satisfies Config;
