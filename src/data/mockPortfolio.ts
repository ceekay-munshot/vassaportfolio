/* =============================================================================
   NV FAMILY OFFICE — CONSOLIDATED BOOK (real data, offline)
   =============================================================================
   Seeded from two real client files, joined on ISIN:

     1. Equity_Purchase_details.xlsx  — Zerodha buy book  → COST (average price)
     2. Nirbhay_DP_Transaction_Statement.pdf — Axis CDSL demat → HOLDINGS (qty)

   The 15 equities were bought on Zerodha and transferred into the Axis demat,
   so cost comes from Zerodha while custody sits at Axis. Two real-world edge
   cases are preserved to prove the consolidation logic:

     • ENERGY  — ISIN begins with "INF" → it is a MUTUAL FUND, not a share, which
                 is why it never appears in the demat statement. Tagged Mutual Fund.
     • DCB BANK — sits in the Axis demat with NO matching Zerodha buy → no cost
                 record. Flagged `costUnknown` so the UI shows "—", never a fake ₹0.

   PRICES (cmp): the qty + average cost below are REAL (from the client files).
   The `cmp` (current market price) values are a SAMPLE snapshot for the demo —
   they are the ONE piece that gets replaced by the live price API. Everything
   derived (market value, P&L, weight) recomputes automatically when they update.
============================================================================= */

import type { Holding, Portfolio, UploadEvent } from "@/lib/portfolioTypes";
import { MANAGER_VEHICLES } from "@/lib/portfolioTypes";

const BASE_CURRENCY = "INR" as const;
const OWNER = "Nirbhay Vassa";

type Seed = {
  t: string;                 // ticker / symbol
  n: string;                 // company / scheme name
  isin: string;
  s: string;                 // sector (GICS-style)
  q: number;                 // quantity  (REAL — from files)
  avg: number;               // average cost per unit  (REAL — from Zerodha book)
  cmp: number;               // current price  (SAMPLE — replaced by live API)
  cs: Holding["coreSatellite"];
  v: NonNullable<Holding["vehicle"]>;
  broker: string;            // custodian where held
  costSource?: string;       // where the cost basis came from
  costUnknown?: boolean;     // in custody, no cost record
  pd: string;                // first purchase date (ISO)
};

