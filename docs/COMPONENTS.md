# Component Inventory

A browsable catalog of every reusable UI piece in this export, so you can lift
components cleanly into another dashboard.

## Stack / framework

| Layer | Choice |
|---|---|
| Framework | **React 18** + **TypeScript** (function components + hooks) |
| Build tool | **Vite 5** (`@vitejs/plugin-react`) |
| Routing | **react-router-dom 6** (`BrowserRouter`, `Routes`, `NavLink`) |
| Styling | **Tailwind CSS 3** (utility-first) + a small `@layer components` set (`.card`, `.btn`, `.pill`, `.label-xs`…) in `src/index.css`; **dark mode via `class`** |
| Charts | **Recharts 2** (Area, Bar, Pie/donut, Scatter/bubble) |
| Icons | **lucide-react** |
| Tables | **Hand-rolled** semantic `<table>` markup styled with Tailwind — **no** TanStack Table / AG Grid |
| Component kit | **Bespoke** — **no** shadcn/ui, **no** MUI. All primitives are local. |
| File parsing (upload feature) | **papaparse** (CSV) + **xlsx** / SheetJS (XLSX) — 100% client-side |
| State | React Context (`PortfolioContext`) over `localStorage`; **no backend** |

> There is **no chart-grid or table library to adopt** — tables are plain
> `<table>`s, so lifting one is just copying markup + the Tailwind classes.

## Category legend

`KPI` stat tile · `Chart` · `Table` · `Filter` control · `Nav` (sidebar/topbar) ·
`Card` · `Modal` · `Form` · `Badge`/status · `Layout` · `Util`/hook.

---

## 1. Shared primitives — `src/components/`

The cleanest pieces to cherry-pick. All are presentational except where noted.

| Component | File | Purpose | Key props | Category | Internal deps (what to bring along) |
|---|---|---|---|---|---|
| **Card** | `components/Card.tsx` | Titled surface/container with optional header + right slot | `children`, `title?`, `subtitle?`, `right?`, `pad=true`, `className?` | Card / Layout | none (only `.card` class from `index.css`) |
| **StatTile** 💰 | `components/StatTile.tsx` | KPI tile: label, big value, delta %, sub-text, icon | `label`, `value`, `sub?`, `delta?`, `icon?` | KPI | `lib/format` (`changeColor`) |
| **Pill** 💰 | `components/Pill.tsx` | Status/label badge in 7 tones | `children`, `tone?` (`default\|gain\|loss\|warn\|info\|core\|satellite`), `className?` | Badge | none |
| **PageHeader** | `components/PageHeader.tsx` | Page title block (eyebrow + h1 + subtitle + right slot) | `eyebrow?`, `title`, `subtitle?`, `right?` | Layout | none |
| **Sidebar** 💰 | `components/Sidebar.tsx` | Grouped left nav; locks portfolio-gated routes | _none_ | Nav | `react-router` (`NavLink`), `lucide-react`, `usePortfolio` |
| **TopBar** | `components/TopBar.tsx` | Sticky top bar: search, live clock, **light/dark toggle** (persists `fo:theme`), notifications | _none_ | Nav | `usePortfolio`, `lib/format` (`fmtDateTime`), `lucide-react` |
| **DashboardHeader** 💰 | `components/DashboardHeader.tsx` | Persistent portfolio strip: file identity, 4 summary cells, currency switch, re-upload/clear | _none_ | Layout / KPI / Modal | `usePortfolio` + derived (`activeHoldings`, `distinctSectors`, `holdingsByCoreSatellite`), `lib/format`, `lib/fx`, `react-router`, `lucide-react` |
| **EmptyState** | `components/EmptyState.tsx` | Pre-upload hero + 4 "locked preview" teaser cards | _none_ | Card | `react-router` (`Link`), `lucide-react` |
| **ErrorBoundary** | `components/ErrorBoundary.tsx` | Class boundary → recoverable error screen; can clear saved data | `children` | Util | `lib/portfolioStorage` (`clearAllPortfolioState`), `lucide-react` |

### Notable sub-components defined inside the above / inside pages
Small but reusable; currently local (copy the function out):

