// Portfolio state lives here. This module is the only place the rest of the
// app talks to about portfolio data — it wires the parser, the diff engine,
// and localStorage together behind a small, stable API.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ChangeSummary,
  Holding,
  ParseResult,
  Portfolio,
  UploadEvent,
} from "@/lib/portfolioTypes";
import {
  clearAllPortfolioState,
  generateUploadId,
  prependUpload,
  readActivePortfolio,
  readPriorPortfolio,
  readUploads,
  writeActivePortfolio,
  writePriorPortfolio,
} from "@/lib/portfolioStorage";
import { parsePortfolioFile } from "@/lib/portfolioParser";
import { diffPortfolios } from "@/lib/portfolioDiff";
import { fxConvert, type DisplayCurrency } from "@/lib/fx";
import { fmtCurrency } from "@/lib/format";
// STANDALONE DEMO: seed a fictional book so every screen renders offline with
// no upload / no backend. See src/data/mockPortfolio.ts. To restore the
// original "upload-first" behavior, drop this import and the two `?? MOCK_*`
// fallbacks in the initial state below.
import { MOCK_PORTFOLIO, MOCK_UPLOADS, repriceHolding, withWeights } from "@/data/mockPortfolio";
import { fetchQuotes } from "@/lib/priceService";

const DISPLAY_CCY_KEY = "fo:displayCurrency";

function readDisplayCurrency(): DisplayCurrency | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(DISPLAY_CCY_KEY);
    return v === "USD" || v === "INR" || v === "EUR" || v === "GBP" ? v : null;
  } catch {
    return null;
  }
}

// Result of a parse step that's awaiting user confirmation to commit.
export type StagedUpload = {
  parse: ParseResult;
  changeSummary: ChangeSummary;
};