// ---------------------------------------------------------------------------
// The book — real qty + real average cost. cmp is a sample snapshot.
// ---------------------------------------------------------------------------
const SEED: Seed[] = [
  { t: "ABB",       n: "ABB India Ltd.",                 isin: "INE117A01022", s: "Industrials",             q: 675,    avg: 5136.83, cmp: 5450,  cs: "Core",      v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "ANTELOPUS", n: "Antelopus Selan Energy Ltd.",    isin: "INE818A01017", s: "Energy",                  q: 10000,  avg: 557.29,  cmp: 610,   cs: "Satellite", v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "CONCOR",    n: "Container Corp. of India Ltd.",  isin: "INE111A01025", s: "Industrials",             q: 4266,   avg: 555.64,  cmp: 690,   cs: "Core",      v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "EIDPARRY",  n: "EID Parry (India) Ltd.",         isin: "INE126A01031", s: "Consumer Staples",        q: 6500,   avg: 785.08,  cmp: 1140,  cs: "Satellite", v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "ENRIN",     n: "Siemens Energy India Ltd.",      isin: "INE1NPP01017", s: "Industrials",             q: 1000,   avg: 2440.30, cmp: 2985,  cs: "Satellite", v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "GMDCLTD",   n: "Gujarat Mineral Dev. Corp Ltd.", isin: "INE131A01031", s: "Materials",               q: 5428,   avg: 512.64,  cmp: 470,   cs: "Satellite", v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "GPPL",      n: "Gujarat Pipavav Port Ltd.",      isin: "INE517F01014", s: "Industrials",             q: 4800,   avg: 160.34,  cmp: 178,   cs: "Satellite", v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "HINDALCO",  n: "Hindalco Industries Ltd.",       isin: "INE038A01020", s: "Materials",               q: 3000,   avg: 799.87,  cmp: 895,   cs: "Core",      v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "IRCTC",     n: "Indian Railway Catering & Tourism", isin: "INE335Y01020", s: "Consumer Discretionary", q: 8000, avg: 597.66, cmp: 812,   cs: "Core",      v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "JUBLFOOD",  n: "Jubilant FoodWorks Ltd.",        isin: "INE797F01020", s: "Consumer Discretionary",  q: 10000,  avg: 501.66,  cmp: 690,   cs: "Satellite", v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "LT",        n: "Larsen & Toubro Ltd.",           isin: "INE018A01030", s: "Industrials",             q: 1300,   avg: 3875.86, cmp: 3720,  cs: "Core",      v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "NMDC",      n: "NMDC Ltd.",                      isin: "INE584A01023", s: "Materials",               q: 65000,  avg: 75.35,   cmp: 71.2,  cs: "Core",      v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "PGEL",      n: "PG Electroplast Ltd.",           isin: "INE457L01029", s: "Consumer Discretionary",  q: 4000,   avg: 565.49,  cmp: 940,   cs: "Satellite", v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "TATASTEEL", n: "Tata Steel Ltd.",               isin: "INE081A01020", s: "Materials",               q: 20000,  avg: 188.75,  cmp: 172,   cs: "Core",      v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },
  { t: "THERMAX",   n: "Thermax Ltd.",                   isin: "INE152A01029", s: "Industrials",             q: 1140,   avg: 3030.78, cmp: 3480,  cs: "Satellite", v: "Direct Equity", broker: "Axis", costSource: "Zerodha", pd: "2025-08-13" },

  // Mutual fund — INF ISIN, held via AMC (not in the demat). Cost is real.
  { t: "ENERGY",    n: "Energy Opportunities Fund",      isin: "INF769K01PR2", s: "Energy",                  q: 150000, avg: 34.46,   cmp: 41.2,  cs: "Satellite", v: "Mutual Fund",   broker: "MF · AMC", costSource: "Zerodha", pd: "2025-08-13" },

  // In Axis demat, NO Zerodha buy → cost unknown. avg/cmp for cost are ignored.
  { t: "DCB",       n: "DCB Bank Ltd.",                  isin: "INE503A01015", s: "Financials",              q: 13868,  avg: 0,       cmp: 148,   cs: "Satellite", v: "Direct Equity", broker: "Axis", costUnknown: true, pd: "2026-05-20" },
];

function toHolding(seed: Seed): Omit<Holding, "portfolioWeight"> {
  const marketValue = seed.q * seed.cmp;
  const costBasis = seed.costUnknown ? 0 : seed.q * seed.avg;
  const unrealizedPnL = seed.costUnknown ? 0 : marketValue - costBasis;
  const returnPct = seed.costUnknown || seed.avg <= 0 ? 0 : ((seed.cmp - seed.avg) / seed.avg) * 100;
  const isManaged = MANAGER_VEHICLES.includes(seed.v);

  return {
    ticker: seed.t,
    companyName: seed.n,
    assetClass: seed.v === "Mutual Fund" ? "Equity" : "Equity",
    sector: seed.s,
    geography: "India",
    quantity: seed.q,
    averageCost: seed.avg,
    currentPrice: seed.cmp,
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
    marketValueBase: marketValue,
    costBasisBase: costBasis,
    unrealizedPnLBase: unrealizedPnL,
  };
}

function buildPortfolio(): Portfolio {
  const partial = SEED.map(toHolding);
  const navBase = partial.reduce((sum, h) => sum + (h.marketValueBase ?? h.marketValue), 0);
  const holdings: Holding[] = partial.map((h) => ({
    ...h,
    portfolioWeight: navBase > 0 ? (h.marketValueBase ?? h.marketValue) / navBase : 0,
  }));

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

const counts = (() => {
  const h = MOCK_PORTFOLIO.holdings;
  return { rows: h.length, current: h.filter((x) => x.status === "Current").length };
})();

export const MOCK_UPLOADS: UploadEvent[] = [
  {
    uploadId: MOCK_PORTFOLIO.id,
    fileName: MOCK_PORTFOLIO.fileName,
    uploadedAt: MOCK_PORTFOLIO.uploadedAt,
    numberOfRows: counts.rows,
    totalPortfolioValue: MOCK_PORTFOLIO.totalValue,
    countCurrent: counts.current,
    countExited: 0,
    countWatchlist: 0,
    checksum: MOCK_PORTFOLIO.checksum,
    warnings: [],
  },
];
