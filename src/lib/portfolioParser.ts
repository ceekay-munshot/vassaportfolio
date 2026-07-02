// Parses a CSV or XLSX file in-browser and produces a validated portfolio.
//
// Design goals:
//  - Be permissive about header names: a user's real file rarely matches a spec
//    exactly, so we accept many aliases for each canonical field.
//  - Be strict about row-level integrity: if a row is unusable we surface a
//    clear, row-numbered error and skip that row.
//  - Be transparent: every field mapping decision is captured in fieldMappings,
//    and any defaults we applied surface as file-level warnings.

import Papa from "papaparse";
import * as XLSX from "xlsx";
import type {
  AssetClass,
  CoreSatellite,
  FieldMappingTrace,
  Holding,
  HoldingStatus,
  ManagerType,
  ParseError,
  ParseResult,
  ParseWarning,
  Vehicle,
} from "./portfolioTypes";
import { MANAGER_VEHICLES } from "./portfolioTypes";
import { currencyForGeography, determineBaseCurrency, fxConvert } from "./fx";

// ---------------------------------------------------------------------------
// Column alias map. Keys are canonical field names; values are alternate
// header strings users actually write. Comparison is case + punctuation
// insensitive (see normalizeHeader).
// ---------------------------------------------------------------------------

const COLUMN_ALIASES: Record<string, string[]> = {
  ticker: ["ticker", "symbol", "scrip", "code", "tickersymbol"],
  companyName: ["companyname", "company", "name", "security", "securityname", "instrument", "stock"],
  assetClass: ["assetclass", "type", "instrumenttype", "category"],
  sector: ["sector", "industry", "gics", "gicssector"],
  geography: ["geography", "geo", "country", "region", "market"],
  quantity: ["quantity", "qty", "shares", "units", "holdings", "position"],
  averageCost: ["averagecost", "avgcost", "avgprice", "averageprice", "cost", "costprice", "buyprice"],
  currentPrice: ["currentprice", "cmp", "ltp", "lasttradedprice", "price", "marketprice", "mktprice", "currentmarketprice"],
  marketValue: ["marketvalue", "mktvalue", "mv", "value", "currentvalue", "positionvalue"],
  portfolioWeight: ["portfolioweight", "weight", "weightpct", "weightpercent", "wt", "allocation"],
  coreSatellite: ["coresatellite", "coresat", "classification", "bucket", "sleeve"],
  benchmark: ["benchmark", "bench", "index"],
  status: ["status", "holdingstatus", "actiontoday", "action"],
  vehicle: ["vehicle", "wrapper", "structure", "producttype", "holdingvehicle", "accounttype", "holdingtype"],
  manager: ["manager", "fundmanager", "advisor", "adviser", "amc", "scheme", "schemename", "pms", "aif", "managedby", "fundname"],
  managerType: ["managertype", "mandate", "managedby2", "inhouseadvisor", "discretion"],
  familyMember: ["familymember", "owner", "entity", "account", "holder", "member", "beneficialowner", "accountholder"],
  purchaseDate: ["purchasedate", "buydate", "dateofpurchase", "acquisitiondate", "tradedate", "investmentdate", "sincedate", "datebought"],
};

const REQUIRED_PER_ROW = ["ticker", "companyName", "quantity", "currentPrice"] as const;
const REQUIRED_FIELDS_FOR_VALIDATION = ["ticker", "companyName", "sector", "quantity", "currentPrice", "coreSatellite", "status"] as const;

function normalizeHeader(s: string): string {
  return String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Given the raw header row, build a map: canonicalField -> sourceHeader (first match wins).
function buildHeaderMap(headers: string[]): { map: Record<string, string>; trace: FieldMappingTrace[] } {
  const normalized = headers.map(normalizeHeader);
  const map: Record<string, string> = {};
  const trace: FieldMappingTrace[] = [];

  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const idx = normalized.indexOf(alias);
      if (idx >= 0 && !(canonical in map)) {
        map[canonical] = headers[idx];
        trace.push({ canonical: canonical as keyof Holding, source: headers[idx] });
        break;
      }
    }
  }

  // Headers that didn't map to anything — record as unmapped (kept as extras).
  const claimedSources = new Set(Object.values(map));
  for (const h of headers) {
    if (!h) continue;
    if (!claimedSources.has(h)) trace.push({ canonical: "unmapped", source: h });
  }

  return { map, trace };
}