| Sub-component | Defined in | Purpose | Category | Deps |
|---|---|---|---|---|
| **CurrencySwitch** 💰 | `components/DashboardHeader.tsx` | Segmented INR/USD/EUR/GBP toggle; re-denominates the whole app live | Filter | `usePortfolio`, `lib/fx` |
| **SummaryCell** | `components/DashboardHeader.tsx` | Icon + label + value + sub mini-KPI | KPI | none |
| **ConfirmDialog** | `components/DashboardHeader.tsx` | Centered confirm modal (overlay + stop-propagation) | Modal | `lucide-react` |
| **FilterSelect** 💰 | `pages/PortfolioMonitor.tsx` | Labeled `<select>` dropdown filter | Filter | none |
| **StatChip** | `pages/Recommendations.tsx` | Compact count chip | KPI | none |
| **SplitCell** 💰 | `pages/CapitalGains.tsx` | Long-term / short-term split figure cell | KPI | `lib/format` |
| **SourceTypeCard** | `pages/SourcesEvidence.tsx` | Type-count card with icon | Card | `lucide-react` |
| **Avatar / Answer / KVList** | `pages/AskMunshot.tsx` | Chat avatar, answer bubble, key-value answer list | Card | `lib/format` |

---

## 2. Chart building blocks (Recharts) 💰

All charts read tooltip styling from `lib/chartTheme.ts` (CSS-variable driven, so
they follow light/dark automatically) and colors from `src/theme/tokens.ts`
(`chart` export). Bring `chartTheme.ts` + the `chart` tokens when lifting any chart.

| Chart | Where (first/best example) | Recharts primitives | Reuse note |
|---|---|---|---|
| **Area / time-series** 💰 | `pages/MorningCIO.tsx`, `pages/RiskPerformance.tsx` | `AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer`, gradient `<defs>` | Portfolio-vs-benchmark indexed line; drawdown underwater area |
| **Donut / pie** 💰 | `pages/SectorComposition.tsx`, `pages/CoreSatellite.tsx`, `pages/FamilyEntities.tsx` | `PieChart, Pie, Cell` (innerRadius) | Allocation share; center-label variant in CoreSatellite |
| **Grouped / stacked bar** 💰 | `pages/SectorComposition.tsx` (vs benchmark), `pages/RiskPerformance.tsx` (monthly up/down), `pages/Liquidity.tsx` (calls), `pages/LookThrough.tsx` (direct vs fund) | `BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis, Tooltip` | OW/UW comparison, stacked gains/losses |
| **Risk/return scatter (bubble)** 💰 | `pages/FundAnalytics.tsx` | `ScatterChart, Scatter, ZAxis, XAxis, YAxis, Tooltip` | Vol (x) vs return (y), bubble size = your MV |
| **Sentiment / weight micro-bars** | `pages/PortfolioMonitor.tsx`, `pages/MorningCIO.tsx`, `pages/SectorIntelligence.tsx` | plain `<div>` bars (no Recharts) | Cheap inline bars for row-level weights |

Categorical donut/series palette + line/bar accents live in
`src/theme/tokens.ts → chart` (`primary`, `benchmark`, `grid`, `axis`, `gain`,
`loss`, `categorical[]`).

---

## 3. Data tables 💰

Hand-rolled `<table>`s (sticky headers, sortable columns, `tfoot` totals).

| Table | Page | Features | Category |
|---|---|---|---|
| **Holdings master table** 💰 | `pages/PortfolioMonitor.tsx` | Sticky header + sticky first col, click-to-sort (5 keys), 7 dropdown filters, scope toggle, per-row weight micro-bar, filtered totals footer | Table + Filter |
| Sector breakdown | `pages/SectorComposition.tsx` | Weight / MV / benchmark variation (OW/UW pills) | Table |
| Scheme metrics | `pages/FundAnalytics.tsx` | Wide fund table, top-Sharpe highlighted | Table |
| Realized / unrealized / loss-harvest | `pages/CapitalGains.tsx` | LT/ST classification tables | Table |
| Commitments / calls / distributions | `pages/Liquidity.tsx` | Called-% progress bars in rows | Table |
| Returns-by-period / risk metrics | `pages/RiskPerformance.tsx` | Two comparison tables | Table |
| Sources / evidence | `pages/SourcesEvidence.tsx` | Searchable, type-filtered, linked-ticker pills | Table + Filter |
| Upload-history accordion | `pages/UploadHistory.tsx` | Expandable rows + change-summary diff blocks | Table |

