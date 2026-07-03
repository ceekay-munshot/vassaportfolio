import { useEffect, useState, type ReactNode } from "react";
import { Calculator, Gauge, TrendingUp, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { usePortfolio } from "@/context/PortfolioContext";
import { fmtPct } from "@/lib/format";
import { fetchDetails, type DetailQuote } from "@/lib/priceService";
import type { Holding } from "@/lib/portfolioTypes";

const mv = (h: Holding) => h.marketValueBase ?? h.marketValue;
// Multiples of 0 mean "no data" from the feed (a real ratio is never exactly 0).
const fmtX = (n?: number) => (n == null || n === 0 ? "—" : `${n.toFixed(1)}×`);
const fmtMcap = (n?: number) =>
  n == null ? "—" : n >= 1e12 ? `₹${(n / 1e12).toFixed(2)} L Cr` : n >= 1e7 ? `₹${(n / 1e7).toFixed(0)} Cr` : `₹${Math.round(n)}`;

// The right valuation metric for a sector: P/B for financials, EV/EBITDA for
// cyclicals (materials), P/E for everything else.
type Metric = { key: string; label: string; pick: (d?: DetailQuote) => number | undefined };
function metricFor(sector: string): Metric {
  const s = sector.toLowerCase();
  if (s.includes("financ") || s.includes("bank")) return { key: "pb", label: "P/B", pick: (d) => d?.priceToBook };
  if (s.includes("material") || s.includes("metal") || s.includes("mining")) return { key: "ev", label: "EV/EBITDA", pick: (d) => d?.evEbitda };
  return { key: "pe", label: "P/E", pick: (d) => d?.peTrailing };
}
function median(xs: number[]): number | undefined {
  if (!xs.length) return undefined;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function Valuation() {
  const { portfolio } = usePortfolio();
  const holdings = portfolio?.holdings ?? [];
  const [details, setDetails] = useState<Record<string, DetailQuote>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const symbols = Array.from(
      new Set(holdings.filter((h) => h.vehicle !== "Mutual Fund").map((h) => h.apiTicker ?? h.ticker)),
    );
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
    .map((h) => ({ h, d: details[h.apiTicker ?? h.ticker] as DetailQuote | undefined }));
  const priced = rows.filter((r) => r.d);

  // Portfolio-level tiles.
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
  const totalMV = rows.reduce((s, r) => s + mv(r.h), 0);

  // Group by sector; each sector uses its own metric + median.
  const bySector = new Map<string, typeof rows>();
  for (const r of rows) bySector.set(r.h.sector, [...(bySector.get(r.h.sector) ?? []), r]);
  const sectors = Array.from(bySector.entries())
    .map(([sector, rs]) => {
      const metric = metricFor(sector);
      const vals = rs.map((r) => metric.pick(r.d)).filter((v): v is number => v != null && v > 0);
      const med = vals.length >= 2 ? median(vals) : undefined; // need ≥2 peers to compare
      const enriched = rs
        .map((r) => {
          const v = metric.pick(r.d);
          const ratio = v && med ? v / med : undefined;
          return { ...r, v, ratio };
        })
        .sort((a, b) => (a.v ?? Infinity) - (b.v ?? Infinity)); // cheapest first
      return { sector, metric, med, rows: enriched, mv: rs.reduce((s, r) => s + mv(r.h), 0) };
    })
    .sort((a, b) => b.mv - a.mv);

  return (
    <div className="pb-8">
      <PageHeader
        eyebrow="Analytics"
        title="Fundamentals & Valuation"
        subtitle="Sector-relative valuation — each holding vs the median of your peers in the same sector, on the right metric (P/B for banks, EV/EBITDA for cyclicals, P/E otherwise)."
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

      <div className="space-y-4">
        {sectors.map((sec) => (
          <Card key={sec.sector} pad={false}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
              <div className="font-display text-lg text-slate-100">{sec.sector}</div>
              <div className="flex items-center gap-3 text-xs">
                {sec.med != null ? (
                  <span className="pill">median {sec.metric.label} {fmtX(sec.med)}</span>
                ) : (
                  <span className="pill">single holding · no peer comparison</span>
                )}
                <span className="text-slate-500">{sec.rows.length} · {fmtPct((sec.mv / totalMV) * 100, { decimals: 0 })} of book</span>
              </div>
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800/70">
                    <th className="label-xs px-4 py-2 text-left font-medium">Stock</th>
                    <th className="label-xs px-3 py-2 text-right font-medium">Mkt Cap</th>
                    <th className="label-xs px-3 py-2 text-right font-medium">{sec.metric.label}</th>
                    <th className="label-xs px-3 py-2 text-right font-medium">vs sector</th>
                    <th className="label-xs px-3 py-2 text-right font-medium">Rev growth</th>
                    <th className="label-xs px-3 py-2 text-right font-medium">Read</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {sec.rows.map(({ h, d, v, ratio }) => {
                    const deltaPct = ratio != null ? (ratio - 1) * 100 : undefined;
                    const cheap = deltaPct != null && deltaPct < -15;
                    const rich = deltaPct != null && deltaPct > 15;
                    return (
                      <tr key={h.isin ?? h.ticker} className="hover:bg-slate-800/30">
                        <td className="px-4 py-2.5">
                          <span className="mono font-semibold text-slate-100">{h.ticker}</span>
                          <span className="ml-2 text-[11px] text-slate-500">{d?.industry ?? h.sector}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right mono text-slate-400">{fmtMcap(d?.marketCap)}</td>
                        <td className="px-3 py-2.5 text-right mono text-slate-100">{fmtX(v)}</td>
                        <td className={`px-3 py-2.5 text-right mono ${cheap ? "text-gain" : rich ? "text-loss" : "text-slate-400"}`}>
                          {deltaPct == null ? "—" : `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(0)}%`}
                        </td>
                        <td className={`px-3 py-2.5 text-right mono ${d?.revenueGrowthPct != null ? (d.revenueGrowthPct >= 0 ? "text-gain" : "text-loss") : "text-slate-500"}`}>
                          {d?.revenueGrowthPct != null ? fmtPct(d.revenueGrowthPct, { sign: true }) : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span
                            className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                              cheap
                                ? "border-emerald-500/30 text-emerald-600"
                                : rich
                                  ? "border-rose-500/30 text-rose-500"
                                  : "border-slate-700 text-slate-400"
                            }`}
                          >
                            {ratio == null ? "—" : cheap ? "Cheap vs sector" : rich ? "Rich vs sector" : "In line"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-3 text-[11px] text-slate-500">
        "Cheap/Rich vs sector" = the holding's sector metric vs the median of your other holdings in the same sector (needs ≥2 peers; bands ±15%).
        Metric per sector: P/B for financials, EV/EBITDA for materials/cyclicals, P/E otherwise. This is relative *within your book*, not vs the whole market —
        market-wide sector benchmarks would need an external feed. Multiples are as of the last reported earnings; mutual funds excluded.
      </div>
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