// ---------------------------------------------------------------------------
// Value coercion helpers.
// ---------------------------------------------------------------------------

function toCleanString(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function toNumber(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "n/a" || s.toLowerCase() === "na" || s === "-") return null;
  // Strip currency symbols, commas, percent signs.
  const cleaned = s.replace(/[,₹$€£\s%]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeCoreSatellite(raw: string): CoreSatellite | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith("core")) return "Core";
  if (s.startsWith("sat")) return "Satellite";
  // Some files (like the user's) put the owner's name here — we can't infer.
  return null;
}

function normalizeStatus(raw: string): HoldingStatus | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith("curr") || s === "hold" || s === "active" || s === "holding") return "Current";
  if (s.startsWith("exit") || s === "sold" || s === "closed" || s === "sell") return "Exited";
  if (s.startsWith("watch") || s === "monitor" || s === "tracking") return "Watchlist";
  // "Buy"/"Add on Weakness"/"Trim" — these are recommendations, not status.
  // Treat them as Current since you still own the holding.
  if (s === "buy" || s === "add on weakness" || s === "addonweakness" || s === "trim") return "Current";
  return null;
}

function normalizeAssetClass(raw: string): AssetClass {
  const s = raw.trim().toLowerCase();
  if (!s) return "Equity";
  if (s.includes("etf")) return "ETF";
  if (s.includes("bond") || s.includes("debt") || s.includes("fixed")) return "Bond";
  if (s === "cash") return "Cash";
  if (s.includes("comm") || s.includes("gold") || s.includes("silver")) return "Commodity";
  if (s.includes("real estate") || s.includes("reit") || s.includes("invit") || s.includes("property")) return "Real Estate";
  if (s.includes("alt")) return "Alternative";
  if (s.includes("eq") || s.includes("share") || s.includes("stock")) return "Equity";
  return "Equity";
}

// Map a free-text vehicle/wrapper string onto a canonical Vehicle. Returns
// null when the column is absent/unrecognized so the caller can infer.
function normalizeVehicle(raw: string): Vehicle | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (s.includes("mutual") || s === "mf" || s.includes("fund of fund") || (s.includes("fund") && !s.includes("hedge"))) return "Mutual Fund";
  if (s === "pms" || s.includes("portfolio management") || s.includes("portfolio mgmt")) return "PMS";
  if (s === "aif" || s.includes("alternative investment") || s.includes("cat ii") || s.includes("cat iii") || s.includes("category ii") || s.includes("category iii")) return "AIF";
  if (s.includes("private") || s.includes("unlisted") || s.includes("pre-ipo") || s.includes("preipo") || s.includes("vc") || s.includes("pe")) return "Private";
  if (s.includes("gold") || s.includes("sgb") || s.includes("silver") || s.includes("bullion")) return "Gold";
  if (s.includes("reit") || s.includes("invit") || s.includes("real estate") || s.includes("property")) return "Real Estate";
  if (s.includes("bond") || s.includes("debt") || s.includes("fixed") || s.includes("ncd") || s.includes("gsec") || s.includes("g-sec")) return "Fixed Income";
  if (s.includes("direct") || s.includes("equity") || s.includes("listed") || s.includes("demat") || s.includes("cash equity")) return "Direct Equity";
  return null;
}

// Infer a vehicle when no column is present, using the strongest signals we
// have: the parsed asset class and the benchmark string (our sample tags
// unlisted names with a "Private Markets" benchmark).
function inferVehicle(assetClass: AssetClass, benchmark: string, companyName: string): Vehicle {
  const b = benchmark.toLowerCase();
  const n = companyName.toLowerCase();
  if (b.includes("private")) return "Private";
  if (n.includes("mutual fund") || n.includes("flexi cap") || n.includes("flexicap") || n.includes("bluechip") || n.includes("index fund")) return "Mutual Fund";
  if (assetClass === "Real Estate") return "Real Estate";
  if (assetClass === "Bond") return "Fixed Income";
  if (assetClass === "Commodity") return "Gold";
  if (assetClass === "Alternative") return "Private";
  return "Direct Equity";
}

