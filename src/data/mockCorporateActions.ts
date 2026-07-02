// Corporate actions auto-populated against the book — splits, bonuses,
// dividends, buybacks, demergers, rights. The family asked for this as a tab
// "just like the news tab", wired to NSE/BSE filings with alerts. All Indian.

export type CorpActionType =
  | "Dividend"
  | "Stock Split"
  | "Bonus"
  | "Buyback"
  | "Demerger"
  | "Merger"
  | "Rights"
  | "AGM";

export type CorpActionStatus = "Upcoming" | "Ex-date soon" | "Announced" | "Completed";

export type CorporateAction = {
  id: string;
  ticker: string;
  companyName: string;
  type: CorpActionType;
  status: CorpActionStatus;
  exDate: string;            // ISO — ex / record / effective date
  detail: string;            // "₹10/share", "1:1", "5:1 split", etc.
  note: string;
  source: string;            // filing source
  impact: "positive" | "neutral" | "info";
};

const day = (offset: number): string => {
  const d = new Date("2026-06-30T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

export const MOCK_CORPORATE_ACTIONS: CorporateAction[] = [
  {
    id: "ca1", ticker: "RELIANCE", companyName: "Reliance Industries Ltd.",
    type: "Dividend", status: "Ex-date soon", exDate: day(4),
    detail: "₹11.00 / share (final FY26)", note: "Estimated inflow ₹82.5 L on your 7.5 L shares.",
    source: "BSE filing · 28 Jun 2026", impact: "positive",
  },
  {
    id: "ca2", ticker: "BHARTIARTL", companyName: "Bharti Airtel Ltd.",
    type: "Bonus", status: "Announced", exDate: day(18),
    detail: "1:2 bonus (1 new for every 2 held)", note: "Holding rises 5.0 L → 7.5 L shares; cost/share rebased.",
    source: "NSE corporate announcement · 26 Jun 2026", impact: "positive",
  },
  {
    id: "ca3", ticker: "ITC", companyName: "ITC Ltd.",
    type: "Demerger", status: "Announced", exDate: day(34),
    detail: "ITC Hotels demerger — 1 ITC Hotels share per 10 ITC", note: "New listed entity will appear in the book post record date.",
    source: "BSE filing · 21 Jun 2026", impact: "info",
  },
  {
    id: "ca4", ticker: "TITAN", companyName: "Titan Company Ltd.",
    type: "Dividend", status: "Upcoming", exDate: day(12),
    detail: "₹11.00 / share (final)", note: "Estimated inflow ₹24.2 L on 2.2 L shares.",
    source: "NSE filing · 24 Jun 2026", impact: "positive",
  },
  {
    id: "ca5", ticker: "INFY", companyName: "Infosys Ltd.",
    type: "Buyback", status: "Announced", exDate: day(26),
    detail: "₹18,000 Cr buyback @ ₹2,100 (tender)", note: "Acceptance ratio est. ~14%; review tender participation.",
    source: "BSE filing · 20 Jun 2026", impact: "positive",
  },
  {
    id: "ca6", ticker: "TCS", companyName: "Tata Consultancy Services",
    type: "Dividend", status: "Completed", exDate: day(-9),
    detail: "₹27.00 / share (incl. special)", note: "Credited ₹1.22 Cr on 4.5 L shares; reflected in cash.",
    source: "NSE filing · 18 Jun 2026", impact: "positive",
  },
  {
    id: "ca7", ticker: "LT", companyName: "Larsen and Toubro Ltd.",
    type: "Stock Split", status: "Announced", exDate: day(40),
    detail: "5:1 split (₹2 → ₹0.40 face value)", note: "Quantity 2.0 L → 10.0 L; per-share price rebased, value unchanged.",
    source: "BSE filing · 16 Jun 2026", impact: "neutral",
  },
  {
    id: "ca8", ticker: "MARUTI", companyName: "Maruti Suzuki India Ltd.",
    type: "Dividend", status: "Upcoming", exDate: day(21),
    detail: "₹125.00 / share (final)", note: "Estimated inflow ₹1.0 Cr on 80 K shares.",
    source: "NSE filing · 23 Jun 2026", impact: "positive",
  },
  {
    id: "ca9", ticker: "SUNPHARMA", companyName: "Sun Pharmaceutical Industries",
    type: "Dividend", status: "Announced", exDate: day(15),
    detail: "₹6.50 / share (interim)", note: "Estimated inflow ₹18.2 L on 2.8 L shares.",
    source: "BSE filing · 19 Jun 2026", impact: "positive",
  },
  {
    id: "ca10", ticker: "ICICIBANK", companyName: "ICICI Bank Ltd.",
    type: "AGM", status: "Upcoming", exDate: day(9),
    detail: "AGM — FY26 results adoption & dividend approval", note: "Dividend of ₹11/share on the agenda; record date to follow.",
    source: "NSE filing · 27 Jun 2026", impact: "neutral",
  },
  {
    id: "ca11", ticker: "EMBASSYREIT", companyName: "Embassy Office Parks REIT",
    type: "Dividend", status: "Ex-date soon", exDate: day(6),
    detail: "₹5.40 / unit distribution (Q4)", note: "Estimated inflow ₹1.35 Cr on 25 L units.",
    source: "NSE filing · 25 Jun 2026", impact: "positive",
  },
  {
    id: "ca12", ticker: "ADANIENT", companyName: "Adani Enterprises Ltd.",
    type: "Rights", status: "Announced", exDate: day(30),
    detail: "Rights issue 1:9 @ ₹1,800", note: "Watchlist position — decide before record date whether to subscribe.",
    source: "BSE filing · 22 Jun 2026", impact: "info",
  },
];
