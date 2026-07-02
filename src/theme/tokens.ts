/* =============================================================================
   DESIGN TOKENS — single source of truth for the whole UI
   =============================================================================
   Everything visual (colors, fonts, radii, shadows, chart palette) lives here.
   `tailwind.config.ts` imports the `colors`, `fontFamily` and `boxShadow`
   exports below, so editing this file re-skins every Tailwind utility class
   used across the app (backgrounds, text, borders, buttons, pills, cards,
   sidebar, top bar…). Chart stroke/fill colors read from `chart`.

   TO RE-THEME:
     1. Edit the values in this file, OR
     2. Swap in an alternate token set — see `theme.nv.ts` for a drop-in
        example, and the "Swapping the theme" section of the README.

   The light ("beige") palette is applied via CSS class overrides in
   `src/index.css` (html:not(.dark) …). Those hexes are mirrored in
   `light` below so this file stays the canonical reference; if you change
   them here, mirror the same values in index.css (documented there too).
============================================================================= */

// -----------------------------------------------------------------------------
// DARK THEME PALETTE (default) — the "ink" chassis + "gold" brand accent
// -----------------------------------------------------------------------------
export const colors = {
  // Deep slate-blue chassis. 950 = page base, 800 = cards, 700 = insets.
  ink: {
    950: "#070b14",
    900: "#0a0e1a",
    800: "#0f1525",
    700: "#141c2f",
    600: "#1c2540",
    500: "#2a3556",
  },
  // Brand accent — champagne gold. 500 is the primary brand color.
  gold: {
    400: "#e6c25c",
    500: "#d4af37",
    600: "#b08f25",
  },
  // Semantic P&L colors (also available as Tailwind `text-gain` / `text-loss`).
  gain: "#10b981",
  loss: "#ef4444",
} as const;

// -----------------------------------------------------------------------------
// TYPOGRAPHY
// -----------------------------------------------------------------------------
export const fontFamily = {
  sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
  mono: ["JetBrains Mono", "ui-monospace", "monospace"],
} as const;

// -----------------------------------------------------------------------------
// ELEVATION / SHADOWS
// -----------------------------------------------------------------------------
export const boxShadow = {
  card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 1px 2px 0 rgba(0,0,0,0.4)",
  glow: "0 0 0 1px rgba(212,175,55,0.25), 0 8px 24px -6px rgba(212,175,55,0.15)",
} as const;

// -----------------------------------------------------------------------------
// RADII — the app leans on Tailwind's scale; these are the ones actually used.
// -----------------------------------------------------------------------------
export const radii = {
  sm: "0.125rem", // rounded-sm (swatches)
  md: "0.375rem", // rounded-md (buttons, inputs, selects, small tiles)
  lg: "0.5rem", // rounded-lg (news/rec rows)
  xl: "0.75rem", // rounded-xl (cards, modals)
  full: "9999px", // pills, avatars, dots
} as const;

// -----------------------------------------------------------------------------
// SPACING — Tailwind's default 4px scale is used throughout. The two recurring
// custom values worth naming: card padding (p-5 = 20px) and the app gutter
// (px-6 = 24px). Documented here for reference; utilities come from Tailwind.
// -----------------------------------------------------------------------------
export const spacing = {
  cardPadding: "1.25rem", // p-5
  pageGutter: "1.5rem", // px-6
  gridGap: "1.25rem", // gap-5 between dashboard cards
} as const;

// -----------------------------------------------------------------------------
// CHART PALETTE — colors passed directly to Recharts (stroke / fill / Cell).
// Kept here so re-skinning charts is a one-file edit. The categorical PALETTE
// is used for donut slices & multi-series; accents drive line/area/bar charts.
// -----------------------------------------------------------------------------
export const chart = {
  // Primary series (portfolio) & benchmark comparison.
  primary: colors.gold[500], // "#d4af37" — portfolio line/area, primary bars
  benchmark: "#64748b", // slate-500 — benchmark line
  benchmarkBar: "#1e293b", // slate-800 — benchmark bars
  grid: "#1e293b", // slate-800 — CartesianGrid stroke
  axis: "#64748b", // slate-500 — axis ticks/labels
  gain: colors.gain, // "#10b981" — positive bars/areas
  loss: colors.loss, // "#ef4444" — drawdown / negative bars
  // Categorical palette for sectors / vehicles / allocation slices.
  categorical: [
    "#d4af37", // gold
    "#3b82f6", // blue
    "#10b981", // emerald
    "#a855f7", // purple
    "#f97316", // orange
    "#ef4444", // red
    "#06b6d4", // cyan
    "#84cc16", // lime
    "#ec4899", // pink
    "#facc15", // yellow
    "#8b5cf6", // violet
    "#64748b", // slate
  ],
} as const;

// -----------------------------------------------------------------------------
// LIGHT THEME ("Warm Beige") — mirror of the html:not(.dark) overrides in
// src/index.css. Canonical reference; keep in sync with index.css.
// -----------------------------------------------------------------------------
export const light = {
  page: "#efe6d2", // page base (warm cream)  ← maps bg-ink-950
  surfaceLow: "#f5eedc", // sidebar / top bar / header strip ← bg-ink-900
  surfaceMid: "#fbf6e8", // subtle elevations ← bg-ink-700
  surfaceHigh: "#ffffff", // cards ← bg-ink-800 / .card
  borderDefault: "#d9cfb8", // ← border-slate-700
  borderSubtle: "#e6dcc6", // ← border-slate-800
  textPrimary: "#1c1917",
  textSecondary: "#44403c",
  textTertiary: "#78716c",
  textQuaternary: "#a8a29e",
  brand: "#b08f25", // gold used for light-mode primary button
  brandHover: "#d4af37",
  // Chart tooltip (also defined as CSS vars --chart-tooltip-* in index.css).
  tooltipBg: "#ffffff",
  tooltipBorder: "#d9cfb8",
  tooltipText: "#1c1917",
  tooltipMuted: "#57534e",
} as const;

// Chart tooltip vars for the dark theme (mirror of html.dark in index.css).
export const darkTooltip = {
  tooltipBg: "#0f1525",
  tooltipBorder: "#1e293b",
  tooltipText: "#e2e8f0",
  tooltipMuted: "#94a3b8",
} as const;

// -----------------------------------------------------------------------------
// Aggregate export — handy for docs / runtime access to the whole token set.
// -----------------------------------------------------------------------------
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
