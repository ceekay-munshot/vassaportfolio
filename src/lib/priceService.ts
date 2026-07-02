// Live price service — calls the Munshot stock API and parses its response.
//
// Endpoint: POST https://fastapi.muns.io/stock-data
//   body: { ticker_symbol, type: "stockquote", country }
//   response: a JSON *string* of comma-separated key=value pairs, e.g.
//   "Current Price=1303.5,Previous Close=1306.5,Day Range=1299.0 - 1313.2,
//    52-Week Range=1253.2 - 1611.8,50-Day Moving Average=1344.21, ...,
//    Yearly Change (%)=-13.82"
//
// CORS is open on the API, so this runs directly from the browser — no proxy.

const ENDPOINT = "https://fastapi.muns.io/stock-data";

export type Quote = {
  currentPrice: number;
  previousClose?: number;
  dayLow?: number;
  dayHigh?: number;
  week52Low?: number;
  week52High?: number;
  ma50?: number;
  ma200?: number;
  yearlyChangePct?: number;
  marketCap?: number;
};

function num(s?: string): number | undefined {
  if (s == null) return undefined;
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

// Split "1299.0 - 1313.2" into [low, high]; tolerant of extra spaces.
function range(s?: string): [number | undefined, number | undefined] {
  if (!s) return [undefined, undefined];
  const parts = s.split(/\s-\s|\sto\s/);
  return [num(parts[0]), num(parts[1])];
}

export function parseQuote(raw: string): Quote | null {
  const map: Record<string, string> = {};
  for (const part of raw.split(",")) {
    const i = part.indexOf("=");
    if (i > 0) map[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  const cp = num(map["Current Price"]);
  if (cp == null) return null;
  const [dayLow, dayHigh] = range(map["Day Range"]);
  const [w52Low, w52High] = range(map["52-Week Range"]);
  return {
    currentPrice: cp,
    previousClose: num(map["Previous Close"]),
    dayLow,
    dayHigh,
    week52Low: w52Low,
    week52High: w52High,
    ma50: num(map["50-Day Moving Average"]),
    ma200: num(map["200-Day Moving Average"]),
    yearlyChangePct: num(map["Yearly Change (%)"]),
    marketCap: num(map["Market Cap"]),
  };
}

export async function fetchQuote(ticker: string, country = "india"): Promise<Quote | null> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker_symbol: ticker, type: "stockquote", country }),
    });
    if (!res.ok) return null;
    const data = await res.json(); // API returns a JSON-encoded string
    if (typeof data !== "string") return null;
    return parseQuote(data);
  } catch {
    return null; // network/CORS error → caller treats ticker as unresolved
  }
}

// Fetch many tickers concurrently. Returns a map of ticker → Quote; tickers
// that error or don't resolve are simply absent (caller flags them).
export async function fetchQuotes(
  tickers: string[],
  country = "india",
): Promise<Record<string, Quote>> {
  const out: Record<string, Quote> = {};
  await Promise.all(
    tickers.map(async (t) => {
      const q = await fetchQuote(t, country);
      if (q) out[t] = q;
    }),
  );
  return out;
}