function normalizeManagerType(raw: string, vehicle: Vehicle): ManagerType {
  const s = raw.trim().toLowerCase();
  if (s.includes("house") || s.includes("self") || s.includes("direct") || s.includes("internal")) return "In-house";
  if (s.includes("advis") || s.includes("external") || s.includes("manager") || s.includes("discretion")) return "Advisor";
  // No explicit value — manager-routed vehicles default to Advisor.
  return MANAGER_VEHICLES.includes(vehicle) ? "Advisor" : "In-house";
}

// Parse a date in the loose formats families actually use (yyyy-mm-dd,
// dd/mm/yyyy, dd-mmm-yyyy, etc.) into an ISO yyyy-mm-dd string. Returns
// undefined when unparseable so downstream views can show "—".
function normalizePurchaseDate(raw: string): string | undefined {
  const s = raw.trim();
  if (!s) return undefined;
  // ISO already?
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // dd/mm/yyyy or dd-mm-yyyy (Indian convention: day first).
  const dmy = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    let year = dmy[3];
    if (year.length === 2) year = (Number(year) > 50 ? "19" : "20") + year;
    return `${year}-${month}-${day}`;
  }
  // Fallback to Date parsing (handles "1 Apr 2025", "Apr 1, 2025").
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return undefined;
}

// Best-effort geography inference from a ticker string. Used only when
// no geography column is present in the file.
//
// India-first: our primary user base is Indian family offices, so an
// ambiguous ticker defaults to India. Known US blue-chip / ETF tickers
// are matched explicitly so a mixed file with AAPL alongside RELIANCE
// still gets classified correctly.
const KNOWN_US_TICKERS = new Set([
  // mega-cap equities
  "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "META", "NVDA", "TSLA",
  "BRK.A", "BRK.B", "JPM", "BAC", "WFC", "GS", "MS", "V", "MA", "AXP",
  "UNH", "JNJ", "LLY", "PFE", "MRK", "ABBV", "TMO", "ABT", "BMY",
  "KO", "PEP", "WMT", "COST", "PG", "MCD", "SBUX", "NKE", "DIS",
  "NFLX", "HD", "LOW", "ORCL", "CRM", "ADBE", "INTC", "AMD", "CSCO",
  "AVGO", "QCOM", "TXN", "IBM", "PYPL", "SHOP", "PLTR", "COIN", "UBER",
  "XOM", "CVX", "COP", "SLB", "T", "VZ", "TMUS", "F", "GM",
  "BA", "CAT", "DE", "GE", "HON", "LMT", "RTX", "UPS", "FDX",
  "BX", "BLK", "SCHW", "C",
  // common ETFs
  "SPY", "QQQ", "VTI", "VOO", "DIA", "IWM", "EFA", "EEM", "GLD",
  "SLV", "BND", "AGG", "TLT", "HYG", "LQD", "ARKK", "SMH", "XLK",
  "XLF", "XLE", "XLV", "XLY", "XLP", "XLI", "XLU", "XLB", "XLRE",
]);

function inferGeography(ticker: string): string {
  const t = ticker.toUpperCase();

  // Exchange suffixes are unambiguous.
  if (/\.NS$|\.BO$/.test(t)) return "India";
  if (/\.L$/.test(t)) return "UK";
  if (/\.HK$/.test(t)) return "Hong Kong";
  if (/\.TO$/.test(t)) return "Canada";

  // Known US blue-chips / ETFs.
  if (KNOWN_US_TICKERS.has(t)) return "US";

  // Default for our Indian-leaning user base — covers BSE/NSE truncations
  // like TILIND, ULTCEM, TATSTE as well as short Indian symbols like TCS.
  return "India";
}

function inferBenchmarkFromGeography(g: string): string {
  if (g === "India") return "NIFTY 50";
  if (g === "US") return "S&P 500";
  if (g === "UK") return "FTSE 100";
  if (g === "Hong Kong") return "Hang Seng";
  // Indian-first default — matches the rest of the parser's posture.
  return "NIFTY 50";
}

