// Compare two portfolios to surface what the user actually changed in the
// new upload. Used both for the post-upload diff panel and for the
// changeSummary attached to each UploadEvent in history.

import type {
  AddedChange,
  ChangeSummary,
  ClassificationChange,
  Portfolio,
  PriceChange,
  QuantityChange,
  RemovedChange,
  StatusChange,
  WeightChange,
} from "./portfolioTypes";

// Sensitivity thresholds — small jitters in price/weight shouldn't surface
// as material changes in the UI. These are intentionally generous; the
// purpose is to highlight signal, not noise.
const PRICE_CHANGE_THRESHOLD_PCT = 1; // ignore < 1% moves
const WEIGHT_CHANGE_THRESHOLD_BPS = 25; // ignore < 25 bps moves
const QTY_CHANGE_THRESHOLD = 0; // any qty change is signal

export function diffPortfolios(prev: Portfolio | null, next: Portfolio): ChangeSummary {
  const empty: ChangeSummary = {
    added: [],
    removed: [],
    quantityChanged: [],
    priceChanged: [],
    weightChanged: [],
    statusChanged: [],
    classificationChanged: [],
  };

  if (!prev) {
    // First-ever upload: every holding is "added".
    return {
      ...empty,
      added: next.holdings.map<AddedChange>((h) => ({
        ticker: h.ticker,
        companyName: h.companyName,
        quantity: h.quantity,
        marketValue: h.marketValue,
      })),
    };
  }

  const prevByTicker = new Map(prev.holdings.map((h) => [h.ticker, h]));
  const nextByTicker = new Map(next.holdings.map((h) => [h.ticker, h]));

  const added: AddedChange[] = [];
  const removed: RemovedChange[] = [];
  const quantityChanged: QuantityChange[] = [];
  const priceChanged: PriceChange[] = [];
  const weightChanged: WeightChange[] = [];
  const statusChanged: StatusChange[] = [];
  const classificationChanged: ClassificationChange[] = [];

  // Pass 1: anything in `next` not in `prev` is an addition.
  for (const [ticker, h] of nextByTicker) {
    if (!prevByTicker.has(ticker)) {
      added.push({
        ticker,
        companyName: h.companyName,
        quantity: h.quantity,
        marketValue: h.marketValue,
      });
    }
  }

  // Pass 2: anything in `prev` not in `next` is a removal.
  for (const [ticker, h] of prevByTicker) {
    if (!nextByTicker.has(ticker)) {
      removed.push({
        ticker,
        companyName: h.companyName,
        lastQuantity: h.quantity,
        lastMarketValue: h.marketValue,
      });
    }
  }

  // Pass 3: tickers that exist in both — record per-field changes.
  for (const [ticker, n] of nextByTicker) {
    const p = prevByTicker.get(ticker);
    if (!p) continue;

    if (Math.abs(n.quantity - p.quantity) > QTY_CHANGE_THRESHOLD) {
      quantityChanged.push({
        ticker,
        from: p.quantity,
        to: n.quantity,
        delta: n.quantity - p.quantity,
      });
    }

    const priceDeltaPct = p.currentPrice > 0
      ? ((n.currentPrice - p.currentPrice) / p.currentPrice) * 100
      : 0;
    if (Math.abs(priceDeltaPct) >= PRICE_CHANGE_THRESHOLD_PCT) {
      priceChanged.push({
        ticker,
        from: p.currentPrice,
        to: n.currentPrice,
        pctChange: priceDeltaPct,
      });
    }

    const weightDeltaBps = (n.portfolioWeight - p.portfolioWeight) * 10000;
    if (Math.abs(weightDeltaBps) >= WEIGHT_CHANGE_THRESHOLD_BPS) {
      weightChanged.push({
        ticker,
        from: p.portfolioWeight,
        to: n.portfolioWeight,
        deltaBps: weightDeltaBps,
      });
    }

    if (p.status !== n.status) {
      statusChanged.push({ ticker, from: p.status, to: n.status });
    }

    if (p.coreSatellite !== n.coreSatellite) {
      classificationChanged.push({ ticker, from: p.coreSatellite, to: n.coreSatellite });
    }
  }

  // Stable ordering for predictable display.
  const byTicker = <T extends { ticker: string }>(a: T, b: T) =>
    a.ticker.localeCompare(b.ticker);
  added.sort(byTicker);
  removed.sort(byTicker);
  quantityChanged.sort(byTicker);
  priceChanged.sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange));
  weightChanged.sort((a, b) => Math.abs(b.deltaBps) - Math.abs(a.deltaBps));
  statusChanged.sort(byTicker);
  classificationChanged.sort(byTicker);

  return {
    added,
    removed,
    quantityChanged,
    priceChanged,
    weightChanged,
    statusChanged,
    classificationChanged,
  };
}

// Convenience: total number of material changes across all categories.
export function totalChangeCount(s: ChangeSummary): number {
  return (
    s.added.length +
    s.removed.length +
    s.quantityChanged.length +
    s.priceChanged.length +
    s.weightChanged.length +
    s.statusChanged.length +
    s.classificationChanged.length
  );
}
