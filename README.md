# NV Family Office — Consolidated Portfolio Dashboard

A single, light-themed view of the NV family-office book. It reassembles what the
broker plumbing scatters: **cost basis** (from the Zerodha trade book) and
**holdings/custody** (from the Axis demat), joined on **ISIN**, priced with a
**live price feed**.

> Status: first benchmark screen — **Portfolio Monitor** — built to standard on the
> real client data. Other screens are scaffolded and follow the same design system.

## The data model (one shape, swappable sources)

Every source fills the same `Holding` shape; the source behind it is a plug:

| Source | Status | Fills |
| --- | --- | --- |
| **Stale files** (`src/data/mockPortfolio.ts`) | now | qty + avg cost from the real Zerodha/Axis files |
| **Live broker API** | later | same shape, from the broker |
| **Manual upload** (`/upload`) | optional | CSV/XLSX drag-and-drop fallback |

Fields are one of three kinds — **source** (adapter fills), **live** (`currentPrice`
from the price API), **computed** (market value, P&L, weight — derived, never set by
an adapter). The join key is **ISIN**, not ticker (the same share is `ABB` on Zerodha
and `ABB INDIA LTD-EQ RS2` on Axis, but one ISIN).

### Two real edge cases are preserved
- **ENERGY** — ISIN starts with `INF` ⇒ it's a **mutual fund**, not a share, so it
  never appears in the demat. Tagged `Mutual Fund`.
- **DCB Bank** — sits in the Axis demat with **no matching Zerodha buy** ⇒ no cost
  record. Flagged `costUnknown`, shown as `—` (never a fake ₹0 cost / fake profit),
  and excluded from the P&L total while still counting its market value.

## What's built now — Portfolio Monitor
- Consolidated holdings table: Stock · Broker (cost source) · Sector · Qty · Avg Cost ·
  CMP · Return % · Market Value · Unrealized P&L · Weight.
- Headline KPIs: Portfolio Value, Invested, Unrealized P&L (+% on cost), Holdings.
- Slim controls only: **Sector** and **Broker** filters, sortable columns. No dead toggles.
- Clean Indian formatting (`₹7.15 Cr`, `₹74.10 L`), green/red used only for P&L.

## Tech stack
Vite · React 18 · TypeScript · Tailwind · Recharts · react-router. Fully client-side;
runs offline on the seeded book with no backend.

## Run
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
npm run preview    # serve the production build
```

## Theming — NV light (default)
- Single source of truth: `src/theme/theme.nv.ts` (navy chassis, electric-blue accent,
  DM Serif Display headings) wired into `tailwind.config.ts`.
- Light is the default; the palette lives in the `html:not(.dark)` block of
  `src/index.css`. A dark toggle is kept in the top bar.
- Editing the token file / that CSS block re-skins the whole app **and** the charts.

## Key files
```
src/data/mockPortfolio.ts          real NV book (Zerodha cost + Axis custody, joined on ISIN)
src/lib/portfolioTypes.ts          the Holding / Portfolio data model
src/pages/PortfolioMonitor.tsx     the benchmark screen
src/components/DashboardHeader.tsx  KPI strip
src/theme/theme.nv.ts              NV brand tokens
src/lib/format.ts                  clean INR (lakh/crore) formatting
docs/COMPONENTS.md                 component inventory (reference)
```

## Roadmap (next)
Risk & leverage view (Sharpe/beta/VaR, pledge/margin/F&O), broker-research consolidation
with hit-rate, multi-broker rollups as more custodians are wired, and live broker + price
API adapters replacing the seeded snapshot.
