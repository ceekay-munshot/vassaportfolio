/* =============================================================================
   NV FAMILY OFFICE — CONSOLIDATED BOOK (real data)
   =============================================================================
   Seeded from two real client files, joined on ISIN:

     1. Equity_Purchase_details.xlsx  — Zerodha buy book  → COST (average price)
     2. Nirbhay_DP_Transaction_Statement.pdf — Axis CDSL demat → HOLDINGS (qty)

   Quantity and average cost below are REAL. Current prices are NOT stored here —
   they are fetched live from the Munshot stock API on load (see priceService.ts
   + PortfolioContext). Until the first live fetch resolves, a holding is valued
   at its average cost (0% shown), so nothing fabricated is ever displayed.

   Edge cases preserved to prove the consolidation logic:
     • ENERGY  — ISIN begins "INF" ⇒ a MUTUAL FUND, not a share; the stock API
                 can't price it, so it's flagged and valued at cost (NAV not live).
     • DCB BANK — in the Axis demat with NO Zerodha buy ⇒ no cost record
                 (costUnknown). Its live price uses the NSE symbol DCBBANK.
============================================================================= */

import type { Holding, Portfolio, UploadEvent } from "@/lib/portfolioTypes";
import { MANAGER_VEHICLES } from "@/lib/portfolioTypes";
import type { Quote } from "@/lib/priceService";

const BASE_CURRENCY = "INR" as const;
const OWNER = "Nirbhay Vassa";

type Seed = {
  t: string;                 // ticker / symbol
  n: string;                 // company / scheme name
  isin: string;
  s: string;                 // sector (GICS-style)
  q: number;                 // quantity  (REAL — from files)
  avg: number;               // average cost per unit  (REAL — from Zerodha book)
  cs: Holding["coreSatellite"];
  v: NonNullable<Holding["vehicle"]>;
  broker: string;            // custodian where held
  costSource?: string;       // where the cost basis came from
  costUnknown?: boolean;     // in custody, no cost record
  apiTicker?: string;        // Munshot symbol if it differs from `t`
  lastPrice?: number;        // fallback price before the first live fetch (costUnknown rows only)
  pd: string;                // first purchase date (ISO)
};

const SEED: Seed[] = [
  { t: "ABB",       n: "ABB India Ltd.",                 isin: "INE117A01022", s: "Industrials",             q: 675,    avg: 5136.83, cs: "Core",      v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "ANTELOPUS", n: "Antelopus Selan Energy Ltd.",    isin: "INE818A01017", s: "Energy",                  q: 10000,  avg: 557.29,  cs: "Satellite", v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "CONCOR",    n: "Container Corp. of India Ltd.",  isin: "INE111A01025", s: "Industrials",             q: 4266,   avg: 555.64,  cs: "Core",      v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "EIDPARRY",  n: "EID Parry (India) Ltd.",         isin: "INE126A01031", s: "Consumer Staples",        q: 6500,   avg: 785.08,  cs: "Satellite", v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "ENRIN",     n: "Siemens Energy India Ltd.",      isin: "INE1NPP01017", s: "Industrials",             q: 1000,   avg: 2440.30, cs: "Satellite", v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "GMDCLTD",   n: "Gujarat Mineral Dev. Corp Ltd.", isin: "INE131A01031", s: "Materials",               q: 5428,   avg: 512.64,  cs: "Satellite", v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "GPPL",      n: "Gujarat Pipavav Port Ltd.",      isin: "INE517F01014", s: "Industrials",             q: 4800,   avg: 160.34,  cs: "Satellite", v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "HINDALCO",  n: "Hindalco Industries Ltd.",       isin: "INE038A01020", s: "Materials",               q: 3000,   avg: 799.87,  cs: "Core",      v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "IRCTC",     n: "Indian Railway Catering & Tourism", isin: "INE335Y01020", s: "Consumer Discretionary", q: 8000, avg: 597.66, cs: "Core",      v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "JUBLFOOD",  n: "Jubilant FoodWorks Ltd.",        isin: "INE797F01020", s: "Consumer Discretionary",  q: 10000,  avg: 501.66,  cs: "Satellite", v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "LT",        n: "Larsen & Toubro Ltd.",           isin: "INE018A01030", s: "Industrials",             q: 1300,   avg: 3875.86, cs: "Core",      v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "NMDC",      n: "NMDC Ltd.",                      isin: "INE584A01023", s: "Materials",               q: 65000,  avg: 75.35,   cs: "Core",      v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "PGEL",      n: "PG Electroplast Ltd.",           isin: "INE457L01029", s: "Consumer Discretionary",  q: 4000,   avg: 565.49,  cs: "Satellite", v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "TATASTEEL", n: "Tata Steel Ltd.",               isin: "INE081A01020", s: "Materials",               q: 20000,  avg: 188.75,  cs: "Core",      v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "THERMAX",   n: "Thermax Ltd.",                   isin: "INE152A01029", s: "Industrials",             q: 1140,   avg: 3030.78, cs: "Satellite", v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },

  // Mutual fund — INF ISIN; the stock API can't price it (flagged, valued at cost).
  { t: "ENERGY",    n: "Energy Opportunities Fund",      isin: "INF769K01PR2", s: "Energy",                  q: 150000, avg: 34.46,   cs: "Satellite", v: "Mutual Fund",   broker: "MF · AMC", costSource: "Zerodha", pd: "2025-08-13" },

  // In Axis demat, NO Zerodha buy → cost unknown. Live price via NSE symbol DCBBANK.
  { t: "DCB",       n: "DCB Bank Ltd.",                  isin: "INE503A01015", s: "Financials",              q: 13868,  avg: 0,       cs: "Satellite", v: "Direct Equity", broker: "Axis", costUnknown: true, apiTicker: "DCBBANK", lastPrice: 193, pd: "2026-05-20" },
];

