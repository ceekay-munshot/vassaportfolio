// Shared portfolio math used across the multi-vehicle views. Centralized so
// the consolidated / manager / family / look-through pages all compute the
// same way and the per-row accessors handle the FX-normalized *Base fields
// consistently (falling back to native fields for pre-FX snapshots).

import type { Holding, Portfolio, Vehicle } from "./portfolioTypes";
import { MANAGER_VEHICLES } from "./portfolioTypes";

// --- Per-row accessors (always in the portfolio's base currency) ------------

export const mvBase = (h: Holding): number => h.marketValueBase ?? h.marketValue;
export const costBaseOf = (h: Holding): number => h.costBasisBase ?? h.costBasis;
export const pnlBase = (h: Holding): number => h.unrealizedPnLBase ?? h.unrealizedPnL;

export const vehicleOf = (h: Holding): Vehicle => h.vehicle ?? "Direct Equity";

// High-level asset-allocation buckets used for the expected-vs-actual mix per
// family member / entity.
export type AllocationBucket =
  | "Equity"
  | "Fixed Income"
  | "Gold"
  | "Real Estate"
  | "Private & Alternatives";

export const ALLOCATION_BUCKETS: AllocationBucket[] = [
  "Equity",
  "Fixed Income",
  "Gold",
  "Real Estate",
  "Private & Alternatives",
];

export function allocationBucketOf(h: Holding): AllocationBucket {
  if (h.assetClass === "Bond") return "Fixed Income";
  if (h.assetClass === "Commodity") return "Gold";
  if (h.assetClass === "Real Estate") return "Real Estate";
  const v = vehicleOf(h);
  if (v === "Gold") return "Gold";
  if (v === "Fixed Income") return "Fixed Income";
  if (v === "Real Estate") return "Real Estate";
  if (v === "Private" || h.assetClass === "Alternative") return "Private & Alternatives";
  return "Equity";
}
export const managerOf = (h: Holding): string => h.manager ?? "In-house (Direct)";
export const familyOf = (h: Holding): string => h.familyMember ?? "Glow Ventures LLP";
export const isManagerVehicle = (h: Holding): boolean => MANAGER_VEHICLES.includes(vehicleOf(h));

// --- Aggregation helpers ----------------------------------------------------

export type Bucket = {
  key: string;
  mv: number;
  cost: number;
  pnl: number;
  count: number;
  returnPct: number;
  weight: number; // share of the grouped total
};

// Group active (non-exited) holdings by an arbitrary key and roll up
// value / cost / P&L / count, with each bucket's return and weight.
export function bucketBy(holdings: Holding[], keyFn: (h: Holding) => string): Bucket[] {
  const map = new Map<string, { mv: number; cost: number; pnl: number; count: number }>();
  for (const h of holdings) {
    const k = keyFn(h);
    const cur = map.get(k) ?? { mv: 0, cost: 0, pnl: 0, count: 0 };
    cur.mv += mvBase(h);
    cur.cost += costBaseOf(h);
    cur.pnl += pnlBase(h);
    cur.count += 1;
    map.set(k, cur);
  }
  const total = [...map.values()].reduce((s, v) => s + v.mv, 0);
  return [...map.entries()]
    .map(([key, v]) => ({
      key,
      mv: v.mv,
      cost: v.cost,
      pnl: v.pnl,
      count: v.count,
      returnPct: v.cost > 0 ? (v.pnl / v.cost) * 100 : 0,
      weight: total > 0 ? v.mv / total : 0,
    }))
    .sort((a, b) => b.mv - a.mv);
}

// Active holdings (everything except fully-exited positions).
export const activeOf = (pf: Portfolio): Holding[] => pf.holdings.filter((h) => h.status !== "Exited");

// --- Financial-year windows (Indian FY: 1 Apr – 31 Mar) ---------------------

// Returns the FY start year for a date — e.g., 2026-05-04 -> 2026 (FY2026-27).
export function fyStartYear(d: Date): number {
  const y = d.getFullYear();
  return d.getMonth() >= 3 ? y : y - 1; // months are 0-based; April = 3
}

export function fyLabel(startYear: number): string {
  const end = (startYear + 1) % 100;
  return `FY${startYear}-${String(end).padStart(2, "0")}`;
}

// A holding bought within the given financial year (by purchaseDate).
export function purchasedInFY(h: Holding, startYear: number): boolean {
  if (!h.purchaseDate) return false;
  const d = new Date(h.purchaseDate);
  if (Number.isNaN(d.getTime())) return false;
  return fyStartYear(d) === startYear;
}

// Whole-period (since-purchase) holding period in years, for an XIRR proxy.
export function holdingYears(h: Holding, asOf: Date): number {
  if (!h.purchaseDate) return 0;
  const d = new Date(h.purchaseDate);
  if (Number.isNaN(d.getTime())) return 0;
  const ms = asOf.getTime() - d.getTime();
  return Math.max(ms / (365.25 * 24 * 3600 * 1000), 0);
}

// Annualized return (CAGR / XIRR proxy) from the simple since-purchase return
// and the holding period. Falls back to the simple return for very short or
// unknown holding periods.
export function annualizedReturn(h: Holding, asOf: Date): number {
  const years = holdingYears(h, asOf);
  const simple = h.returnPct / 100;
  if (years < 0.5) return h.returnPct;
  return (Math.pow(1 + simple, 1 / years) - 1) * 100;
}
