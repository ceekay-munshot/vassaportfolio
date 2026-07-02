import type { Config } from "tailwindcss";
// Single source of truth for the palette / fonts / shadows lives in the token
// file — edit there to re-skin every Tailwind utility class across the app.
// NV brand: navy chassis + electric-blue accent + DM Serif Display headings.
import { colors, fontFamily, boxShadow } from "./src/theme/theme.nv";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: colors.ink,
        gold: colors.gold,
        gain: colors.gain,
        loss: colors.loss,
      },
      fontFamily: {
        sans: [...fontFamily.sans],
        mono: [...fontFamily.mono],
        display: [...fontFamily.display],
      },
      boxShadow: {
        card: boxShadow.card,
        glow: boxShadow.glow,
      },
    },
  },
  plugins: [],
} satisfies Config;
