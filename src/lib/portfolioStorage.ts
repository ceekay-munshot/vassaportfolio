// Single source of truth for localStorage I/O. All keys live here so nothing
// else in the app has to remember the exact key names — and changing the
// schema is one find-and-replace.

import type { Portfolio, UploadEvent, Vehicle, ManagerType } from "./portfolioTypes";
import { MANAGER_VEHICLES } from "./portfolioTypes";

export const STORAGE_KEYS = {
  ACTIVE_PORTFOLIO: "fo:portfolio:active",
  UPLOAD_HISTORY: "fo:portfolio:uploads",
  PRIOR_PORTFOLIO: "fo:portfolio:prior", // last portfolio kept around so diffs survive a refresh
} as const;

type Json<T> = T;

function safeRead<T>(key: string): Json<T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeWrite<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage can throw on quota — surface as console for now; the
    // caller can fall back to memory-only.
    console.warn("[portfolioStorage] failed to write", key);
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

// Portfolios may have been persisted by an older build of the app with a
// baseCurrency outside the current type's union (e.g. "Mixed"). Normalize
// on read so downstream Intl.NumberFormat calls never receive an invalid
// currency code. This is intentionally forgiving — we'd rather show INR
// than blank the dashboard.
function migratePortfolio(pf: Portfolio | null): Portfolio | null {
  if (!pf) return null;
  const allowed = new Set(["USD", "INR", "EUR", "GBP"]);
  let next = pf;
  if (!allowed.has(pf.baseCurrency as unknown as string)) {
    next = { ...pf, baseCurrency: "INR" };
  }
  // Back-fill the multi-vehicle dimensions for snapshots persisted before they
  // existed, so the consolidated / manager / family views never see undefined.
  const needsVehicleBackfill = next.holdings.some((h) => !h.vehicle);
  if (needsVehicleBackfill) {
    next = {
      ...next,
      holdings: next.holdings.map((h) => {
        if (h.vehicle) return h;
        const vehicle = inferVehicleFromLegacy(h);
        const managerType: ManagerType = MANAGER_VEHICLES.includes(vehicle) ? "Advisor" : "In-house";
        return {
          ...h,
          vehicle,
          manager: h.manager ?? (managerType === "In-house" ? "In-house (Direct)" : "Unassigned Advisor"),
          managerType: h.managerType ?? managerType,
          familyMember: h.familyMember ?? "Glow Ventures LLP",
        };
      }),
    };
  }
  return next;
}

// Best-effort vehicle inference for legacy holdings (no vehicle column was
// ever stored). Mirrors the parser's inference using benchmark/asset-class.
function inferVehicleFromLegacy(h: Portfolio["holdings"][number]): Vehicle {
  const b = (h.benchmark || "").toLowerCase();
  if (b.includes("private")) return "Private";
  if (h.assetClass === "Real Estate") return "Real Estate";
  if (h.assetClass === "Bond") return "Fixed Income";
  if (h.assetClass === "Commodity") return "Gold";
  if (h.assetClass === "Alternative") return "Private";
  return "Direct Equity";
}

export function readActivePortfolio(): Portfolio | null {
  return migratePortfolio(safeRead<Portfolio>(STORAGE_KEYS.ACTIVE_PORTFOLIO));
}

export function writeActivePortfolio(pf: Portfolio): void {
  safeWrite(STORAGE_KEYS.ACTIVE_PORTFOLIO, pf);
}

export function readPriorPortfolio(): Portfolio | null {
  return migratePortfolio(safeRead<Portfolio>(STORAGE_KEYS.PRIOR_PORTFOLIO));
}

export function writePriorPortfolio(pf: Portfolio): void {
  safeWrite(STORAGE_KEYS.PRIOR_PORTFOLIO, pf);
}

export function readUploads(): UploadEvent[] {
  return safeRead<UploadEvent[]>(STORAGE_KEYS.UPLOAD_HISTORY) ?? [];
}

export function writeUploads(events: UploadEvent[]): void {
  safeWrite(STORAGE_KEYS.UPLOAD_HISTORY, events);
}

// Convenience wrapper: append one upload event (newest-first).
export function prependUpload(ev: UploadEvent): UploadEvent[] {
  const current = readUploads();
  const next = [ev, ...current].slice(0, 50); // cap to last 50 to keep storage bounded
  writeUploads(next);
  return next;
}

// Atomic reset — used by "Clear Portfolio Data".
export function clearAllPortfolioState(): void {
  safeRemove(STORAGE_KEYS.ACTIVE_PORTFOLIO);
  safeRemove(STORAGE_KEYS.PRIOR_PORTFOLIO);
  safeRemove(STORAGE_KEYS.UPLOAD_HISTORY);
}

// Generate a stable uploadId based on time + random.
export function generateUploadId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `u_${Date.now()}_${rand}`;
}
