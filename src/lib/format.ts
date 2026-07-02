// Currency / number / date formatters used across the dashboard. Centralized
// so the whole app uses the same conventions (and we don't have 12 versions
// of "format USD compact").

export type CurrencyCode = "USD" | "INR" | "EUR" | "GBP";

const LOCALE_BY_CURRENCY: Record<string, string> = {
  USD: "en-US",
  INR: "en-IN",
  EUR: "en-GB",
  GBP: "en-GB",
};

// ISO 4217 currency codes we'll happily hand to Intl.NumberFormat. Anything
// else (including the legacy "Mixed" sentinel that lived in older portfolio
// snapshots) falls back to INR — our default — so a stale localStorage
// entry never blanks the page with a RangeError.
const VALID_CURRENCY_CODES = new Set([
  "USD", "INR", "EUR", "GBP", "JPY", "HKD", "SGD", "CAD", "AUD", "CNY",
]);

// Clean Indian compact magnitude — "₹1.93 Cr" / "₹8.4 L" — instead of the
// browser's clumsy "₹1.93TCr". Used for every compact INR value in the app.
function inrCompactMagnitude(abs: number): string {
  if (abs >= 1e7) return `₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(abs / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) return `₹${(abs / 1e3).toFixed(1)}K`;
  return `₹${Math.round(abs).toLocaleString("en-IN")}`;
}

export function fmtCurrency(
  n: number,
  code: string = "INR",
  opts?: { compact?: boolean; sign?: boolean },
): string {
  const effective = VALID_CURRENCY_CODES.has(code) ? code : "INR";
  const locale = LOCALE_BY_CURRENCY[effective] ?? "en-IN";
  const sign = opts?.sign && n > 0 ? "+" : "";
  // INR compact → clean lakh/crore formatting (the family-office convention).
  if (opts?.compact && effective === "INR") {
    const prefix = n < 0 ? "-" : sign;
    return prefix + inrCompactMagnitude(Math.abs(n));
  }
  try {
    const formatted = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: effective,
      notation: opts?.compact ? "compact" : "standard",
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(n);
    return sign + formatted;
  } catch {
    // Last-ditch fallback for any Intl edge case (older browsers, exotic
    // locales). Never throw out of a formatter — that's how UIs go dark.
    return `${sign}${effective} ${n.toLocaleString(locale, { maximumFractionDigits: 2 })}`;
  }
}

// Legacy alias — many components still call fmtUSD; route it through fmtCurrency.
export function fmtUSD(n: number, opts?: { compact?: boolean; sign?: boolean }): string {
  return fmtCurrency(n, "USD", opts);
}

export function fmtPct(n: number, opts?: { sign?: boolean; decimals?: number }): string {
  const sign = opts?.sign && n > 0 ? "+" : "";
  const d = opts?.decimals ?? 2;
  return `${sign}${n.toFixed(d)}%`;
}

export function fmtNum(n: number, decimals = 0): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(n);
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function changeColor(n: number): string {
  if (n > 0) return "text-gain";
  if (n < 0) return "text-loss";
  return "text-slate-400";
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - then) / 1000);
  const future = diffSec < 0;
  const abs = Math.abs(diffSec);
  const phrase = (n: number, unit: string) => (future ? `in ${n}${unit}` : `${n}${unit} ago`);
  if (abs < 60) return future ? "soon" : `${abs}s ago`;
  const diffMin = Math.round(abs / 60);
  if (diffMin < 60) return phrase(diffMin, "m");
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return phrase(diffH, "h");
  const diffD = Math.round(diffH / 24);
  if (diffD < 30) return phrase(diffD, "d");
  return fmtDate(iso);
}

// Format a basis-point delta for weight changes.
export function fmtBps(bps: number, opts?: { sign?: boolean }): string {
  const sign = opts?.sign && bps > 0 ? "+" : "";
  const abs = Math.round(Math.abs(bps));
  return `${sign}${bps < 0 ? "-" : ""}${abs} bps`;
}