// Simple FNV-1a checksum over the canonical row payload. Stable across runs.
function checksumOf(rows: Holding[]): string {
  let h = 0x811c9dc5;
  const str = rows
    .map((r) => `${r.ticker}|${r.quantity}|${r.currentPrice}|${r.coreSatellite}|${r.status}`)
    .join("\n");
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

// ---------------------------------------------------------------------------
// File ingestion. Routes by extension; both paths produce a uniform
// rows + headers shape that the row-converter below consumes.
// ---------------------------------------------------------------------------

type RawTable = { headers: string[]; rows: Record<string, unknown>[] };

async function readCSV(file: File): Promise<RawTable> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (results) => {
        const headers = (results.meta.fields || []).map((h) => h.trim());
        const rows = (results.data as Record<string, unknown>[]).map((r) => {
          const out: Record<string, unknown> = {};
          for (const h of headers) out[h] = r[h];
          return out;
        });
        resolve({ headers, rows });
      },
      error: (err) => reject(err),
    });
  });
}

async function readXLSX(file: File): Promise<RawTable> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) throw new Error("XLSX file contains no sheets");
  const ws = wb.Sheets[firstSheet];
  const sheetRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
    raw: false,
  });
  // XLSX.utils.sheet_to_json strips empty trailing rows but preserves header order.
  const headers = sheetRows.length
    ? Object.keys(sheetRows[0]).map((h) => h.trim())
    : [];
  return { headers, rows: sheetRows };
}

// ---------------------------------------------------------------------------
// Main entry point.
// ---------------------------------------------------------------------------

export async function parsePortfolioFile(file: File): Promise<ParseResult> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  let raw: RawTable;
  if (ext === "xlsx" || ext === "xls") {
    raw = await readXLSX(file);
  } else if (ext === "csv" || ext === "txt") {
    raw = await readCSV(file);
  } else {
    throw new Error(`Unsupported file type: .${ext}. Upload a CSV or XLSX file.`);
  }
  return parseRawTable(raw, file.name);
}

