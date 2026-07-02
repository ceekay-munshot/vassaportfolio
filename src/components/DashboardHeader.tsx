// Persistent strip rendered below the TopBar. Shows the active book's identity,
// the four headline numbers, and the two data-management controls.

import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Upload,
  Trash2,
  X,
  AlertTriangle,
  Wallet,
  TrendingUp,
  Landmark,
  Layers,
  RefreshCw,
} from "lucide-react";
import { usePortfolio, activeHoldings, distinctSectors } from "@/context/PortfolioContext";
import { changeColor, fmtDateTime, fmtPct } from "@/lib/format";

function fmtClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function DashboardHeader() {
  const navigate = useNavigate();
  const { portfolio, clearPortfolio, fmtFromBase, pricesAsOf, pricesLoading, refreshPrices } = usePortfolio();
  const [showConfirm, setShowConfirm] = useState(false);

  // Pre-upload variant: thin teaser strip that tells the user what's missing.
  if (!portfolio) {
    return (
      <div className="border-b border-slate-800 bg-ink-900/60 px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight text-slate-100">NV Family Office</div>
              <div className="text-[11px] text-slate-500">Awaiting portfolio to activate analytics</div>
            </div>
          </div>
          <Link to="/upload" className="btn-primary text-xs">
            <Upload className="h-3.5 w-3.5" />
            Upload Portfolio
          </Link>
        </div>
      </div>
    );
  }

  const active = activeHoldings(portfolio);
  const sectors = distinctSectors(portfolio).filter((s) => s !== "Unclassified");
  const nav = portfolio.totalValue;
  // Exclude Exited rows so Invested / P&L line up with NAV (which already
  // excludes them) — otherwise a book with realized exits mixes sold-position
  // cost/P&L into the live strip.
  const activeCost = portfolio.holdings.filter((h) => h.status !== "Exited" && !h.costUnknown);
  const invested = activeCost.reduce((s, h) => s + (h.costBasisBase ?? h.costBasis), 0);
  const pnl = activeCost.reduce((s, h) => s + (h.unrealizedPnLBase ?? h.unrealizedPnL), 0);
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

  return (
    <>
      <div className="border-b border-slate-800 bg-ink-900/60 px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight text-slate-100">NV Family Office</div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                <span>Consolidated Book</span>
                <span className="text-slate-700">·</span>
                <span>Holdings as of <span className="text-slate-300">{fmtDateTime(portfolio.uploadedAt)}</span></span>
                <span className="text-slate-700">·</span>
                {pricesLoading ? (
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Fetching live prices…
                  </span>
                ) : pricesAsOf ? (
                  <span className="inline-flex items-center gap-1 text-emerald-500">
                    ● Prices live
                    <span className="text-slate-500">· {fmtClock(pricesAsOf)}</span>
                    <button onClick={refreshPrices} title="Refresh prices" className="ml-0.5 text-slate-400 hover:text-slate-200">
                      <RefreshCw className="h-3 w-3" />
                    </button>
                  </span>
                ) : (
                  <span className="text-slate-500">○ Prices pending</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/upload")} className="btn-ghost text-xs">
              <Upload className="h-3.5 w-3.5" />
              Re-upload
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="btn-ghost text-xs text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCell
            icon={<Wallet className="h-3.5 w-3.5" />}
            label="Portfolio Value"
            value={fmtFromBase(nav, { compact: true })}
            sub="Live market value"
          />
          <SummaryCell
            icon={<Landmark className="h-3.5 w-3.5" />}
            label="Invested"
            value={fmtFromBase(invested, { compact: true })}
            sub="Cost basis"
          />
          <SummaryCell
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="Unrealized P&L"
            value={fmtFromBase(pnl, { compact: true, sign: true })}
            valueClass={changeColor(pnl)}
            sub={`${fmtPct(pnlPct, { sign: true })} on cost`}
          />
          <SummaryCell
            icon={<Layers className="h-3.5 w-3.5" />}
            label="Holdings"
            value={String(active.length)}
            sub={`${sectors.length} sectors`}
          />
        </div>
      </div>

      {showConfirm && (
        <ConfirmDialog
          onCancel={() => setShowConfirm(false)}
          onConfirm={() => {
            clearPortfolio();
            setShowConfirm(false);
            navigate("/upload");
          }}
        />
      )}
    </>
  );
}

function BrandMark() {
  return (
    <div className="grid h-9 w-9 place-items-center rounded-md border border-gold-500/30 bg-gold-500/10 text-gold-500">
      <span className="text-[13px] font-bold tracking-tight">NV</span>
    </div>
  );
}

function SummaryCell({
  icon,
  label,
  value,
  sub,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-slate-800 bg-ink-800/60 px-3 py-2">
      <div className="grid h-7 w-7 place-items-center rounded-md bg-ink-700 text-slate-400">{icon}</div>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="label-xs">{label}</div>
        <div className={`mt-0.5 text-sm font-semibold tabular ${valueClass ?? "text-slate-100"}`}>{value}</div>
        {sub && <div className="truncate text-[10px] text-slate-500">{sub}</div>}
      </div>
    </div>
  );
}

function ConfirmDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-xl border border-slate-800 bg-ink-800 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-100">Clear all portfolio data?</h3>
            <p className="mt-1 text-sm text-slate-400">
              This deletes the active book and history from this browser. This cannot be undone.
            </p>
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="btn-ghost text-xs">Cancel</button>
          <button onClick={onConfirm} className="btn text-xs bg-rose-500 text-white hover:bg-rose-400">
            <Trash2 className="h-3.5 w-3.5" />
            Clear everything
          </button>
        </div>
      </div>
    </div>
  );
}
