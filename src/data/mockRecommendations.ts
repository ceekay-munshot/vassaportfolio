import type { Recommendation } from "@/types";

const isoDaysAgo = (d: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt.toISOString();
};

export const MOCK_RECOMMENDATIONS: Recommendation[] = [
  {
    id: "r1",
    date: isoDaysAgo(0),
    type: "EXIT",
    priority: "high",
    title: "Exit BAJFINANCE — asset quality reset under way",
    rationale:
      "Macquarie cut to Underperform, PT ₹6,600. Kotak also moved to Reduce. Unsecured + MFI book stress accelerating; management tightening underwriting (2+ quarters of muted growth). Risk/reward unfavorable vs HDFCB and ICICI at comparable valuation.",
    affectedTickers: ["BAJFINANCE"],
    suggestedAction: "Exit full BAJFINANCE position. Reinvest in HDFC Bank (already core overweight) and ICICI Bank.",
    evidenceIds: ["br2", "br9", "n2"],
    confidence: 78,
    expectedImpact: "Improves Financials sleeve quality; reduces unsecured retail exposure to nil. Cuts drawdown contribution ~110 bps.",
  },
  {
    id: "r2",
    date: isoDaysAgo(0),
    type: "ADD",
    priority: "high",
    title: "Add to BHARTIARTL on tariff cycle re-rating",
    rationale:
      "JM Financial upgraded to Buy, PT ₹1,950. ARPU at ₹212 with negligible churn confirms pricing power. FCF inflection in FY27 as capex intensity peaks. Communication Services sleeve underweight by 220 bps.",
    affectedTickers: ["BHARTIARTL"],
    suggestedAction: "Increase BHARTIARTL weight from 4.5% → 6.2%. Funded from BAF exit proceeds and cash sleeve.",
    evidenceIds: ["br5", "n5"],
    confidence: 80,
    expectedImpact: "Closes Communication Services sleeve gap; expected sleeve return +160 bps.",
  },
  {
    id: "r3",
    date: isoDaysAgo(1),
    type: "REBALANCE",
    priority: "high",
    title: "Trim RELIANCE satellite overweight back toward target",
    rationale:
      "RELIANCE position has compounded to 9.4% from ~6% cost basis on Jio re-rating + retail margin expansion. Concentration risk is now the largest single-name in the book. Thesis intact but position-sizing discipline warranted.",
    affectedTickers: ["RELIANCE"],
    suggestedAction: "Sell ~25% of RELIANCE position to bring weight to ~7%. Move proceeds: half to cash buffer, half to under-weight Consumer Staples sleeve (DMART, ITC).",
    evidenceIds: ["br1", "n1"],
    confidence: 82,
    expectedImpact: "Position-level VaR drops 22%; portfolio Sharpe estimated +0.06.",
  },
  {
    id: "r4",
    date: isoDaysAgo(1),
    type: "ADD",
    priority: "medium",
    title: "Add to SUNPHARMA on specialty pipeline inflection",
    rationale:
      "Antique PT raised to ₹2,150 on Ilumya + Cequa specialty franchise scaling. Healthcare sleeve is 180 bps below target — natural place to add quality compounding. Halol re-inspection risk monitorable.",
    affectedTickers: ["SUNPHARMA"],
    suggestedAction: "Increase SUNPHARMA weight from 4.2% → 5.6%. Funded from cash sleeve.",
    evidenceIds: ["br6", "n6"],
    confidence: 74,
    expectedImpact: "Healthcare sleeve aligned to target; expected return +130 bps.",
  },
  {
    id: "r5",
    date: isoDaysAgo(2),
    type: "WATCH",
    priority: "medium",
    title: "Watch Indian IT — discretionary cycle bottoming but mixed",
    rationale:
      "Bernstein notes order book improving but no V-shape. TCS BSNL ramp slipped a quarter. Infosys preferred on margin levers. Position sizes appropriate; revisit after Q1FY27 prints.",
    affectedTickers: ["TCS", "INFY"],
    suggestedAction: "Hold current weights. Set alerts on margin commentary, BFSI discretionary spend, and Gen-AI deal TCV trajectory.",
    evidenceIds: ["br4", "n4"],
    confidence: 60,
    expectedImpact: "No portfolio impact today; positioning maintains optionality.",
  },
  {
    id: "r6",
    date: isoDaysAgo(3),
    type: "ADD",
    priority: "medium",
    title: "Increase NSE pre-IPO position on listing delay",
    rationale:
      "NSE IPO pushed to FY27; pre-IPO market discount widened to 12%. Edelweiss flags fair value ₹4,800–₹5,200 post-listing. Unlisted basket diversification benefit + structural compounding story intact.",
    affectedTickers: ["NSE"],
    suggestedAction: "Increase NSE weight in unlisted sleeve from 0.8% → 1.5%. Fund via secondary block from existing relationship desk.",
    evidenceIds: ["br10", "n10"],
    confidence: 68,
    expectedImpact: "Strengthens unlisted sleeve; expected listing pop captures 30–40% upside over 18–24 months.",
  },
  {
    id: "r7",
    date: isoDaysAgo(4),
    type: "ADD",
    priority: "low",
    title: "Initiate Consumer Staples diversification — ITC or DMART",
    rationale:
      "Consumer Staples sleeve below 6% target; only meaningful staples holding is DMART at 1.4%. Adding ITC (defensive cash-flow + dividend yield) or scaling DMART lowers portfolio beta during macro de-risking.",
    affectedTickers: ["ITC", "DMART"],
    suggestedAction: "Initiate 2% ITC position OR scale DMART from 1.4% → 3.5%. Funded from RELIANCE trim (see r3).",
    evidenceIds: ["n12"],
    confidence: 55,
    expectedImpact: "Portfolio beta down ~0.05; staples sleeve aligned to target.",
  },
];