export function parseRawTable(raw: RawTable, fileName: string): ParseResult {
  const errors: ParseError[] = [];
  const warnings: ParseWarning[] = [];
  const { map, trace } = buildHeaderMap(raw.headers);

  // File-level warnings for missing required columns. We treat sector,
  // coreSatellite, and status as derivable — we'll apply defaults and warn.
  for (const field of REQUIRED_FIELDS_FOR_VALIDATION) {
    if (!(field in map)) {
      warnings.push({
        field,
        message:
          field === "sector"
            ? "No 'sector' column found — every holding will be tagged 'Unclassified'. Re-upload with a Sector column for accurate sector analytics."
            : field === "coreSatellite"
              ? "No 'Core/Satellite' column found — every holding defaulted to 'Core'. Edit your file and re-upload to set sleeve classifications."
              : field === "status"
                ? "No 'status' column found — every holding defaulted to 'Current' (active holding)."
                : `Required column '${field}' is missing.`,
      });
    }
  }

  // Per-row conversion.
  const holdings: Holding[] = [];
  raw.rows.forEach((row, idx) => {
    const rowNum = idx + 2; // header is row 1, so row data starts at 2
    const get = (canonical: string): unknown => {
      const src = map[canonical];
      return src ? row[src] : undefined;
    };

    const ticker = toCleanString(get("ticker")).toUpperCase();
    const companyName = toCleanString(get("companyName"));
    const quantity = toNumber(get("quantity"));
    const currentPrice = toNumber(get("currentPrice"));

    // Hard validations — without these we cannot produce a usable row.
    const rowErrors: ParseError[] = [];
    if (!ticker) rowErrors.push({ row: rowNum, field: "ticker", message: "Ticker is required." });
    if (!companyName)
      rowErrors.push({ row: rowNum, ticker, field: "companyName", message: "Company name is required." });
    if (quantity == null || quantity < 0)
      rowErrors.push({ row: rowNum, ticker, field: "quantity", message: "Quantity must be a non-negative number." });
    if (currentPrice == null || currentPrice < 0)
      rowErrors.push({ row: rowNum, ticker, field: "currentPrice", message: "Current price must be a non-negative number." });

    if (rowErrors.length) {
      errors.push(...rowErrors);
      return;
    }

    // At this point qty/currentPrice are non-null numbers.
    const qty = quantity as number;
    const cmp = currentPrice as number;
    const averageCost = toNumber(get("averageCost")) ?? cmp;
    const providedMV = toNumber(get("marketValue"));
    const marketValue = providedMV != null ? providedMV : qty * cmp;
    const sector = toCleanString(get("sector")) || "Unclassified";
    const geographyRaw = toCleanString(get("geography"));
    const geography = geographyRaw || inferGeography(ticker);
    const assetClass = normalizeAssetClass(toCleanString(get("assetClass")));
    const benchmark = toCleanString(get("benchmark")) || inferBenchmarkFromGeography(geography);

    const csRaw = toCleanString(get("coreSatellite"));
    const coreSatellite: CoreSatellite = normalizeCoreSatellite(csRaw) ?? "Core";

    const statusRaw = toCleanString(get("status"));
    const status: HoldingStatus = normalizeStatus(statusRaw) ?? "Current";

    // Multi-vehicle dimensions. Vehicle drives the consolidated/MF/AIF/PMS
    // slicing; manager + managerType drive the in-house-vs-advisor view;
    // familyMember drives the per-entity allocation; purchaseDate drives the
    // since-purchase vs this-year return windows.
    const vehicle: Vehicle = normalizeVehicle(toCleanString(get("vehicle"))) ?? inferVehicle(assetClass, benchmark, companyName);
    const managerRaw = toCleanString(get("manager"));
    const managerType: ManagerType = normalizeManagerType(toCleanString(get("managerType")), vehicle);
    const manager = managerRaw || (managerType === "In-house" ? "In-house (Direct)" : "Unassigned Advisor");
    const familyMember = toCleanString(get("familyMember")) || "Glow Ventures LLP";
    const purchaseDate = normalizePurchaseDate(toCleanString(get("purchaseDate")));

    // Track unmapped columns as extras so downstream views can show them.
    const extra: Record<string, string | number | null> = {};
    for (const t of trace) {
      if (t.canonical === "unmapped") {
        const v = row[t.source];
        if (v != null && String(v).trim() !== "") {
          const num = toNumber(v);
          extra[t.source] = num != null ? num : String(v).trim();
        }
      }
    }

    const costBasis = qty * averageCost;
    const unrealizedPnL = qty * (cmp - averageCost);
    const returnPct = averageCost > 0 ? ((cmp - averageCost) / averageCost) * 100 : 0;
    const currency = currencyForGeography(geography);

    const h: Holding = {
      ticker,
      companyName,
      assetClass,
      sector,
      geography,
      quantity: qty,
      averageCost,
      currentPrice: cmp,
      marketValue,
      portfolioWeight: 0, // computed in a second pass once totals are known
      coreSatellite,
      benchmark,
      status,
      vehicle,
      manager,
      managerType,
      familyMember,
      purchaseDate,
      unrealizedPnL,
      returnPct,
      costBasis,
      currency,
      // *Base values get filled below once we know the portfolio's base currency.
      marketValueBase: marketValue,
      costBasisBase: costBasis,
      unrealizedPnLBase: unrealizedPnL,
      extra: Object.keys(extra).length ? extra : undefined,
    };
    holdings.push(h);
  });

  // Decide the portfolio's base currency from the holdings we've parsed.
  // Single-currency files keep their native currency; mixed files default
  // to whichever currency dominates by USD-normalized market value.
  const baseCurrency = determineBaseCurrency(
    holdings.map((h) => ({ currency: h.currency || "USD", marketValue: h.marketValue })),
  );

  // FX-normalize the aggregation fields onto every holding.
  for (const h of holdings) {
    const from = h.currency || "USD";
    h.marketValueBase = fxConvert(h.marketValue, from, baseCurrency);
    h.costBasisBase = fxConvert(h.costBasis, from, baseCurrency);
    h.unrealizedPnLBase = fxConvert(h.unrealizedPnL, from, baseCurrency);
  }

  // Total value (in base currency) excludes Exited holdings.
  const totalValue = holdings
    .filter((h) => h.status !== "Exited")
    .reduce((s, h) => s + (h.marketValueBase ?? 0), 0);

  // Second pass: portfolioWeight using provided value where present, else
  // computed from FX-normalized values (so a 1% INR holding shows the same
  // weight whether the dashboard is in INR or USD).
  const providedWeights = raw.rows.map((row) => toNumber(row[map.portfolioWeight] as unknown));
  let weightFromProvided = false;
  holdings.forEach((h, i) => {
    const p = providedWeights[i];
    if (p != null) {
      // If the provided value is on 0..100 scale, convert to 0..1.
      h.portfolioWeight = p > 1 ? p / 100 : p;
      weightFromProvided = true;
    } else if (totalValue > 0 && h.status !== "Exited") {
      h.portfolioWeight = (h.marketValueBase ?? h.marketValue) / totalValue;
    } else {
      h.portfolioWeight = 0;
    }
  });

  if (!weightFromProvided && totalValue > 0) {
    warnings.push({
      field: "portfolioWeight",
      message: "Portfolio weight column not provided — weights computed as marketValue / total.",
    });
  }
  if (raw.rows.length > 0 && !("marketValue" in map)) {
    warnings.push({
      field: "marketValue",
      message: "Market value column not provided — values computed as quantity × currentPrice.",
    });
  }

  // Detect duplicate tickers (warn — first occurrence is kept by downstream consumers).
  const seen = new Map<string, number>();
  for (const h of holdings) {
    seen.set(h.ticker, (seen.get(h.ticker) || 0) + 1);
  }
  const dups = [...seen.entries()].filter(([, n]) => n > 1).map(([t]) => t);
  if (dups.length) {
    warnings.push({
      field: "ticker",
      message: `Duplicate ticker(s) detected: ${dups.join(", ")}. Each appears more than once in the file.`,
    });
  }

  return {
    fileName,
    holdings,
    errors,
    warnings,
    fieldMappings: trace,
    totalValue,
    baseCurrency,
    checksum: checksumOf(holdings),
    rawRowCount: raw.rows.length,
  };
}

