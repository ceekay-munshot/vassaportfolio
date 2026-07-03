import { useEffect, useState, type ReactNode } from "react";
import { Sunrise, TrendingUp, TrendingDown, Wallet, Plus, X, Eye } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { usePortfolio } from "@/context/PortfolioContext";
import { fmtCurrency, fmtPct, changeColor } from "@/lib/format";
import { fetchQuotes, type Quote } from "@/lib/priceService";
import type { Holding } from "@/lib/portfolioTypes";

const mv = (h: Holding) => h.marketValueBase ?? h.marketValue;
const prevVal = (h: Holding) => h.quantity * (h.prevClose ?? h.currentPrice);
const dayChangePct = (h: Holding) =>
  h.prevClose && h.prevClose > 0 ? ((h.currentPrice - h.prevClose) / h.prevClose) * 100 : 0;

const WKEY = "nv:watchlist";
const DEFAULT_WATCH = ["RELIANCE", "INFY", "SUNPHARMA"];

function useWatchlist(): [string[], (t: string) => void, (t: string) => void] {
  const [list, setList] = useState<string[]>(() => {
    try {
      const s = localStorage.getItem(WKEY);
      if (s) return JSON.parse(s);
    } catch {
      /* ignore */
    }
    return DEFAULT_WATCH;
  });
  useEffect(() => {
    try {
      localStorage.setItem(WKEY, JSON.stringify(list));
    } catch {
      /* ignore */
    }
  }, [list]);
  const add = (t: string) => setList((p) => (t && !p.includes(t) ? [...p, t] : p));
  const remove = (t: string) => setList((p) => p.filter((x) => x !== t));
  return [list, add, remove];
}

export function MorningCIO() {
  const { portfolio, fmtFromBase, pricesAsOf } = usePortfolio();
  const holdings = portfolio?.holdings ?? [];
  const inr = (n: number) => fmtFromBase(n, { compact: true });

  const nav = holdings.reduce((s, h) => s + mv(h), 0);
  const prevNav = holdings.reduce((s, h) => s + prevVal(h), 0);
  const dayChange = nav - prevNav;
  const dayPct = prevNav > 0 ? (dayChange / prevNav) * 100 : 0;

  const costHoldings = holdings.filter((h) => !h.costUnknown);
  const invested = costHoldings.reduce((s, h) => s + (h.costBasisBase ?? h.costBasis), 0);
  const pnl = costHoldings.reduce((s, h) => s + (h.unrealizedPnLBase ?? h.unrealizedPnL), 0);
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

  // Blended 1-year change: market-value-weighted average of holdings' own yearly change.
  let ycNum = 0;
  let ycDen = 0;
  for (const h of holdings) {
    if (h.yearlyChangePct != null) {
      ycNum += mv(h) * h.yearlyChangePct;
      ycDen += mv(h);
    }
  }
  const blended1y = ycDen > 0 ? ycNum / ycDen : undefined;

  const live = holdings.filter((h) => h.priceStatus === "live" && h.prevClose);
  const dayMovers = [...live].sort((a, b) => dayChangePct(b) - dayChangePct(a));
  const topUp = dayMovers.slice(0, 3);
  const topDown = [...dayMovers].reverse().slice(0, 3);
  const sinceCost = costHoldings.filter((h) => h.priceStatus === "live").sort((a, b) => b.returnPct - a.returnPct);

  if (!portfolio) return null;

  return (
    <div className="pb-8">
      <PageHeader
        eyebrow="Daily"
        title="Morning CIO"
        subtitle={`Your desk view — live NAV, today's movers and a tracker. Prices ${pricesAsOf ? "live" : "loading"}.`}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile icon={<Wallet className="h-4 w-4" />} label="Portfolio Value" value={inr(nav)} sub="Live NAV" />
        <Tile
          label="Today"
          value={fmtFromBase(dayChange, { compact: true, sign: true })}
          sub={fmtPct(dayPct, { sign: true })}
          tone={dayChange >= 0 ? "gain" : "loss"}
        />
        <Tile
          label="Unrealized P&L"
          value={fmtFromBase(pnl, { compact: true, sign: true })}
          sub={`${fmtPct(pnlPct, { sign: true })} on cost`}
          tone={pnl >= 0 ? "gain" : "loss"}
        />
        <Tile
          label="Blended 1-yr"
          value={blended1y != null ? fmtPct(blended1y, { sign: true }) : "—"}
          sub="Weighted, holdings' 1Y"
          tone={blended1y != null && blended1y >= 0 ? "gain" : blended1y != null ? "loss" : undefined}
        />
      </div>

      {/* Benchmark placeholder — honest until an index feed is wired */}
      <Card pad className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-slate-100">Portfolio vs NIFTY 500</div>
            <div className="text-[11px] text-slate-500">Your blended 1-year move is real; the index line needs a benchmark feed (the quote API is single-stock only).</div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400">You (1Y): <span className={`mono ${blended1y != null ? changeColor(blended1y) : ""}`}>{blended1y != null ? fmtPct(blended1y, { sign: true }) : "—"}</span></span>
            <span className="pill">NIFTY 500 · feed pending</span>
          </div>
        </div>
      </Card>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card pad>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gain" />
            <span className="text-sm font-semibold text-slate-100">Top movers today</span>
          </div>
          <div className="mt-3 space-y-1">
            {topUp.map((h) => <MoverRow key={h.ticker} h={h} inr={inr} />)}
            <div className="my-2 divider" />
            {topDown.map((h) => <MoverRow key={h.ticker} h={h} inr={inr} />)}
          </div>
        </Card>

        <Card pad>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-gold-500" />
            <span className="text-sm font-semibold text-slate-100">Best & worst since cost</span>
          </div>
          <div className="mt-3 space-y-1">
            {sinceCost.slice(0, 3).map((h) => <CostRow key={h.ticker} h={h} />)}
            <div className="my-2 divider" />
            {sinceCost.slice(-3).reverse().map((h) => <CostRow key={h.ticker} h={h} />)}
          </div>
        </Card>
      </div>

      <Watchlist />
    </div>
  );
}

