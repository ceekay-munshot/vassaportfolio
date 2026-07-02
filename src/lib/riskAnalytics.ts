// Risk analytics — pure functions over the live holdings. Everything here is
// derived from real data (holdings + live quote stats); the only user-supplied
// numbers are the leverage inputs (pledge / F&O), which the dashboard can't get
// from the uploaded files.

import type { Holding } from "@/lib/portfolioTypes";

const mvOf = (h: Holding) => h.marketValueBase ?? h.marketValue;

export function navOf(holdings: Holding[]): number {
  return holdings.reduce((s, h) => s + mvOf(h), 0);
}

export type SectorSlice = { sector: string; value: number; weight: number };

export function sectorAllocation(holdings: Holding[]): SectorSlice[] {
  const nav = navOf(holdings);
  const m = new Map<string, number>();
  for (const h of holdings) m.set(h.sector, (m.get(h.sector) ?? 0) + mvOf(h));
  return Array.from(m, ([sector, value]) => ({ sector, value, weight: nav > 0 ? value / nav : 0 })).sort(
    (a, b) => b.value - a.value,
  );
}

export type Concentration = {
  top5Weight: number;
  maxNameWeight: number;
  maxName: string;
  maxSectorWeight: number;
  maxSector: string;
  hhi: number; // Herfindahl index, 0..1
  effectiveNames: number; // 1 / hhi
};

export function concentration(holdings: Holding[]): Concentration {
  const nav = navOf(holdings);
  const weights = holdings
    .map((h) => ({ name: h.ticker, w: nav > 0 ? mvOf(h) / nav : 0 }))
    .sort((a, b) => b.w - a.w);
  const sectors = sectorAllocation(holdings);
  const hhi = weights.reduce((s, x) => s + x.w * x.w, 0);
  return {
    top5Weight: weights.slice(0, 5).reduce((s, x) => s + x.w, 0),
    maxNameWeight: weights[0]?.w ?? 0,
    maxName: weights[0]?.name ?? "—",
    maxSectorWeight: sectors[0]?.weight ?? 0,
    maxSector: sectors[0]?.sector ?? "—",
    hhi,
    effectiveNames: hhi > 0 ? 1 / hhi : 0,
  };
}

// Per-stock annualized volatility PROXY from the 52-week range. This is an
// approximation (range width, not a returns series); a 52-week high–low span is
// roughly ~4σ of the annual path, so we divide by 4. Clearly labeled in the UI.
export function volProxy(h: Holding): number | undefined {
  if (h.week52High == null || h.week52Low == null || !h.currentPrice) return undefined;
  const mid = (h.week52High + h.week52Low) / 2;
  if (mid <= 0) return undefined;
  return (h.week52High - h.week52Low) / mid / 4;
}

// Weighted-average per-name vol (ignores correlation → conservative). Used only
// for an indicative VaR; full VaR needs a returns-history feed.
export function portfolioVol(holdings: Holding[]): number {
  const nav = navOf(holdings);
  if (nav <= 0) return 0;
  let v = 0;
  for (const h of holdings) {
    const vp = volProxy(h);
    if (vp != null) v += (mvOf(h) / nav) * vp;
  }
  return v;
}

// Position within the 52-week range: 0 = at the low, 1 = at the high.
export function rangePosition(h: Holding): number | undefined {
  if (h.week52High == null || h.week52Low == null || h.week52High <= h.week52Low) return undefined;
  return (h.currentPrice - h.week52Low) / (h.week52High - h.week52Low);
}

// --- Leverage (the one place with user-supplied numbers) --------------------

export type LeverageInputs = {
  pledgedPct: number; // % of portfolio value pledged as collateral
  ltvPct: number;     // loan-to-value the lender gives against pledged stock
  fnoMarginCr: number;   // F&O margin currently blocked (₹ crore)
  fnoNotionalCr: number; // F&O notional exposure standing (₹ crore)
};

export type LeverageOutputs = {
  collateral: number;
  borrowingLimit: number;
  marginUsed: number;
  marginUtil: number;
  buffer: number;
  grossExposure: number;
  grossLeverage: number;
  var1dValue: number;
  var1dPctNetWorth: number;
  stressBuffer10: number; // buffer after a 10% market drop
};

const CR = 1e7;

export function computeLeverage(nav: number, inp: LeverageInputs, pVol: number): LeverageOutputs {
  const collateral = nav * (inp.pledgedPct / 100);
  const borrowingLimit = collateral * (inp.ltvPct / 100);
  const marginUsed = inp.fnoMarginCr * CR;
  const fnoNotional = inp.fnoNotionalCr * CR;
  const grossExposure = nav + fnoNotional;
  const oneDayVol = pVol / Math.sqrt(252);
  const var1dValue = grossExposure * oneDayVol * 1.65; // 95% one-day
  return {
    collateral,
    borrowingLimit,
    marginUsed,
    marginUtil: borrowingLimit > 0 ? marginUsed / borrowingLimit : 0,
    buffer: borrowingLimit - marginUsed,
    grossExposure,
    grossLeverage: nav > 0 ? grossExposure / nav : 0,
    var1dValue,
    var1dPctNetWorth: nav > 0 ? (var1dValue / nav) * 100 : 0,
    // A 10% market fall shrinks pledged collateral (and thus the limit) ~10%.
    stressBuffer10: borrowingLimit * 0.9 - marginUsed,
  };
}
