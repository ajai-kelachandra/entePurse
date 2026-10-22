import type { Config } from "tailwindcss";

const v = (n: string) => `rgb(var(--${n}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        surface: v("surface"),
        subtle: v("subtle"),
        line: v("line"),
        ink: v("ink"),
        muted: v("muted"),
        brand: v("brand"),
        good: v("good"),
        warn: v("warn"),
        bad: v("bad"),
      },
      borderRadius: { xl: "14px", "2xl": "20px" },
      boxShadow: { card: "0 1px 2px rgb(0 0 0 / 0.04), 0 4px 16px rgb(0 0 0 / 0.04)" },
      fontFamily: { sans: ["var(--font-poppins)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;
