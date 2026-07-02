// Scheme-level analytics for every managed vehicle (mutual fund / PMS / AIF).
// This is the fund-evaluation view the family asked for explicitly — rolling
// returns, risk-adjusted ratios, and capture ratios versus the benchmark —
// NOT AMC-stock analytics. Keyed by the manager string used in the upload.
// Figures are illustrative until a live AMFI / scheme-NAV feed is connected.

export type FundMetrics = {
  manager: string;            // matches Holding.manager
  category: string;           // Flexi Cap, Mid Cap, Cat III AIF, etc.
  vehicle: "Mutual Fund" | "PMS" | "AIF";
  benchmark: string;
  expenseRatio: number;       // % (TER / fixed fee)
  // Trailing annualized (rolling) returns, %
  ret1y: number;
  ret3y: number;             // CAGR
  ret5y: number;             // CAGR
  retSinceInception: number; // CAGR
  benchRet3y: number;        // benchmark CAGR over 3y for the active comparison
  // Risk / risk-adjusted
  stdDev: number;            // annualized volatility, %
  sharpe: number;
  sortino: number;
  treynor: number;
  beta: number;
  alpha: number;             // annualized, %
  upCapture: number;         // %
  downCapture: number;       // %
  maxDrawdown: number;       // %, negative
};