// Derive a full Holding. Initial price = average cost (neutral 0%) for priced
// rows, or the fallback for cost-unknown rows; the live feed overrides on load.
export function toHolding(seed: Seed): Omit<Holding, "portfolioWeight"> {
  const noLiveQuote = seed.v === "Mutual Fund"; // stock API can't price MFs
  const price = seed.costUnknown ? (seed.lastPrice ?? seed.avg) : seed.avg;
  const marketValue = seed.q * price;
  const costBasis = seed.costUnknown ? 0 : seed.q * seed.avg;
  const unrealizedPnL = seed.costUnknown ? 0 : marketValue - costBasis;
  const returnPct = seed.costUnknown || seed.avg <= 0 ? 0 : ((price - seed.avg) / seed.avg) * 100;
  const isManaged = MANAGER_VEHICLES.includes(seed.v);

  return {
    ticker: seed.t,
    companyName: seed.n,
    assetClass: "Equity",
    sector: seed.s,
    geography: "India",
    quantity: seed.q,
    averageCost: seed.avg,
    currentPrice: price,
    marketValue,
    coreSatellite: seed.cs,
    benchmark: "NIFTY 500 TRI",
    status: "Current",
    vehicle: seed.v,
    manager: isManaged ? "Praviya (Wealth Mgr)" : "Self · In-house",
    managerType: isManaged ? "Advisor" : "In-house",
    familyMember: OWNER,
    purchaseDate: seed.pd,
    unrealizedPnL,
    returnPct,
    costBasis,
    currency: BASE_CURRENCY,
    isin: seed.isin,
    broker: seed.broker,
    costSource: seed.costSource,
    costUnknown: seed.costUnknown,
    apiTicker: seed.apiTicker,
    priceStatus: noLiveQuote ? "unresolved" : undefined,
    marketValueBase: marketValue,
    costBasisBase: costBasis,
    unrealizedPnLBase: unrealizedPnL,
  };
}

// Recompute the derived fields of a holding for a new current price. Used by the
// live-price layer (see applyLivePrices in PortfolioContext).
export function repriceHolding(h: Holding, q: Quote): Holding {
  const price = q.currentPrice;
  const marketValue = h.quantity * price;
  const costBasis = h.costUnknown ? 0 : h.quantity * h.averageCost;
  const unrealizedPnL = h.costUnknown ? 0 : marketValue - costBasis;
  const returnPct = h.costUnknown || h.averageCost <= 0 ? 0 : ((price - h.averageCost) / h.averageCost) * 100;
  return {
    ...h,
    currentPrice: price,
    prevClose: q.previousClose,
    priceStatus: "live",
    week52Low: q.week52Low,
    week52High: q.week52High,
    ma50: q.ma50,
    ma200: q.ma200,
    yearlyChangePct: q.yearlyChangePct,
    marketValue,
    unrealizedPnL,
    returnPct,
    marketValueBase: marketValue,
    costBasisBase: costBasis,
    unrealizedPnLBase: unrealizedPnL,
  };
}

export function withWeights(holdings: Holding[]): Holding[] {
  const nav = holdings.reduce((s, h) => s + (h.marketValueBase ?? h.marketValue), 0);
  return holdings.map((h) => ({
    ...h,
    portfolioWeight: nav > 0 ? (h.marketValueBase ?? h.marketValue) / nav : 0,
  }));
}

function buildPortfolio(): Portfolio {
  const holdings = withWeights(SEED.map(toHolding) as Holding[]);
  const navBase = holdings.reduce((s, h) => s + (h.marketValueBase ?? h.marketValue), 0);
  return {
    id: "nv-book-0001",
    fileName: "NV_Consolidated_Book.xlsx",
    uploadedAt: "2026-06-30T09:15:00.000Z",
    holdings,
    totalValue: navBase,
    baseCurrency: BASE_CURRENCY,
    checksum: "nv-zerodha-axis",
  };
}

export const MOCK_PORTFOLIO: Portfolio = buildPortfolio();

export const MOCK_UPLOADS: UploadEvent[] = [
  {
    uploadId: MOCK_PORTFOLIO.id,
    fileName: MOCK_PORTFOLIO.fileName,
    uploadedAt: MOCK_PORTFOLIO.uploadedAt,
    numberOfRows: MOCK_PORTFOLIO.holdings.length,
    totalPortfolioValue: MOCK_PORTFOLIO.totalValue,
    countCurrent: MOCK_PORTFOLIO.holdings.length,
    countExited: 0,
    countWatchlist: 0,
    checksum: MOCK_PORTFOLIO.checksum,
    warnings: [],
  },
];