---

## 4. Pages / assembled screens — `src/pages/`

Each is a full, reference-quality composition (route from `src/App.tsx`).
💰 = especially relevant to a financial/portfolio dashboard.

| Page | Route | Purpose | Charts / Tables | Mock data it reads |
|---|---|---|---|---|
| **MorningCIO** 💰 | `/cio` | Daily briefing: NAV/P&L KPIs, portfolio-vs-benchmark area, top movers, holdings-news, actions, vehicle mix | Area chart, div-bars, lists | `mockBenchmark`, `mockNews`, `mockRecommendations` |
| **PortfolioMonitor** 💰 | `/monitor` | Master holdings table w/ scope toggle + 7 filters + sortable cols | **Big data table** | _(portfolio only)_ |
| **CoreSatellite** 💰 | `/core-satellite` | Core-vs-Satellite sleeve mix & drift vs 70/30 target | Donut + grouped bar + tables | _(portfolio only)_ |
| **SectorComposition** 💰 | `/sectors` | Sector tilts vs NIFTY 500 benchmark | Donut + grouped bar + table | _(portfolio only)_ |
| **RiskPerformance** 💰 | `/risk` | Sharpe/vol/drawdown, cumulative + drawdown + monthly returns | 3 charts + 2 tables | `mockBenchmark` |
| **FundAnalytics** 💰 | `/funds` | MF/PMS/AIF scheme evaluation, risk/return bubble | Scatter/bubble + wide table | `mockFundAnalytics` |
| **CapitalGains** 💰 | `/capital-gains` | Realized/unrealized LT-ST split, loss harvesting, est. tax | KPIs + 3 tables | _(portfolio only)_ |
| **Liquidity** 💰 | `/liquidity` | Private-markets commitments, capital-call calendar, distributions | Bar + tables | `mockCapitalCalls` |
| **LookThrough** 💰 | `/look-through` | Consolidated single-stock exposure (direct + fund look-through) + overlap | Stacked bar + table | `mockFundLookthrough` |
| **FamilyEntities** 💰 | `/family` | Book by entity; actual-vs-target allocation, in-house vs advisor | Stacked bar + donut + tables | `mockFamilyTargets` |
| **CorporateActions** 💰 | `/corporate-actions` | Dividends/splits/bonus/buyback mapped to holdings | KPIs + event feed | `mockCorporateActions` |
| **BrokerResearch** 💰 | `/research` | Street notes correlated to holdings (rating/PT deltas) | Card feed | `mockBrokerReports` |
| **SectorIntelligence** 💰 | `/intelligence` | Sector pulse, competitor moves, regulatory, holdings-news | Tables + card lists | `mockNews` |
| **Recommendations** 💰 | `/recommendations` | Action recs w/ evidence trail, approve/dismiss | Card feed | `mockRecommendations`, `mockSources` |
| **AskMunshot** | `/ask` | Rules-based chat over the book (chips + typing anim) | Chat UI | `mockFundLookthrough`, `mockCapitalCalls`, `mockFamilyTargets` |
| **DataSources** | `/data-sources` | Connector/integration status + ingested-doc ledger (fully static) | KPIs + cards + table | `mockDataSources` |
| **SourcesEvidence** | `/sources` | Auditable source/evidence ledger, searchable | Table + filter | `mockSources` |
| **UploadHistory** | `/history` | Versioned upload ledger + change-summary diffs (ungated) | Accordion table | _(upload events)_ |
| **UploadPortfolio** | `/upload` | CSV/XLSX drag-drop → parse → staging review → commit (ungated) | Form / staging card | `portfolioParser` (`SAMPLE_CSV`) |

---

## 5. Finance / portfolio components — explicitly flagged

Everything you asked to be able to find fast:

