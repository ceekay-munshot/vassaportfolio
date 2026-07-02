import type { NewsItem } from "@/types";

const isoDaysAgo = (d: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  dt.setHours(8 + (d % 8), (d * 13) % 60, 0, 0);
  return dt.toISOString();
};

export const MOCK_NEWS: NewsItem[] = [
  {
    id: "n1",
    title: "Reliance Q4 beats on Jio ARPU surprise; retail margin expands",
    source: "Bloomberg Quint",
    date: isoDaysAgo(0),
    summary:
      "Jio ARPU at ₹212 vs ₹208 expected; retail EBITDA margin expands 80 bps. O2C drag eases; Street upgrades sum-of-parts.",
    impact: "positive",
    tickers: ["RELIANCE"],
    sectors: ["Energy", "Communication Services"],
    importance: "high",
  },
  {
    id: "n2",
    title: "Bajaj Finance Q4 — asset quality stress accelerates in MFI book",
    source: "Mint",
    date: isoDaysAgo(1),
    summary:
      "Gross NPA up 22 bps QoQ; management tightens underwriting on unsecured retail. Street trims FY27 EPS by 6–8%.",
    impact: "negative",
    tickers: ["BAJFINANCE"],
    sectors: ["Financials"],
    importance: "high",
  },
  {
    id: "n3",
    title: "RBI holds repo at 6.50%, signals dovish bias on softer Q4 CPI",
    source: "Economic Times",
    date: isoDaysAgo(1),
    summary:
      "Private banks rally on stable NIMs outlook. HDFC Bank, ICICI Bank lead gains on benign deposit cost trajectory.",
    impact: "positive",
    tickers: ["HDFCBANK", "ICICIBANK"],
    sectors: ["Financials"],
    importance: "high",
  },
  {
    id: "n4",
    title: "TCS BSNL deal ramp slips one quarter; FY26 guidance maintained",
    source: "Moneycontrol",
    date: isoDaysAgo(2),
    summary:
      "Revenue conversion pushed to Q2FY27; deal TCV unchanged. Margins guided flat; BFSI discretionary commentary cautious.",
    impact: "negative",
    tickers: ["TCS", "INFY"],
    sectors: ["Technology"],
    importance: "medium",
  },
  {
    id: "n5",
    title: "Bharti Airtel tariff hike absorbed; ARPU climbs to ₹212",
    source: "BloombergQuint",
    date: isoDaysAgo(3),
    summary:
      "Sub churn negligible despite 11% headline hike. 5G monetization narrative gathers pace; Africa business steady.",
    impact: "positive",
    tickers: ["BHARTIARTL"],
    sectors: ["Communication Services"],
    importance: "medium",
  },
  {
    id: "n6",
    title: "Sun Pharma specialty pipeline — Ilumya scripts hit new high",
    source: "Business Standard",
    date: isoDaysAgo(3),
    summary:
      "Specialty contributes 18% of US revenue in Q4. Lupin recall flow-through benefits domestic generics share.",
    impact: "positive",
    tickers: ["SUNPHARMA"],
    sectors: ["Healthcare"],
    importance: "medium",
  },
  {
    id: "n7",
    title: "Maruti Suzuki Q4 — discounting eases, EV roadmap accelerates",
    source: "Economic Times Auto",
    date: isoDaysAgo(4),
    summary:
      "Realization up ₹16,400/unit; e-Vitara launch on track for FY26. Hybrid mix expands, supports gross margin.",
    impact: "positive",
    tickers: ["MARUTI"],
    sectors: ["Consumer Discretionary"],
    importance: "medium",
  },
  {
    id: "n8",
    title: "L&T order inflows at all-time high — defence + infra carry book",
    source: "Mint",
    date: isoDaysAgo(5),
    summary:
      "Q4 inflows ₹89,000 Cr; order book at ₹5.6 lakh Cr (3.2× FY25 revenue). Defence + Hi-tech mfg now 18% of book.",
    impact: "positive",
    tickers: ["LT"],
    sectors: ["Industrials"],
    importance: "high",
  },
  {
    id: "n9",
    title: "Titan Q4 — jewellery momentum sustains despite gold price headwind",
    source: "Moneycontrol",
    date: isoDaysAgo(5),
    summary:
      "Studded ratio inches up to 28%; new buyer additions strong. Watches & wearables margin reset largely behind.",
    impact: "positive",
    tickers: ["TITAN"],
    sectors: ["Consumer Discretionary"],
    importance: "medium",
  },
  {
    id: "n10",
    title: "NSE IPO timeline pushed to FY27 — SEBI approval still pending",
    source: "Bloomberg",
    date: isoDaysAgo(6),
    summary:
      "Pre-IPO market discount widens to 12% vs last reported transaction. Listing remains key valuation trigger for unlisted basket.",
    impact: "neutral",
    tickers: ["NSE"],
    sectors: ["Financials"],
    importance: "medium",
  },
  {
    id: "n11",
    title: "OYO refiles DRHP; valuation rationalized to $4.5B from $9B 2021 peak",
    source: "Reuters India",
    date: isoDaysAgo(7),
    summary:
      "Hotelogix integration delivers EBITDA breakeven; lender concerns on SoftBank overhang ease. IPO targeted H2FY26.",
    impact: "positive",
    tickers: ["OYO"],
    sectors: ["Consumer Discretionary"],
    importance: "medium",
  },
  {
    id: "n12",
    title: "DMart Q4 — store additions on track; gross margin steady at 14.7%",
    source: "Business Standard",
    date: isoDaysAgo(8),
    summary:
      "47 new stores in FY25; SSSG holds at 9.1%. Quick-commerce headwind narrative cools as DMart Ready scales.",
    impact: "positive",
    tickers: ["DMART"],
    sectors: ["Consumer Staples"],
    importance: "low",
  },
];
