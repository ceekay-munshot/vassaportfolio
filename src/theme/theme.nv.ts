/* =============================================================================
   ALTERNATE BRAND THEME — "NV"  (optional, NOT active by default)
   =============================================================================
   A drop-in alternative to `tokens.ts`. Same shape/exports, different palette:
   a navy + electric-blue brand with a DM Serif Display heading font. The
   default (ink/gold) theme is untouched — this file just sits alongside it.

   HOW TO ACTIVATE
   ---------------
   1. In `tailwind.config.ts`, change the import from:
          import { colors, fontFamily, boxShadow } from "./src/theme/tokens";
      to:
          import { colors, fontFamily, boxShadow } from "./src/theme/theme.nv";
   2. In `index.html`, swap the Google Fonts <link> to include the NV fonts:
          family=DM+Serif+Display&family=Inter:wght@400;500;600;700
   3. (Optional) apply the serif display face to headings — e.g. add
      `font-display` where PageHeader/Card render <h1>/titles, and register it
      in the config: `fontFamily: { display: [...fontFamily.display] }`.
   4. (Light mode) mirror the `light` values below into the
      `html:not(.dark)` block of `src/index.css` (same approach as the default).

   Because every surface reads Tailwind tokens (ink/gold) or the `chart` palette,
   swapping the import above re-skins the entire chrome in one step.
============================================================================= */

// Navy chassis (dark). 950 = deepest bg → 800 = cards; 700–500 = insets/hover.
export const colors = {
  ink: {
    950: "#0a1628",
    900: "#0d1b2e",
    800: "#0f1f3d",
    700: "#16294d",
    600: "#1e3660",
    500: "#2a4a7a",
  },
  // Brand accent — electric blue (replaces gold). 500 = primary, 600 = hover.
  gold: {
    400: "#4a7cf0",
    500: "#1e5ce8",
    600: "#1751d0",
  },
  gain: "#10b981",
  loss: "#ef4444",
} as const;

export const fontFamily = {
  sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
  // Serif display face for headings (opt-in via a `font-display` utility).
  display: ["DM Serif Display", "Georgia", "serif"],
  mono: ["JetBrains Mono", "ui-monospace", "monospace"],
} as const;

export const boxShadow = {
  card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 1px 2px 0 rgba(10,22,40,0.4)",
  glow: "0 0 0 1px rgba(30,92,232,0.28), 0 8px 24px -6px rgba(30,92,232,0.22)",
} as const;

export const radii = {
  sm: "0.125rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  full: "9999px",
} as const;

export const spacing = {
  cardPadding: "1.25rem",
  pageGutter: "1.5rem",
  gridGap: "1.25rem",
} as const;

export const chart = {
  primary: colors.gold[500], // "#1e5ce8" — portfolio line/area, primary bars
  benchmark: "#7a8fa6", // muted slate-blue — benchmark line
  benchmarkBar: "#dde6f5", // pale blue — benchmark bars
  grid: "#1e3660", // navy grid on dark; pale border in light mode
  axis: "#7a8fa6",
  gain: colors.gain,
  loss: colors.loss,
  categorical: [
    "#1e5ce8", // brand blue
    "#4a7cf0", // light blue
    "#10b981", // emerald
    "#8b5cf6", // violet
    "#f97316", // orange
    "#ef4444", // red
    "#06b6d4", // cyan
    "#eab308", // amber
    "#ec4899", // pink
    "#14b8a6", // teal
    "#a855f7", // purple
    "#7a8fa6", // slate-blue
  ],
} as const;

// Light theme (from the NV spec's light backgrounds/text/borders).
export const light = {
  page: "#f0f5ff",
  surfaceLow: "#edf0f4",
  surfaceMid: "#f9fafb",
  surfaceHigh: "#ffffff",
  borderDefault: "#dde6f5",
  borderSubtle: "#e2e8f0",
  textPrimary: "#0f1f3d", // headings
  textSecondary: "#3d5068", // body
  textTertiary: "#7a8fa6", // muted
  textQuaternary: "#9aa9bd",
  brand: "#1e5ce8",
  brandHover: "#1751d0",
  tooltipBg: "#ffffff",
  tooltipBorder: "#dde6f5",
  tooltipText: "#0f1f3d",
  tooltipMuted: "#3d5068",
} as const;

export const darkTooltip = {
  tooltipBg: "#0f1f3d",
  tooltipBorder: "#16294d",
  tooltipText: "#edf0f4",
  tooltipMuted: "#7a8fa6",
} as const;

export const tokens = {
  colors,
  fontFamily,
  boxShadow,
  radii,
  spacing,
  chart,
  light,
  darkTooltip,
} as const;

export default tokens;