- **Holdings / data tables** → `PortfolioMonitor` (the master one), plus the sector, fund, capital-gains, liquidity and sources tables.
- **KPI / stat tiles** → `StatTile` (primitive) + `DashboardHeader` summary cells + KPI rows on nearly every page.
- **Allocation / donut charts** → `SectorComposition`, `CoreSatellite`, `FamilyEntities` (in-house vs advisor donut).
- **Performance / time-series line charts** → `MorningCIO` (portfolio vs benchmark), `RiskPerformance` (cumulative + drawdown).
- **Risk gauges / meters** → `RiskPerformance` (Sharpe/Sortino/vol/beta/capture metric tables + drawdown area), `FundAnalytics` risk/return **bubble scatter**.
- **Sector breakdowns** → `SectorComposition` (donut + benchmark bar + variation table), `SectorIntelligence` (sector pulse).
- **Filters / controls** → `FilterSelect`, `CurrencySwitch`, scope-toggle segmented buttons (in `PortfolioMonitor` / `SectorComposition`), "only my holdings" checkboxes, type/priority selects.
- **Multi-currency** → `lib/fx.ts` + `CurrencySwitch` + `fmtFromBase` (all aggregates re-denominate live INR/USD/EUR/GBP).

---

## 6. Design system, hooks & utilities

| Item | File | Purpose |
|---|---|---|
| **Design tokens (single source of truth)** | `src/theme/tokens.ts` | Colors (ink/gold/gain/loss), fonts, radii, shadows, chart palette, light-theme palette. Imported by `tailwind.config.ts`. |
| **Alternate brand theme (opt-in)** | `src/theme/theme.nv.ts` | Drop-in navy + electric-blue + DM Serif Display theme. Not active by default. |
| Global styles + component classes | `src/index.css` | `@layer components` (`.card`, `.btn`, `.pill`, `.label-xs`…) + the light "warm beige" theme (`html:not(.dark)` overrides) + chart-tooltip CSS vars. |
| Chart tooltip theming | `src/lib/chartTheme.ts` | Shared Recharts `contentStyle`/`labelStyle`/`itemStyle` from CSS vars. |
| **`usePortfolio()` hook + Provider** | `src/context/PortfolioContext.tsx` | The only data API. Exposes `portfolio`, `uploads`, `displayCurrency`, `fmtFromBase`, `convertFromBase`, staging APIs. Plus derived helpers `activeHoldings`, `holdingsByCoreSatellite`, `distinctSectors`. |
| Formatters | `src/lib/format.ts` | `fmtCurrency`, `fmtPct`, `fmtNum`, `fmtDate/Time`, `relativeTime`, `changeColor`, `fmtBps`. |
| FX | `src/lib/fx.ts` | Static-rate INR/USD/EUR/GBP conversion + geography→currency. |
| Portfolio math | `src/lib/portfolioAnalytics.ts` | `mvBase/costBaseOf/pnlBase`, `bucketBy`, `allocationBucketOf`, FY helpers, `annualizedReturn`. |
| Types | `src/lib/portfolioTypes.ts`, `src/types/index.ts` | `Holding`, `Portfolio`, `UploadEvent` + news/broker/recommendation types. |
| Upload pipeline (UI feature) | `src/lib/portfolioParser.ts`, `portfolioDiff.ts`, `portfolioStorage.ts` | Client-side CSV/XLSX parse, diff engine, localStorage I/O. |
| **Mock/fixture data** | `src/data/mock*.ts` | All demo data. `mockPortfolio.ts` seeds the offline book (added for this export). |

### Lifting checklist (dependency chain)
- A **chart** → bring `lib/chartTheme.ts` + `theme/tokens.ts` (`chart`) + the Recharts import.
- **StatTile / anything showing money or %** → bring `lib/format.ts`.
- **Anything reading holdings** → bring `usePortfolio` (context) + `lib/portfolioAnalytics.ts` + `lib/portfolioTypes.ts`. For a different app, replace the Provider's data source; the component API stays the same.
- **Any component** → bring the Tailwind setup (`tailwind.config.ts` + `theme/tokens.ts` + the relevant `@layer components` classes from `index.css`).

Legend: 💰 = financial/portfolio-dashboard relevant.