type PortfolioContextValue = {
  portfolio: Portfolio | null;
  uploads: UploadEvent[];

  staged: StagedUpload | null;          // present after parse, before commit
  stagingError: string | null;
  isParsing: boolean;

  parseFile: (file: File) => Promise<StagedUpload | null>;
  commitStagedUpload: () => Portfolio | null;
  cancelStagedUpload: () => void;

  clearPortfolio: () => void;            // wipes everything (active + history)

  // Global display currency. Aggregate values across the app are stored in the
  // portfolio's base currency (the *Base fields); the display layer converts
  // them to whatever the user picks here. Live USD/INR/EUR/GBP toggle.
  displayCurrency: DisplayCurrency;
  setDisplayCurrency: (c: DisplayCurrency) => void;
  convertFromBase: (amount: number) => number;             // base ccy -> display ccy
  fmtFromBase: (amount: number, opts?: { compact?: boolean; sign?: boolean }) => string;

  // Live pricing (Munshot stock API). Prices are fetched on load and on demand;
  // holdings without a resolvable quote (e.g. mutual funds) keep priceStatus
  // "unresolved" and are valued at cost.
  pricesAsOf: string | null;
  pricesLoading: boolean;
  refreshPrices: () => void;
};

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  // STANDALONE DEMO: fall back to the seeded mock book when localStorage is
  // empty, so the dashboards render immediately with no upload step.
  const [portfolio, setPortfolio] = useState<Portfolio | null>(() => readActivePortfolio() ?? MOCK_PORTFOLIO);
  const [uploads, setUploads] = useState<UploadEvent[]>(() => {
    const stored = readUploads();
    return stored.length > 0 ? stored : MOCK_UPLOADS;
  });
  const [staged, setStaged] = useState<StagedUpload | null>(null);
  const [stagingError, setStagingError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [displayOverride, setDisplayOverride] = useState<DisplayCurrency | null>(() => readDisplayCurrency());

  // Effective display currency: the user's explicit pick, else follow the
  // active portfolio's base currency, else INR (our India-first default).
  const displayCurrency: DisplayCurrency = displayOverride ?? portfolio?.baseCurrency ?? "INR";

  const setDisplayCurrency = useCallback((c: DisplayCurrency) => {
    setDisplayOverride(c);
    try {
      window.localStorage.setItem(DISPLAY_CCY_KEY, c);
    } catch {
      /* localStorage unavailable — non-fatal */
    }
  }, []);

  const baseCurrency = portfolio?.baseCurrency ?? "INR";
  const convertFromBase = useCallback(
    (amount: number) => fxConvert(amount, baseCurrency, displayCurrency),
    [baseCurrency, displayCurrency],
  );
  const fmtFromBase = useCallback(
    (amount: number, opts?: { compact?: boolean; sign?: boolean }) =>
      fmtCurrency(fxConvert(amount, baseCurrency, displayCurrency), displayCurrency, opts),
    [baseCurrency, displayCurrency],
  );

  // --- Live prices (Munshot stock API) --------------------------------------
  const [pricesAsOf, setPricesAsOf] = useState<string | null>(null);
  const [pricesLoading, setPricesLoading] = useState(false);
  const portfolioRef = useRef(portfolio);
  useEffect(() => {
    portfolioRef.current = portfolio;
  }, [portfolio]);

  const refreshPrices = useCallback(async () => {
    const pf = portfolioRef.current;
    if (!pf) return;
    setPricesLoading(true);
    // Mutual funds can't be priced by the stock API — skip them (kept at cost).
    const symbols = Array.from(
      new Set(
        pf.holdings
          .filter((h) => h.vehicle !== "Mutual Fund")
          .map((h) => h.apiTicker ?? h.ticker),
      ),
    );
    const quotes = await fetchQuotes(symbols);
    setPortfolio((prev) => {
      if (!prev) return prev;
      const holds = prev.holdings.map((h) => {
        if (h.vehicle === "Mutual Fund") return h;
        const q = quotes[h.apiTicker ?? h.ticker];
        return q
          ? repriceHolding(h, q.currentPrice, q.previousClose)
          : { ...h, priceStatus: "unresolved" as const };
      });
      const weighted = withWeights(holds);
      const nav = weighted.reduce((s, h) => s + (h.marketValueBase ?? h.marketValue), 0);
      return { ...prev, holdings: weighted, totalValue: nav };
    });
    setPricesAsOf(new Date().toISOString());
    setPricesLoading(false);
  }, []);

  // Fetch live prices once on load.
  useEffect(() => {
    refreshPrices();
  }, [refreshPrices]);

  // Keep localStorage in sync with state changes (paranoia — every setter
  // also writes, but this catches edge cases like programmatic resets).
  useEffect(() => {
    if (portfolio) writeActivePortfolio(portfolio);
  }, [portfolio]);

  const parseFile = useCallback(
    async (file: File): Promise<StagedUpload | null> => {
      setIsParsing(true);
      setStagingError(null);
      setStaged(null);
      try {
        const parse = await parsePortfolioFile(file);

        // If everything was unusable, surface a single failure instead of
        // letting the user "commit" an empty portfolio.
        if (parse.holdings.length === 0) {
          setStagingError(
            "No usable rows found in this file. Check that the required columns are present and try again.",
          );
          return null;
        }

        // Build a candidate portfolio for diffing against the prior active.
        const candidate: Portfolio = {
          id: generateUploadId(),
          fileName: parse.fileName,
          uploadedAt: new Date().toISOString(),
          holdings: parse.holdings,
          totalValue: parse.totalValue,
          baseCurrency: parse.baseCurrency,
          checksum: parse.checksum,
        };

        const prior = readActivePortfolio();
        const changeSummary = diffPortfolios(prior, candidate);

        const result: StagedUpload = { parse, changeSummary };
        setStaged(result);
        return result;
      } catch (e) {
        setStagingError(e instanceof Error ? e.message : "Unable to parse file.");
        return null;
      } finally {
        setIsParsing(false);
      }
    },
    [],
  );

  const commitStagedUpload = useCallback((): Portfolio | null => {
    if (!staged) return null;
    const { parse, changeSummary } = staged;

    const next: Portfolio = {
      id: generateUploadId(),
      fileName: parse.fileName,
      uploadedAt: new Date().toISOString(),
      holdings: parse.holdings,
      totalValue: parse.totalValue,
      baseCurrency: parse.baseCurrency,
      checksum: parse.checksum,
    };

    // Push the current active portfolio into "prior" before swapping so
    // future diffs have an anchor.
    const prior = readActivePortfolio();
    if (prior) writePriorPortfolio(prior);

    // Persist new active portfolio.
    writeActivePortfolio(next);
    setPortfolio(next);

    // Build the upload-history event.
    const ev: UploadEvent = {
      uploadId: next.id,
      fileName: next.fileName,
      uploadedAt: next.uploadedAt,
      numberOfRows: parse.rawRowCount,
      totalPortfolioValue: next.totalValue,
      countCurrent: parse.holdings.filter((h) => h.status === "Current").length,
      countExited: parse.holdings.filter((h) => h.status === "Exited").length,
      countWatchlist: parse.holdings.filter((h) => h.status === "Watchlist").length,
      checksum: next.checksum,
      changeSummary,
      warnings: parse.warnings,
    };
    const newUploads = prependUpload(ev);
    setUploads(newUploads);

    // Clear staging.
    setStaged(null);
    setStagingError(null);
    return next;
  }, [staged]);

  const cancelStagedUpload = useCallback(() => {
    setStaged(null);
    setStagingError(null);
  }, []);

  const clearPortfolio = useCallback(() => {
    clearAllPortfolioState();
    setPortfolio(null);
    setUploads([]);
    setStaged(null);
    setStagingError(null);
  }, []);

  const value = useMemo<PortfolioContextValue>(
    () => ({
      portfolio,
      uploads,
      staged,
      stagingError,
      isParsing,
      parseFile,
      commitStagedUpload,
      cancelStagedUpload,
      clearPortfolio,
      displayCurrency,
      setDisplayCurrency,
      convertFromBase,
      fmtFromBase,
      pricesAsOf,
      pricesLoading,
      refreshPrices,
    }),
    [
      portfolio,
      uploads,
      staged,
      stagingError,
      isParsing,
      parseFile,
      commitStagedUpload,
      cancelStagedUpload,
      clearPortfolio,
      displayCurrency,
      setDisplayCurrency,
      convertFromBase,
      fmtFromBase,
      pricesAsOf,
      pricesLoading,
      refreshPrices,
    ],
  );

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePortfolio must be used within PortfolioProvider");
  return ctx;
}

// --- Derived helpers (used by pages so they don't reimplement math) ---

export function activeHoldings(pf: Portfolio): Holding[] {
  return pf.holdings.filter((h) => h.status !== "Exited");
}

export function holdingsByStatus(pf: Portfolio, status: Holding["status"]): Holding[] {
  return pf.holdings.filter((h) => h.status === status);
}

export function holdingsByCoreSatellite(pf: Portfolio): Record<"Core" | "Satellite", Holding[]> {
  return {
    Core: activeHoldings(pf).filter((h) => h.coreSatellite === "Core"),
    Satellite: activeHoldings(pf).filter((h) => h.coreSatellite === "Satellite"),
  };
}

export function distinctSectors(pf: Portfolio): string[] {
  return Array.from(new Set(activeHoldings(pf).map((h) => h.sector)));
}