export const FUND_ANALYTICS: FundMetrics[] = [
  {
    manager: "Parag Parikh Flexi Cap", category: "Flexi Cap", vehicle: "Mutual Fund",
    benchmark: "NIFTY 500 TRI", expenseRatio: 0.63,
    ret1y: 21.4, ret3y: 18.9, ret5y: 22.6, retSinceInception: 19.8, benchRet3y: 15.2,
    stdDev: 12.8, sharpe: 1.42, sortino: 2.08, treynor: 0.21, beta: 0.86, alpha: 4.1,
    upCapture: 98, downCapture: 74, maxDrawdown: -16.3,
  },
  {
    manager: "HDFC Mid-Cap Opportunities", category: "Mid Cap", vehicle: "Mutual Fund",
    benchmark: "NIFTY Midcap 150 TRI", expenseRatio: 0.74,
    ret1y: 28.7, ret3y: 26.4, ret5y: 29.1, retSinceInception: 20.4, benchRet3y: 24.8,
    stdDev: 16.9, sharpe: 1.31, sortino: 1.86, treynor: 0.24, beta: 0.94, alpha: 2.3,
    upCapture: 104, downCapture: 89, maxDrawdown: -22.8,
  },
  {
    manager: "ICICI Pru Bluechip", category: "Large Cap", vehicle: "Mutual Fund",
    benchmark: "NIFTY 100 TRI", expenseRatio: 0.91,
    ret1y: 17.2, ret3y: 16.1, ret5y: 18.4, retSinceInception: 15.1, benchRet3y: 14.6,
    stdDev: 11.4, sharpe: 1.28, sortino: 1.79, treynor: 0.18, beta: 0.97, alpha: 1.6,
    upCapture: 99, downCapture: 86, maxDrawdown: -14.9,
  },
  {
    manager: "Nippon India Small Cap", category: "Small Cap", vehicle: "Mutual Fund",
    benchmark: "NIFTY Smallcap 250 TRI", expenseRatio: 0.68,
    ret1y: 34.1, ret3y: 31.8, ret5y: 35.2, retSinceInception: 22.7, benchRet3y: 28.1,
    stdDev: 19.6, sharpe: 1.39, sortino: 1.94, treynor: 0.29, beta: 0.91, alpha: 4.8,
    upCapture: 108, downCapture: 82, maxDrawdown: -27.4,
  },
  {
    manager: "SBI Contra", category: "Contra", vehicle: "Mutual Fund",
    benchmark: "BSE 500 TRI", expenseRatio: 0.61,
    ret1y: 22.9, ret3y: 24.6, ret5y: 27.8, retSinceInception: 17.9, benchRet3y: 15.4,
    stdDev: 14.1, sharpe: 1.47, sortino: 2.11, treynor: 0.26, beta: 0.89, alpha: 5.2,
    upCapture: 102, downCapture: 71, maxDrawdown: -18.1,
  },
  {
    manager: "Marcellus CCP", category: "PMS — Consistent Compounders", vehicle: "PMS",
    benchmark: "NIFTY 500 TRI", expenseRatio: 1.50,
    ret1y: 14.8, ret3y: 13.2, ret5y: 17.9, retSinceInception: 16.4, benchRet3y: 15.2,
    stdDev: 13.7, sharpe: 0.96, sortino: 1.38, treynor: 0.15, beta: 0.81, alpha: -1.4,
    upCapture: 88, downCapture: 79, maxDrawdown: -19.6,
  },
  {
    manager: "Motilal Oswal NTDOP", category: "PMS — Next Trillion Dollar", vehicle: "PMS",
    benchmark: "NIFTY 500 TRI", expenseRatio: 1.50,
    ret1y: 26.3, ret3y: 22.1, ret5y: 21.4, retSinceInception: 18.2, benchRet3y: 15.2,
    stdDev: 15.8, sharpe: 1.24, sortino: 1.71, treynor: 0.23, beta: 0.93, alpha: 3.6,
    upCapture: 103, downCapture: 84, maxDrawdown: -23.2,
  },
  {
    manager: "ASK IEP", category: "PMS — Indian Entrepreneur", vehicle: "PMS",
    benchmark: "NIFTY 500 TRI", expenseRatio: 1.50,
    ret1y: 18.6, ret3y: 17.4, ret5y: 19.8, retSinceInception: 17.1, benchRet3y: 15.2,
    stdDev: 13.2, sharpe: 1.18, sortino: 1.64, treynor: 0.19, beta: 0.87, alpha: 2.1,
    upCapture: 95, downCapture: 81, maxDrawdown: -17.8,
  },
  {
    manager: "Abakkus Emerging Opp", category: "Cat III AIF — Emerging", vehicle: "AIF",
    benchmark: "NIFTY Midcap 150 TRI", expenseRatio: 2.00,
    ret1y: 31.2, ret3y: 27.9, ret5y: 28.4, retSinceInception: 24.1, benchRet3y: 24.8,
    stdDev: 17.4, sharpe: 1.34, sortino: 1.88, treynor: 0.27, beta: 0.92, alpha: 3.1,
    upCapture: 106, downCapture: 83, maxDrawdown: -24.6,
  },
  {
    manager: "Avendus Absolute Return", category: "Cat III AIF — Long/Short", vehicle: "AIF",
    benchmark: "NIFTY 50 TRI", expenseRatio: 2.00,
    ret1y: 11.4, ret3y: 12.8, ret5y: 13.6, retSinceInception: 12.9, benchRet3y: 14.1,
    stdDev: 6.9, sharpe: 1.52, sortino: 2.34, treynor: 0.34, beta: 0.38, alpha: 5.8,
    upCapture: 52, downCapture: 28, maxDrawdown: -6.4,
  },
  {
    manager: "White Oak India Equity", category: "Cat III AIF — Equity", vehicle: "AIF",
    benchmark: "BSE 500 TRI", expenseRatio: 2.00,
    ret1y: 23.7, ret3y: 20.6, ret5y: 22.1, retSinceInception: 19.4, benchRet3y: 15.4,
    stdDev: 14.6, sharpe: 1.29, sortino: 1.82, treynor: 0.24, beta: 0.90, alpha: 4.4,
    upCapture: 101, downCapture: 78, maxDrawdown: -18.9,
  },
];

export const fundMetricsFor = (manager: string): FundMetrics | undefined =>
  FUND_ANALYTICS.find((f) => f.manager === manager);