// ---------------------------------------------------------------------------
// Sample CSV. Surfaced both as an in-app preview and as a download.
// ---------------------------------------------------------------------------

// All-Indian sample portfolio spanning every vehicle the family described:
// direct equity (listed + unlisted/private), mutual funds, PMS, AIFs, gold,
// fixed income, and REIT/InvIT. Each row carries the vehicle, manager,
// in-house/advisor mandate, owning entity, and purchase date so the
// consolidated / manager / family / since-purchase views all light up.
// Quantities are pre-scaled to family-office size (NAV ≈ ₹3,200 Cr / ~$3.9 B);
// market value and weight are computed by the parser. Prices are illustrative.
export const SAMPLE_CSV = `ticker,companyName,assetClass,sector,geography,quantity,averageCost,currentPrice,coreSatellite,benchmark,status,vehicle,manager,managerType,familyMember,purchaseDate
RELIANCE,Reliance Industries Ltd.,Equity,Energy,India,750000,2380,2912,Core,NIFTY 500,Current,Direct Equity,In-house (Direct),In-house,Glow Ventures LLP,2023-05-12
TCS,Tata Consultancy Services,Equity,Technology,India,450000,3624,4148,Core,NIFTY 500,Current,Direct Equity,In-house (Direct),In-house,Glow Ventures LLP,2022-11-03
HDFCBANK,HDFC Bank Ltd.,Equity,Financials,India,900000,1580,1684,Core,NIFTY 500,Current,Direct Equity,In-house (Direct),In-house,Glow Ventures LLP,2021-08-19
INFY,Infosys Ltd.,Equity,Technology,India,600000,1462,1842,Core,NIFTY 500,Current,Direct Equity,In-house (Direct),In-house,Yamini,2023-02-27
ICICIBANK,ICICI Bank Ltd.,Equity,Financials,India,800000,980,1124,Core,NIFTY 500,Current,Direct Equity,In-house (Direct),In-house,Ankita,2024-06-10
ITC,ITC Ltd.,Equity,Consumer Staples,India,1200000,412,468,Core,NIFTY 500,Current,Direct Equity,In-house (Direct),In-house,Glow Ventures LLP,2022-01-15
BHARTIARTL,Bharti Airtel Ltd.,Equity,Communication Services,India,500000,1042,1612,Core,NIFTY 500,Current,Direct Equity,In-house (Direct),In-house,Yamini,2023-09-22
LT,Larsen and Toubro Ltd.,Equity,Industrials,India,200000,3140,3582,Core,NIFTY 500,Current,Direct Equity,In-house (Direct),In-house,Glow Ventures LLP,2024-03-05
TITAN,Titan Company Ltd.,Equity,Consumer Discretionary,India,220000,3120,3624,Satellite,NIFTY 500,Current,Direct Equity,In-house (Direct),In-house,Ankita,2025-07-18
SUNPHARMA,Sun Pharmaceutical Industries,Equity,Healthcare,India,280000,1420,1718,Satellite,NIFTY 500,Current,Direct Equity,In-house (Direct),In-house,Yamini,2025-11-30
MARUTI,Maruti Suzuki India Ltd.,Equity,Consumer Discretionary,India,80000,9800,11250,Satellite,NIFTY 500,Current,Direct Equity,In-house (Direct),In-house,Glow Ventures LLP,2024-09-12
NIFTYBEES,Nippon India Nifty BeES ETF,ETF,Diversified,India,4000000,218,256,Core,NIFTY 50,Current,Direct Equity,In-house (Direct),In-house,Glow Ventures LLP,2022-07-04
ADANIENT,Adani Enterprises Ltd.,Equity,Industrials,India,60000,2240,2780,Satellite,NIFTY 500,Watchlist,Direct Equity,In-house (Direct),In-house,Glow Ventures LLP,2026-05-04
ASIANPAINT,Asian Paints Ltd.,Equity,Materials,India,180000,2820,2412,Satellite,NIFTY 500,Watchlist,Direct Equity,In-house (Direct),In-house,Ankita,2026-04-22
BAJFINANCE,Bajaj Finance Ltd.,Equity,Financials,India,90000,6850,7280,Satellite,NIFTY 500,Exited,Direct Equity,In-house (Direct),In-house,Glow Ventures LLP,2024-02-10
PPFAS-FLEXI,Parag Parikh Flexi Cap Fund,Equity,Diversified,India,15000000,60,78,Core,NIFTY 500,Current,Mutual Fund,Parag Parikh Flexi Cap,Advisor,Yamini,2022-06-01
HDFC-MIDCAP,HDFC Mid-Cap Opportunities Fund,Equity,Diversified,India,6000000,150,198,Satellite,NIFTY Midcap 150,Current,Mutual Fund,HDFC Mid-Cap Opportunities,Advisor,Ankita,2023-04-15
ICICI-BLUECHIP,ICICI Prudential Bluechip Fund,Equity,Diversified,India,12000000,80,102,Core,NIFTY 100,Current,Mutual Fund,ICICI Pru Bluechip,Advisor,Glow Ventures LLP,2021-12-08
NIPPON-SMALLCAP,Nippon India Small Cap Fund,Equity,Diversified,India,5000000,120,178,Satellite,NIFTY Smallcap 250,Current,Mutual Fund,Nippon India Small Cap,Advisor,Yamini,2024-08-20
SBI-CONTRA,SBI Contra Fund,Equity,Diversified,India,3000000,285,348,Satellite,BSE 500,Current,Mutual Fund,SBI Contra,Advisor,Family Foundation,2026-04-30
MARCELLUS-CCP,Marcellus Consistent Compounders PMS,Equity,Diversified,India,1000000,1000,1385,Core,NIFTY 500,Current,PMS,Marcellus CCP,Advisor,Glow Ventures LLP,2022-09-15
MOSL-NTDOP,Motilal Oswal NTDOP PMS,Equity,Diversified,India,700000,1000,1290,Satellite,NIFTY 500,Current,PMS,Motilal Oswal NTDOP,Advisor,Yamini,2023-07-01
ASK-IEP,ASK Indian Entrepreneur Portfolio PMS,Equity,Diversified,India,800000,1000,1255,Core,NIFTY 500,Current,PMS,ASK IEP,Advisor,Ankita,2024-01-25
ABAKKUS-EOF,Abakkus Emerging Opportunities Fund,Equity,Diversified,India,600000,1000,1420,Satellite,NIFTY Midcap 150,Current,AIF,Abakkus Emerging Opp,Advisor,Glow Ventures LLP,2023-03-10
AVENDUS-ARF,Avendus Absolute Return Fund,Alternative,Diversified,India,700000,1000,1180,Satellite,NIFTY 50,Current,AIF,Avendus Absolute Return,Advisor,Family Foundation,2024-05-18
WHITEOAK-AIF,White Oak India Equity AIF,Equity,Diversified,India,750000,1000,1325,Core,BSE 500,Current,AIF,White Oak India Equity,Advisor,Yamini,2025-02-14
RAZORPAY,Razorpay Software Pvt. Ltd.,Alternative,Financials,India,500000,1800,2200,Satellite,Private Markets,Current,Private,In-house (Direct),In-house,Glow Ventures LLP,2023-10-01
ZERODHA,Zerodha Broking Pvt. Ltd.,Alternative,Financials,India,80000,12000,15000,Satellite,Private Markets,Current,Private,In-house (Direct),In-house,Glow Ventures LLP,2022-04-12
LENSKART,Lenskart Solutions Pvt. Ltd.,Alternative,Consumer Discretionary,India,300000,1500,1800,Satellite,Private Markets,Current,Private,In-house (Direct),In-house,Ankita,2024-11-05
DREAMSPORTS,Sporta Technologies (Dream11),Alternative,Communication Services,India,120000,3000,3500,Satellite,Private Markets,Current,Private,In-house (Direct),In-house,Yamini,2025-06-20
SGBGOLD,Sovereign Gold Bond 2032,Commodity,Gold,India,150000,5200,7350,Core,Domestic Gold,Current,Gold,In-house (Direct),In-house,Glow Ventures LLP,2022-08-01
GOLDBEES,Nippon India Gold ETF,Commodity,Gold,India,1500000,52,71,Satellite,Domestic Gold,Current,Gold,In-house (Direct),In-house,Family Foundation,2024-10-10
BHARATBOND,Bharat Bond ETF April 2030,Bond,Fixed Income,India,800000,1050,1180,Core,CRISIL Bond Index,Current,Fixed Income,In-house (Direct),In-house,Glow Ventures LLP,2023-06-05
NHAI-NCD,NHAI Tax-Free Bonds,Bond,Fixed Income,India,700000,1000,1085,Core,CRISIL Bond Index,Current,Fixed Income,In-house (Direct),In-house,Family Foundation,2022-12-12
EMBASSYREIT,Embassy Office Parks REIT,Real Estate,Real Estate,India,2500000,340,392,Satellite,NIFTY REITs and InvITs,Current,Real Estate,In-house (Direct),In-house,Glow Ventures LLP,2023-11-20
INDIGRID,IndiGrid InvIT,Real Estate,Real Estate,India,5000000,130,152,Satellite,NIFTY REITs and InvITs,Current,Real Estate,In-house (Direct),In-house,Ankita,2024-07-08
`;

