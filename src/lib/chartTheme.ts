// Single source of truth for Recharts tooltip styling. Reads CSS variables
// defined in src/index.css so the tooltip follows the active light/dark theme
// automatically without React state. Pass these directly to <Tooltip>:
//   <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} />

import type { CSSProperties } from "react";

export const chartTooltipStyle: CSSProperties = {
  background: "var(--chart-tooltip-bg)",
  border: "1px solid var(--chart-tooltip-border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--chart-tooltip-text)",
  boxShadow: "var(--chart-tooltip-shadow)",
};

export const chartTooltipLabelStyle: CSSProperties = {
  color: "var(--chart-tooltip-muted)",
  fontWeight: 500,
};

export const chartTooltipItemStyle: CSSProperties = {
  color: "var(--chart-tooltip-text)",
};
