// FX conversion utilities.
//
// Rates are intentionally static here. A real implementation would pull
// from a daily-rates feed; for now we bake in a single snapshot so a
// portfolio that mixes USD-denominated and INR-denominated holdings can
// still display a coherent total in whichever base currency dominates.
//
// To refresh the rates later, replace RATES_USD with values from your
// preferred source (e.g., ECB, OANDA daily fix). The rest of the app
// doesn't need to change.

export const SUPPORTED_DISPLAY_CURRENCIES = ["USD", "INR", "EUR", "GBP"] as const;
export type DisplayCurrency = (typeof SUPPORTED_DISPLAY_CURRENCIES)[number];

// 1 unit of [code] = N USD.
const RATES_USD: Record<string, number> = {
  USD: 1,
  INR: 1 / 83.5,
  EUR: 1.08,
  GBP: 1.27,
  JPY: 0.0064,
  HKD: 0.128,
  SGD: 0.74,
  CAD: 0.73,
  AUD: 0.66,
  CNY: 0.138,
};

export function rateToUSD(code: string): number {
  return RATES_USD[code] ?? 1;
}

// Convert an amount from one currency to another. Unknown currencies are
// treated as USD-equivalent (no-op) — the parser warns when it can't
// classify a holding so the user knows.
export function fxConvert(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  const usd = amount * rateToUSD(from);
  const toRate = rateToUSD(to);
  return toRate === 0 ? usd : usd / toRate;
}

// Map a geography string (parsed from the user's file) to an ISO currency
// code. The product's primary user base is Indian family offices, so
// anything we can't classify is treated as INR.
export function currencyForGeography(geo: string): string {
  const map: Record<string, string> = {
    US: "USD",
    USA: "USD",
    "United States": "USD",
    India: "INR",
    IN: "INR",
    UK: "GBP",
    "United Kingdom": "GBP",
    Europe: "EUR",
    EU: "EUR",
    "Hong Kong": "HKD",
    HK: "HKD",
    Canada: "CAD",
    Japan: "JPY",
    Singapore: "SGD",
    Australia: "AUD",
    China: "CNY",
    Global: "INR",
    Unknown: "INR",
  };
  return map[geo] ?? "INR";
}

// India-first base-currency rule:
//   - If *every* holding is in USD, the portfolio is a pure-US book and
//     we display in USD.
//   - Otherwise (single non-USD currency, or any mixed combination), we
//     default to INR — the currency our Indian family-office users think
//     in. Cross-currency holdings get FX-converted to INR for aggregates.
export function determineBaseCurrency(
  holdings: { currency: string; marketValue: number }[],
): DisplayCurrency {
  if (holdings.length === 0) return "INR";

  const distinct = new Set(holdings.map((h) => h.currency));
  if (distinct.size === 1 && [...distinct][0] === "USD") return "USD";
  return "INR";
}
