// Look-through holdings for each managed vehicle (mutual fund / PMS / AIF).
// Keyed by the manager string used in the portfolio upload. Weights are the
// fund's disclosed allocation to each underlying (0..1); the remainder up to
// 1.0 is treated as "Other holdings & cash".
//
// This is what powers the consolidated single-stock exposure and overlap
// detection the family asked for: "if you're taking exposure to direct equity,
// there should not be an overlap [with the funds]." All names are Indian.

export type LookthroughLine = {
  ticker: string;
  companyName: string;
  weight: number; // 0..1 of the fund's NAV
};

export const FUND_LOOKTHROUGH: Record<string, LookthroughLine[]> = {
  // --- Mutual funds ---------------------------------------------------------
  "Parag Parikh Flexi Cap": [
    { ticker: "HDFCBANK", companyName: "HDFC Bank Ltd.", weight: 0.078 },
    { ticker: "BAJFINANCE", companyName: "Bajaj Finance Ltd.", weight: 0.065 },
    { ticker: "ITC", companyName: "ITC Ltd.", weight: 0.058 },
    { ticker: "ICICIBANK", companyName: "ICICI Bank Ltd.", weight: 0.052 },
    { ticker: "POWERGRID", companyName: "Power Grid Corp.", weight: 0.046 },
    { ticker: "COALINDIA", companyName: "Coal India Ltd.", weight: 0.041 },
    { ticker: "MARUTI", companyName: "Maruti Suzuki India Ltd.", weight: 0.038 },
    { ticker: "INFY", companyName: "Infosys Ltd.", weight: 0.034 },
  ],
  "HDFC Mid-Cap Opportunities": [
    { ticker: "MAXHEALTH", companyName: "Max Healthcare Institute", weight: 0.062 },
    { ticker: "PERSISTENT", companyName: "Persistent Systems Ltd.", weight: 0.051 },
    { ticker: "COFORGE", companyName: "Coforge Ltd.", weight: 0.047 },
    { ticker: "FEDERALBNK", companyName: "Federal Bank Ltd.", weight: 0.044 },
    { ticker: "BALKRISIND", companyName: "Balkrishna Industries", weight: 0.039 },
    { ticker: "IPCALAB", companyName: "Ipca Laboratories Ltd.", weight: 0.036 },
    { ticker: "SUNPHARMA", companyName: "Sun Pharmaceutical Industries", weight: 0.031 },
  ],
  "ICICI Pru Bluechip": [
    { ticker: "RELIANCE", companyName: "Reliance Industries Ltd.", weight: 0.091 },
    { ticker: "HDFCBANK", companyName: "HDFC Bank Ltd.", weight: 0.084 },
    { ticker: "ICICIBANK", companyName: "ICICI Bank Ltd.", weight: 0.072 },
    { ticker: "INFY", companyName: "Infosys Ltd.", weight: 0.058 },
    { ticker: "LT", companyName: "Larsen and Toubro Ltd.", weight: 0.046 },
    { ticker: "BHARTIARTL", companyName: "Bharti Airtel Ltd.", weight: 0.043 },
    { ticker: "TCS", companyName: "Tata Consultancy Services", weight: 0.038 },
    { ticker: "AXISBANK", companyName: "Axis Bank Ltd.", weight: 0.034 },
  ],
  "Nippon India Small Cap": [
    { ticker: "KPITTECH", companyName: "KPIT Technologies Ltd.", weight: 0.034 },
    { ticker: "CYIENT", companyName: "Cyient Ltd.", weight: 0.029 },
    { ticker: "MCX", companyName: "Multi Commodity Exchange", weight: 0.027 },
    { ticker: "RADICO", companyName: "Radico Khaitan Ltd.", weight: 0.025 },
    { ticker: "CREDITACC", companyName: "CreditAccess Grameen", weight: 0.023 },
    { ticker: "APARINDS", companyName: "Apar Industries Ltd.", weight: 0.021 },
  ],
  "SBI Contra": [
    { ticker: "ICICIBANK", companyName: "ICICI Bank Ltd.", weight: 0.058 },
    { ticker: "RELIANCE", companyName: "Reliance Industries Ltd.", weight: 0.049 },
    { ticker: "GAIL", companyName: "GAIL (India) Ltd.", weight: 0.041 },
    { ticker: "NTPC", companyName: "NTPC Ltd.", weight: 0.038 },
    { ticker: "TECHM", companyName: "Tech Mahindra Ltd.", weight: 0.033 },
    { ticker: "ITC", companyName: "ITC Ltd.", weight: 0.031 },
  ],

  // --- PMS ------------------------------------------------------------------
  "Marcellus CCP": [
    { ticker: "ASIANPAINT", companyName: "Asian Paints Ltd.", weight: 0.102 },
    { ticker: "PIDILITIND", companyName: "Pidilite Industries Ltd.", weight: 0.094 },
    { ticker: "TITAN", companyName: "Titan Company Ltd.", weight: 0.088 },
    { ticker: "NESTLEIND", companyName: "Nestle India Ltd.", weight: 0.081 },
    { ticker: "HDFCBANK", companyName: "HDFC Bank Ltd.", weight: 0.076 },
    { ticker: "BAJFINANCE", companyName: "Bajaj Finance Ltd.", weight: 0.071 },
    { ticker: "DRREDDY", companyName: "Dr. Reddy's Laboratories", weight: 0.062 },
  ],
  "Motilal Oswal NTDOP": [
    { ticker: "TRENT", companyName: "Trent Ltd.", weight: 0.084 },
    { ticker: "PERSISTENT", companyName: "Persistent Systems Ltd.", weight: 0.072 },
    { ticker: "ICICIBANK", companyName: "ICICI Bank Ltd.", weight: 0.066 },
    { ticker: "POLYCAB", companyName: "Polycab India Ltd.", weight: 0.058 },
    { ticker: "KALYANKJIL", companyName: "Kalyan Jewellers India", weight: 0.051 },
    { ticker: "MARUTI", companyName: "Maruti Suzuki India Ltd.", weight: 0.044 },
  ],
  "ASK IEP": [
    { ticker: "HDFCBANK", companyName: "HDFC Bank Ltd.", weight: 0.089 },
    { ticker: "BAJFINANCE", companyName: "Bajaj Finance Ltd.", weight: 0.078 },
    { ticker: "TITAN", companyName: "Titan Company Ltd.", weight: 0.071 },
    { ticker: "ASIANPAINT", companyName: "Asian Paints Ltd.", weight: 0.064 },
    { ticker: "INFY", companyName: "Infosys Ltd.", weight: 0.057 },
    { ticker: "DIVISLAB", companyName: "Divi's Laboratories Ltd.", weight: 0.049 },
  ],

  // --- AIF ------------------------------------------------------------------
  "Abakkus Emerging Opp": [
    { ticker: "FEDERALBNK", companyName: "Federal Bank Ltd.", weight: 0.058 },
    { ticker: "COFORGE", companyName: "Coforge Ltd.", weight: 0.052 },
    { ticker: "PNB", companyName: "Punjab National Bank", weight: 0.047 },
    { ticker: "ASHOKLEY", companyName: "Ashok Leyland Ltd.", weight: 0.043 },
    { ticker: "SONACOMS", companyName: "Sona BLW Precision", weight: 0.038 },
    { ticker: "SUNPHARMA", companyName: "Sun Pharmaceutical Industries", weight: 0.033 },
  ],
  "Avendus Absolute Return": [
    { ticker: "RELIANCE", companyName: "Reliance Industries Ltd.", weight: 0.041 },
    { ticker: "HDFCBANK", companyName: "HDFC Bank Ltd.", weight: 0.038 },
    { ticker: "TCS", companyName: "Tata Consultancy Services", weight: 0.029 },
    { ticker: "ICICIBANK", companyName: "ICICI Bank Ltd.", weight: 0.027 },
  ],
  "White Oak India Equity": [
    { ticker: "ICICIBANK", companyName: "ICICI Bank Ltd.", weight: 0.071 },
    { ticker: "HDFCBANK", companyName: "HDFC Bank Ltd.", weight: 0.066 },
    { ticker: "INFY", companyName: "Infosys Ltd.", weight: 0.054 },
    { ticker: "BHARTIARTL", companyName: "Bharti Airtel Ltd.", weight: 0.048 },
    { ticker: "TITAN", companyName: "Titan Company Ltd.", weight: 0.043 },
    { ticker: "LT", companyName: "Larsen and Toubro Ltd.", weight: 0.039 },
  ],
};

// True if we have published look-through for this manager string.
export const hasLookthrough = (manager: string): boolean => manager in FUND_LOOKTHROUGH;
