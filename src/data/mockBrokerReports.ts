import type { BrokerReport } from "@/types";

const isoDaysAgo = (d: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt.toISOString();
};

export const MOCK_BROKER_REPORTS: BrokerReport[] = [
  {
    id: "br1",
    broker: "Morgan Stanley",
    date: isoDaysAgo(0),
    title: "Reliance: Jio monetization re-rating intact; raise PT",
    sector: "Energy",
    tickers: ["RELIANCE"],
    ratingChange: { from: "Overweight", to: "Overweight" },
    priceTargetChange: { from: 3050, to: 3250, currency: "INR" },
    summary:
      "Jio Q4 ARPU surprise of ₹212 (vs ₹208e) signals tariff pricing power. Retail EBITDA margin +80 bps. We move FY27 SOTP +6%.",
    recommendation: "OVERWEIGHT",
    keyTakeaways: [
      "Jio EBITDA growth tracking 22% YoY for FY27 on tariff + sub additions.",
      "Retail margin trajectory inflecting after two soft quarters.",
      "O2C drag manageable; refining cracks bottoming into H2FY27.",
    ],
    relevance: "high",
  },
  {
    id: "br2",
    broker: "Macquarie",
    date: isoDaysAgo(1),
    title: "Bajaj Finance: Asset quality reset under way",
    sector: "Financials",
    tickers: ["BAJFINANCE"],
    ratingChange: { from: "Neutral", to: "Underperform" },
    priceTargetChange: { from: 7400, to: 6600, currency: "INR" },
    summary:
      "Unsecured retail + MFI book stress accelerating; expect credit cost to peak Q2FY27. Cut EPS 9% / 6% for FY27/28.",
    recommendation: "UNDERWEIGHT",
    keyTakeaways: [
      "MFI and unsecured personal loan delinquencies rising into Q1FY27.",
      "Management tightening underwriting; AUM growth trade-off ahead.",
      "Premium multiple difficult to defend at current asset-quality trajectory.",
    ],
    relevance: "high",
  },
  {
    id: "br3",
    broker: "Jefferies",
    date: isoDaysAgo(2),
    title: "Indian Banks: Margin trajectory bottoming",
    sector: "Financials",
    tickers: ["HDFCBANK", "ICICIBANK"],
    priceTargetChange: { from: 1820, to: 1920, currency: "INR" },
    summary:
      "Deposit cost peak behind us; expect 10–15 bps NIM expansion by H2FY27. Prefer HDFCB; ICICI catching up on retail credit.",
    recommendation: "BUY",
    keyTakeaways: [
      "HDFC Bank credit-deposit ratio normalization on track.",
      "ICICI Bank retail credit growth re-accelerating post-festive.",
      "PSU bank consolidation tailwind for private-sector share.",
    ],
    relevance: "high",
  },
  {
    id: "br4",
    broker: "Bernstein",
    date: isoDaysAgo(2),
    title: "Indian IT: Discretionary cycle bottoming but mixed signals",
    sector: "Technology",
    tickers: ["TCS", "INFY"],
    summary:
      "Order book improving sequentially; BFSI commentary mixed. Prefer Infosys on better growth optionality + margin levers.",
    recommendation: "HOLD",
    keyTakeaways: [
      "TCS: BSNL ramp slip pushes FY26 revenue to lower end of guide.",
      "Infosys: Margin expansion driven by utilization + offshoring.",
      "Gen-AI deal cycles still early-stage; revenue conversion 12–18 months out.",
    ],
    relevance: "high",
  },
  {
    id: "br5",
    broker: "JM Financial",
    date: isoDaysAgo(3),
    title: "Bharti Airtel: Tariff cycle still has legs",
    sector: "Communication Services",
    tickers: ["BHARTIARTL"],
    ratingChange: { from: "Hold", to: "Buy" },
    priceTargetChange: { from: 1680, to: 1950, currency: "INR" },
    summary:
      "ARPU at ₹212 with negligible churn validates pricing power. 5G monetization narrative gathering pace. Africa business steady.",
    recommendation: "BUY",
    keyTakeaways: [
      "ARPU to cross ₹240 by FY27 on next tariff round.",
      "Capex intensity peaks FY26; FCF inflection in FY27.",
      "Africa: Stable currency provides earnings ballast.",
    ],
    relevance: "high",
  },
  {
    id: "br6",
    broker: "Antique Stock Broking",
    date: isoDaysAgo(4),
    title: "Sun Pharma: Specialty pipeline drives re-rating",
    sector: "Healthcare",
    tickers: ["SUNPHARMA"],
    ratingChange: { from: "Buy", to: "Buy" },
    priceTargetChange: { from: 1880, to: 2150, currency: "INR" },
    summary:
      "Ilumya scripts at new high; Cequa adds incremental US specialty revenue. Domestic generics gain share post-Lupin recall.",
    recommendation: "BUY",
    keyTakeaways: [
      "Specialty franchise now 18% of US revenue; gross margin accretive.",
      "Domestic formulations growing 11% YoY, ahead of IPM.",
      "Risk: Halol facility re-inspection outcome in Q2FY27.",
    ],
    relevance: "high",
  },
  {
    id: "br7",
    broker: "Nuvama",
    date: isoDaysAgo(5),
    title: "Titan: Studded ratio inflection",
    sector: "Consumer Discretionary",
    tickers: ["TITAN"],
    priceTargetChange: { from: 3650, to: 4200, currency: "INR" },
    summary:
      "Studded ratio ticks up to 28%; new buyer additions strong. Watches & wearables margin reset largely behind.",
    recommendation: "BUY",
    keyTakeaways: [
      "Jewellery same-store growth holds at 14% despite gold price headwind.",
      "Caratlane scaling well; integration synergies beginning to show.",
      "Risk: Gold import duty changes — limited but watch budget.",
    ],
    relevance: "medium",
  },
  {
    id: "br8",
    broker: "Motilal Oswal",
    date: isoDaysAgo(6),
    title: "L&T: Order book at all-time high; execution to follow",
    sector: "Industrials",
    tickers: ["LT"],
    priceTargetChange: { from: 3950, to: 4400, currency: "INR" },
    summary:
      "Order inflows ₹89,000 Cr in Q4. Order book at ₹5.6 lakh Cr — 3.2× FY25 revenue. Defence + Hi-tech mfg now 18% of book.",
    recommendation: "BUY",
    keyTakeaways: [
      "Defence opportunity inflecting; nuclear small modular reactor JV signed.",
      "Margin trajectory: 50–80 bps expansion guided for FY27.",
      "Hi-tech mfg + green energy diversification reducing infra cyclicality.",
    ],
    relevance: "high",
  },
  {
    id: "br9",
    broker: "ICICI Securities",
    date: isoDaysAgo(7),
    title: "Maruti Suzuki: EV inflection priced in",
    sector: "Consumer Discretionary",
    tickers: ["MARUTI"],
    ratingChange: { from: "Buy", to: "Hold" },
    priceTargetChange: { from: 14200, to: 13000, currency: "INR" },
    summary:
      "Discount intensity easing; realization +₹16,400/unit. e-Vitara launch on track but margin dilution risk in FY27.",
    recommendation: "HOLD",
    keyTakeaways: [
      "Hybrid mix expanding; supports gross margin near-term.",
      "EV transition to cap margins through FY27 ramp.",
      "Rural demand: leading indicators softening; monitor monsoon.",
    ],
    relevance: "medium",
  },
  {
    id: "br10",
    broker: "Edelweiss",
    date: isoDaysAgo(8),
    title: "Unlisted basket: NSE + OYO + Tata Capital — selective positioning",
    sector: "Financials",
    tickers: ["NSE", "OYO", "TATACAP"],
    summary:
      "NSE IPO delay creates better entry; OYO valuation rationalization improves risk-reward. Tata Capital pre-IPO entry getting tight.",
    recommendation: "BUY",
    keyTakeaways: [
      "NSE: Pre-IPO discount at 12%; fair value ₹4,800–₹5,200 post-listing.",
      "OYO: $4.5B valuation reasonable on FY27 EBITDA at 22× — buy on listing.",
      "Tata Capital: Pre-IPO premium has compressed; selective accumulation.",
    ],
    relevance: "medium",
  },
];
