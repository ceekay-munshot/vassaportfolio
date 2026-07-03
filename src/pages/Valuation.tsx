import { useEffect, useState, type ReactNode } from "react";
import { Calculator, Gauge, TrendingUp, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { usePortfolio } from "@/context/PortfolioContext";
import { fmtPct, changeColor } from "@/lib/format";
import { fetchDetails, type DetailQuote } from "@/lib/priceService";
import type { Holding } from "@/lib/portfolioTypes";

const mv = (h: Holding) => h.marketValueBase ?? h.marketValue;
// Multiples of 0 mean "no data" from the feed (a real ratio is never exactly 0).
const fmtX = (n?: number) => (n == null || n === 0 ? "—" : `${n.toFixed(1)}×`);
const fmtMcap = (n?: number) =>
  n == null ? "—" : n >= 1e12 ? `₹${(n / 1e12).toFixed(2)} L Cr` : n >= 1e7 ? `₹${(n / 1e7).toFixed(0)} Cr` : `₹${Math.round(n)}`;

// Simple, clearly-labelled valuation read from trailing P/E.
function valRead(pe?: number): { label: string; tone: "gain" | "loss" | "warn" | "muted" } {
  if (pe == null) return { label: "—", tone: "muted" };
  if (pe < 0) return { label: "Loss-making", tone: "warn" };
  if (pe < 18) return { label: "Value", tone: "gain" };
  if (pe <= 35) return { label: "Fair", tone: "muted" };
  if (pe <= 60) return { label: "Rich", tone: "warn" };
  return { label: "Expensive", tone: "loss" };
}

export function Valuation() {
  const { portfolio } = usePortfolio();
  const holdings = portfolio?.holdings ?? [];
  const [details, setDetails] = useState<Record<string, DetailQuote>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const targets = holdings.filter((h) => h.vehicle !== "Mutual Fund");
    const symbols = Array.from(new Set(targets.map((h) => h.apiTicker ?? h.ticker)));
    if (symbols.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchDetails(symbols).then((d) => {
      if (!cancelled) {
        setDetails(d);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolio?.id]);

  if (!portfolio) return null;

  const rows = holdings
    .filter((h) => h.vehicle !== "Mutual Fund")
    .map((h) => ({ h, d: details[h.apiTicker ?? h.ticker] }))
    .sort((a, b) => mv(b.h) - mv(a.h));

  // Earnings-weighted portfolio P/E and P/B; MV-weighted revenue growth.
  const priced = rows.filter((r) => r.d);
  const sumMV = priced.reduce((s, r) => s + mv(r.h), 0);
  const invPE = priced.reduce((s, r) => (r.d?.peTrailing && r.d.peTrailing > 0 ? s + mv(r.h) / r.d.peTrailing : s), 0);
  const invPB = priced.reduce((s, r) => (r.d?.priceToBook && r.d.priceToBook > 0 ? s + mv(r.h) / r.d.priceToBook : s), 0);
  const portPE = invPE > 0 ? sumMV / invPE : undefined;
  const portPB = invPB > 0 ? sumMV / invPB : undefined;
  let gN = 0, gD = 0;
  for (const r of priced) {
    if (r.d?.revenueGrowthPct != null) {
      gN += mv(r.h) * r.d.revenueGrowthPct;
      gD += mv(r.h);
    }
  }
  const blendedGrowth = gD > 0 ? gN / gD : undefined;

  return (
    <div className="pb-8">
      <PageHeader
        eyebrow="Analytics"
        title="Fundamentals & Valuation"
        subtitle="Live valuation multiples and growth for each holding, from the detail-quote feed. Mutual funds are excluded (no single-company fundamentals)."
        right={
          loading ? (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading fundamentals…</span>
          ) : (
            <span className="text-xs text-slate-500">{priced.length} of {rows.length} priced</span>
          )
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile icon={<Gauge className="h-4 w-4" />} label="Portfolio P/E" value={portPE != null ? fmtX(portPE) : "—"} sub="Earnings-weighted (trailing)" />
        <Tile icon={<Calculator className="h-4 w-4" />} label="Portfolio P/B" value={portPB != null ? fmtX(portPB) : "—"} sub="Earnings-weighted" />
        <Tile
          icon={<TrendingUp className="h-4 w-4" />}
          label="Blended revenue growth"
          value={blendedGrowth != null ? fmtPct(blendedGrowth, { sign: true }) : "—"}
          sub="Value-weighted"
          tone={blendedGrowth != null && blendedGrowth >= 0 ? "gain" : blendedGrowth != null ? "loss" : undefined}
        />
        <Tile label="Coverage" value={`${priced.length}/${rows.length}`} sub="Holdings with fundamentals" />
      </div>

      <Card pad={false}>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="label-xs px-4 py-2.5 text-left font-medium">Stock</th>
                <th className="label-xs px-3 py-2.5 text-right font-medium">Mkt Cap</th>
                <th className="label-xs px-3 py-2.5 text-right font-medium">P/E (T)</th>
                <th className="label-xs px-3 py-2.5 text-right font-medium">P/E (F)</th>
                <th className="label-xs px-3 py-2.5 text-right font-medium">P/B</th>
                <th className="label-xs px-3 py-2.5 text-right font-medium">EV/EBITDA</th>
                <th className="label-xs px-3 py-2.5 text-right font-medium">Rev growth</th>
                <th className="label-xs px-3 py-2.5 text-right font-medium">Read</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {rows.map(({ h, d }) => {
                const read = valRead(d?.peTrailing);
                return (
                  <tr key={h.isin ?? h.ticker} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <span className="mono font-semibold text-slate-100">{h.ticker}</span>
                      <div className="text-[11px] text-slate-500">{d?.industry ?? h.sector}</div>
                    </td>
                    <td className="px-3 py-3 text-right mono text-slate-300">{fmtMcap(d?.marketCap)}</td>
                    <td className="px-3 py-3 text-right mono text-slate-200">{fmtX(d?.peTrailing)}</td>
                    <td className="px-3 py-3 text-right mono text-slate-400">{fmtX(d?.peForward)}</td>
                    <td className="px-3 py-3 text-right mono text-slate-300">{fmtX(d?.priceToBook)}</td>
                    <td className="px-3 py-3 text-right mono text-slate-300">{fmtX(d?.evEbitda)}</td>
                    <td className={`px-3 py-3 text-right mono ${d?.revenueGrowthPct != null ? changeColor(d.revenueGrowthPct) : "text-slate-500"}`}>
                      {d?.revenueGrowthPct != null ? fmtPct(d.revenueGrowthPct, { sign: true }) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          read.tone === "gain"
                            ? "border-emerald-500/30 text-emerald-600"
                            : read.tone === "loss"
                              ? "border-rose-500/30 text-rose-500"
                              : read.tone === "warn"
                                ? "border-amber-500/30 text-amber-600"
                                : "border-slate-700 text-slate-400"
                        }`}
                      >
                        {read.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-800 px-4 py-2 text-[11px] text-slate-500">
          "Read" is a rule-of-thumb from trailing P/E (Value &lt;18× · Fair 18–35× · Rich 35–60× · Expensive &gt;60×), not advice. Fundamentals via the detail-quote feed.
        </div>
      </Card>
    </div>
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