function MoverRow({ h, inr }: { h: Holding; inr: (n: number) => string }) {
  const pct = dayChangePct(h);
  const val = h.quantity * (h.currentPrice - (h.prevClose ?? h.currentPrice));
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="mono font-semibold text-slate-100">{h.ticker}</span>
      <div className="flex items-center gap-3">
        <span className="mono text-slate-400">{fmtCurrency(h.currentPrice, "INR")}</span>
        <span className={`mono w-16 text-right ${changeColor(pct)}`}>{fmtPct(pct, { sign: true })}</span>
        <span className={`mono w-16 text-right ${changeColor(val)}`}>{inr(val)}</span>
      </div>
    </div>
  );
}

function CostRow({ h }: { h: Holding }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="mono font-semibold text-slate-100">{h.ticker}</span>
      <div className="flex items-center gap-3">
        <span className="mono text-slate-400">{fmtCurrency(h.averageCost, "INR")} → {fmtCurrency(h.currentPrice, "INR")}</span>
        <span className={`mono w-16 text-right ${changeColor(h.returnPct)}`}>{fmtPct(h.returnPct, { sign: true })}</span>
      </div>
    </div>
  );
}

function Watchlist() {
  const [list, add, remove] = useWatchlist();
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (list.length === 0) {
      setQuotes({});
      return;
    }
    setLoading(true);
    fetchQuotes(list).then((q) => {
      if (!cancelled) {
        setQuotes(q);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [list]);

  const submit = () => {
    const t = input.trim().toUpperCase();
    if (t) add(t);
    setInput("");
  };

  return (
    <Card pad>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-gold-500" />
          <span className="text-sm font-semibold text-slate-100">Watchlist</span>
          <span className="text-[11px] text-slate-500">— track names you don't own yet (live)</span>
        </div>
        <div className="flex items-center gap-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Add NSE symbol…"
            className="w-40 rounded-md border border-slate-700 bg-ink-700 px-2.5 py-1.5 text-xs text-slate-100 ring-focus"
          />
          <button onClick={submit} className="btn-ghost h-8 px-2.5" title="Add">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="label-xs px-2 py-2 text-left font-medium">Symbol</th>
              <th className="label-xs px-2 py-2 text-right font-medium">Price</th>
              <th className="label-xs px-2 py-2 text-right font-medium">Today</th>
              <th className="label-xs px-2 py-2 text-right font-medium">1Y</th>
              <th className="label-xs px-2 py-2 text-right font-medium">52-wk range</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {list.map((t) => {
              const q = quotes[t];
              const dp = q && q.previousClose ? ((q.currentPrice - q.previousClose) / q.previousClose) * 100 : undefined;
              return (
                <tr key={t} className="hover:bg-slate-800/30">
                  <td className="px-2 py-2.5 mono font-semibold text-slate-100">{t}</td>
                  <td className="px-2 py-2.5 text-right mono text-slate-200">{q ? fmtCurrency(q.currentPrice, "INR") : loading ? "…" : <span className="text-amber-500">n/a</span>}</td>
                  <td className={`px-2 py-2.5 text-right mono ${dp != null ? changeColor(dp) : "text-slate-500"}`}>{dp != null ? fmtPct(dp, { sign: true }) : "—"}</td>
                  <td className={`px-2 py-2.5 text-right mono ${q?.yearlyChangePct != null ? changeColor(q.yearlyChangePct) : "text-slate-500"}`}>
                    {q?.yearlyChangePct != null ? fmtPct(q.yearlyChangePct, { sign: true }) : "—"}
                  </td>
                  <td className="px-2 py-2.5 text-right mono text-[11px] text-slate-500">
                    {q?.week52Low != null && q?.week52High != null ? `${Math.round(q.week52Low)}–${Math.round(q.week52High)}` : "—"}
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <button onClick={() => remove(t)} className="text-slate-500 hover:text-rose-500" title="Remove">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-6 text-center text-xs text-slate-500">Add an NSE symbol to start tracking.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Tile({ icon, label, value, sub, tone }: { icon?: ReactNode; label: string; value: string; sub?: string; tone?: "gain" | "loss" }) {
  return (
    <Card pad>
      <div className="flex items-center gap-1.5 label-xs">
        {icon && <span className="text-gold-500">{icon}</span>}
        {label}
      </div>
      <div className={`mt-1 font-display text-2xl ${tone === "loss" ? "text-loss" : tone === "gain" ? "text-gain" : "text-slate-100"}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>}
    </Card>
  );
}
