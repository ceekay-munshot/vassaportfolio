// Non-portfolio types for the news/research/recommendations data layer.
// Portfolio-specific types live in src/lib/portfolioTypes.ts.

export type Sector =
  | "Technology"
  | "Financials"
  | "Healthcare"
  | "Consumer Discretionary"
  | "Consumer Staples"
  | "Energy"
  | "Industrials"
  | "Materials"
  | "Real Estate"
  | "Utilities"
  | "Communication Services"
  | "Diversified";

export type NewsItem = {
  id: string;
  title: string;
  source: string;
  date: string;
  summary: string;
  impact: "positive" | "negative" | "neutral";
  tickers: string[];
  sectors: Sector[];
  importance: "high" | "medium" | "low";
  sourceUrl?: string;
};

export type BrokerReport = {
  id: string;
  broker: string;
  date: string;
  title: string;
  sector?: Sector;
  tickers: string[];
  ratingChange?: { from: string; to: string };
  priceTargetChange?: { from: number; to: number; currency: string };
  summary: string;
  recommendation: "BUY" | "HOLD" | "SELL" | "OVERWEIGHT" | "UNDERWEIGHT";
  keyTakeaways: string[];
  relevance: "high" | "medium" | "low";
};

export type Recommendation = {
  id: string;
  date: string;
  type: "REBALANCE" | "ADD" | "TRIM" | "EXIT" | "WATCH" | "HEDGE";
  priority: "high" | "medium" | "low";
  title: string;
  rationale: string;
  affectedTickers: string[];
  suggestedAction: string;
  evidenceIds: string[];
  confidence: number;
  expectedImpact?: string;
};

export type SourceDoc = {
  id: string;
  name: string;
  type:
    | "Broker Report"
    | "News"
    | "Regulatory"
    | "Earnings"
    | "Macro"
    | "Internal Memo";
  date: string;
  url?: string;
  summary: string;
  relatedTickers: string[];
  relatedSectors: Sector[];
};

export type BenchmarkPoint = {
  date: string;
  portfolio: number;
  benchmark: number;
};