// Used by the UI to render a clean "what your file should look like" preview —
// one direct-equity row, one mutual fund, one PMS, one unlisted private name.
export const SAMPLE_PREVIEW_ROWS: Array<Record<string, string>> = [
  {
    ticker: "RELIANCE",
    companyName: "Reliance Industries Ltd.",
    sector: "Energy",
    quantity: "750000",
    averageCost: "2380",
    currentPrice: "2912",
    coreSatellite: "Core",
    vehicle: "Direct Equity",
    manager: "In-house (Direct)",
    familyMember: "Glow Ventures LLP",
    purchaseDate: "2023-05-12",
  },
  {
    ticker: "PPFAS-FLEXI",
    companyName: "Parag Parikh Flexi Cap Fund",
    sector: "Diversified",
    quantity: "15000000",
    averageCost: "60",
    currentPrice: "78",
    coreSatellite: "Core",
    vehicle: "Mutual Fund",
    manager: "Parag Parikh Flexi Cap",
    familyMember: "Yamini",
    purchaseDate: "2022-06-01",
  },
  {
    ticker: "MARCELLUS-CCP",
    companyName: "Marcellus Consistent Compounders PMS",
    sector: "Diversified",
    quantity: "1000000",
    averageCost: "1000",
    currentPrice: "1385",
    coreSatellite: "Core",
    vehicle: "PMS",
    manager: "Marcellus CCP",
    familyMember: "Glow Ventures LLP",
    purchaseDate: "2022-09-15",
  },
  {
    ticker: "RAZORPAY",
    companyName: "Razorpay Software Pvt. Ltd.",
    sector: "Financials",
    quantity: "500000",
    averageCost: "1800",
    currentPrice: "2200",
    coreSatellite: "Satellite",
    vehicle: "Private",
    manager: "In-house (Direct)",
    familyMember: "Glow Ventures LLP",
    purchaseDate: "2023-10-01",
  },
];

export { REQUIRED_PER_ROW, REQUIRED_FIELDS_FOR_VALIDATION, COLUMN_ALIASES };
