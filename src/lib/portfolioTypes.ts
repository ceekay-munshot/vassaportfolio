// Canonical data model for the family-office portfolio upload flow.
// Every utility in src/lib/portfolio* and every page reads these shapes.

export type CoreSatellite = "Core" | "Satellite";
export type HoldingStatus = "Current" | "Exited" | "Watchlist";
export type AssetClass =
  | "Equity"
  | "ETF"
  | "Bond"
  | "Cash"
  | "Alternative"
  | "Commodity"
  | "Real Estate"
  | "Other";

// How a position is held / who manages it. This is the dimension the family
// asked for repeatedly: a consolidated view, then mutual funds, AIFs, PMS,
// and direct equity as separate slices ("with managers" / "without managers").
export type Vehicle =
  | "Direct Equity"
  | "Mutual Fund"
  | "PMS"
  | "AIF"
  | "Private"
  | "Fixed Income"
  | "Gold"
  | "Real Estate";

// In-house (self-managed direct book) vs an external advisor/manager. Drives
// the "how much are we doing in-house vs advisor" attribution view.
export type ManagerType = "In-house" | "Advisor";

// Vehicles routed through an external manager — used for the "with managers /
// direct only" toggle and the in-house-vs-advisor split.
export const MANAGER_VEHICLES: Vehicle[] = ["Mutual Fund", "PMS", "AIF"];

export const ALL_VEHICLES: Vehicle[] = [
  "Direct Equity",
  "Mutual Fund",
  "PMS",
  "AIF",
  "Private",
  "Fixed Income",
  "Gold",
  "Real Estate",
];

// One row in the parsed portfolio.
export type Holding = {
  ticker: string;
  companyName: string;
  assetClass: AssetClass;
  sector: string;
  geography: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;        // qty * currentPrice if not provided — in native currency
  portfolioWeight: number;    // marketValue / totalValue if not provided
  coreSatellite: CoreSatellite;
  benchmark: string;
  status: HoldingStatus;

  // --- Multi-vehicle dimensions ---------------------------------------------
  // How the position is held and who manages it. Optional on the type for
  // backward compatibility with portfolios persisted before this landed; the
  // parser always fills them, and the storage layer back-fills sensible
  // defaults for older snapshots so every page can rely on them.
  vehicle?: Vehicle;          // Direct Equity / Mutual Fund / PMS / AIF / …
  manager?: string;           // "Marcellus PMS", "Parag Parikh Flexi Cap", "In-house"
  managerType?: ManagerType;  // In-house vs Advisor
  familyMember?: string;      // owning entity / family member ("Glow Ventures LLP", "Yamini")
  purchaseDate?: string;      // ISO yyyy-mm-dd — when the position was first taken

  // --- Consolidation dimensions (multi-broker reality) ----------------------
  // Where the position is actually custodied. The whole point of the
  // consolidated view: cost can come from one broker (Zerodha trade book) while
  // custody sits at another (Axis demat), joined on ISIN. `costUnknown` marks a
  // holding that exists in custody with no matching buy/cost record — shown as
  // "—" rather than a fake ₹0 cost (which would imply fake 100% profit).
  isin?: string;              // the real cross-broker join key
  broker?: string;            // custodian / broker where held ("Axis", "Zerodha", "MF")
  costSource?: string;        // where the cost basis came from ("Zerodha", …)
  costUnknown?: boolean;      // in custody but no cost record → avg cost / P&L not shown

  // --- Live pricing (from the Munshot stock API) ----------------------------
  apiTicker?: string;         // symbol to query if it differs from `ticker` (DCB → DCBBANK)
  prevClose?: number;         // previous close, for the day-change figure
  priceStatus?: "live" | "unresolved"; // did the live feed price this holding?

  // Live market stats (from the quote API) — power the Risk screen's momentum
  // and volatility signals.
  week52Low?: number;
  week52High?: number;
  ma50?: number;
  ma200?: number;
  yearlyChangePct?: number;

  // Derived for the dashboard (computed in the parser, not user-supplied).
  unrealizedPnL: number;      // qty * (currentPrice - averageCost) — native currency
  returnPct: number;          // (currentPrice - averageCost) / averageCost * 100
  costBasis: number;          // qty * averageCost — native currency

  // Native currency for this holding (inferred from geography). Drives
  // formatting in per-row tables.
  currency?: string;

  // FX-normalized values in the portfolio's base currency. Pages that
  // aggregate across holdings (totals, sleeve breakdowns, sector charts)
  // read these so mixed-currency portfolios produce a coherent sum.
  // Optional for backward compatibility with portfolios persisted before
  // the FX layer landed; consumers should fall back to the native field.
  marketValueBase?: number;
  costBasisBase?: number;
  unrealizedPnLBase?: number;

  // Anything else the uploaded file carried (Fwd PE, View, Action Today, etc.).
  // Kept as-is so the dashboard can surface it without losing data.
  extra?: Record<string, string | number | null>;
};

export type Portfolio = {
  id: string;                 // uploadId of the upload that created this portfolio
  fileName: string;
  uploadedAt: string;         // ISO timestamp
  holdings: Holding[];
  totalValue: number;         // in baseCurrency
  baseCurrency: "USD" | "INR" | "EUR" | "GBP";
  checksum: string;
};

export type UploadEvent = {
  uploadId: string;
  fileName: string;
  uploadedAt: string;
  numberOfRows: number;
  totalPortfolioValue: number;
  countCurrent: number;
  countExited: number;
  countWatchlist: number;
  checksum: string;
  changeSummary?: ChangeSummary;
  warnings: ParseWarning[];
};

// --- Parser output ---

export type ParseError = {
  row: number;                // 1-based row in the source file (headers excluded)
  ticker?: string;
  field: string;
  message: string;
};

export type ParseWarning = {
  field?: string;
  message: string;
};

export type FieldMappingTrace = {
  canonical: keyof Holding | "unmapped";
  source: string;             // header text from the file
};

export type ParseResult = {
  fileName: string;
  holdings: Holding[];
  errors: ParseError[];
  warnings: ParseWarning[];
  fieldMappings: FieldMappingTrace[];
  totalValue: number;                                // expressed in baseCurrency
  baseCurrency: "USD" | "INR" | "EUR" | "GBP";
  checksum: string;
  rawRowCount: number;
};

// --- Diff output ---

export type AddedChange = {
  ticker: string;
  companyName: string;
  quantity: number;
  marketValue: number;
};

export type RemovedChange = {
  ticker: string;
  companyName: string;
  lastQuantity: number;
  lastMarketValue: number;
};

export type QuantityChange = {
  ticker: string;
  from: number;
  to: number;
  delta: number;
};

export type PriceChange = {
  ticker: string;
  from: number;
  to: number;
  pctChange: number;
};

export type WeightChange = {
  ticker: string;
  from: number;               // 0..1 — relative weight in old portfolio
  to: number;
  deltaBps: number;
};

export type StatusChange = {
  ticker: string;
  from: HoldingStatus;
  to: HoldingStatus;
};

export type ClassificationChange = {
  ticker: string;
  from: CoreSatellite;
  to: CoreSatellite;
};

export type ChangeSummary = {
  added: AddedChange[];
  removed: RemovedChange[];
  quantityChanged: QuantityChange[];
  priceChanged: PriceChange[];
  weightChanged: WeightChange[];
  statusChanged: StatusChange[];
  classificationChanged: ClassificationChange[];
};
