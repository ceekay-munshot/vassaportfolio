import { chart } from "@/theme/tokens";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Layers, Briefcase, Award, TrendingUp, Filter } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { StatTile } from "@/components/StatTile";
import { usePortfolio } from "@/context/PortfolioContext";
import { activeOf, mvBase, managerOf } from "@/lib/portfolioAnalytics";
import { changeColor, fmtPct } from "@/lib/format";
import { FUND_ANALYTICS, type FundMetrics } from "@/data/mockFundAnalytics";
import { chartTooltipStyle, chartTooltipLabelStyle, chartTooltipItemStyle } from "@/lib/chartTheme";

type Row = FundMetrics & { investedMV: number };
type SortKey = "ret3y" | "sharpe" | "alpha";

const VEHICLE_COLOR: Record<string, string> = {
  "Mutual Fund": chart.primary,
  PMS: chart.categorical[1],
  AIF: chart.categorical[3],
};

export function FundAnalytics() {
  const { portfolio, fmtFromBase } = usePortfolio();
  const [vehicle, setVehicle] = useState<string>("All");
  const [sortKey, setSortKey] = useState<SortKey>("ret3y");
  if (!portfolio) return null;

  const invested = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of activeOf(portfolio)) m.set(managerOf(h), (m.get(managerOf(h)) ?? 0) + mvBase(h));
    return m;
  }, [portfolio]);

  const rows = useMemo<Row[]>(() => {
    let r: Row[] = FUND_ANALYTICS.map((f) => ({ ...f, investedMV: invested.get(f.manager) ?? 0 }));
    if (vehicle !== "All") r = r.filter((x) => x.vehicle === vehicle);
    return r.sort((a, b) => b[sortKey] - a[sortKey]);
  }, [invested, vehicle, sortKey]);

  const totalInvested = rows.reduce((s, r) => s + r.investedMV, 0);
  const bestSharpe = [...rows].sort((a, b) => b.sharpe - a.sharpe)[0];
  const avgAlpha = rows.length ? rows.reduce((s, r) => s + r.alpha, 0) / rows.length : 0;

  const scatterByVehicle = useMemo(() => {
    const groups: Record<string, { x: number; y: number; z: number; manager: string; sharpe: number }[]> = {};
    for (const r of rows) {
      (groups[r.vehicle] = groups[r.vehicle] || []).push({
        x: r.stdDev,
        y: r.ret3y,
        z: Math.max(r.investedMV, 1),
        manager: r.manager,
        sharpe: r.sharpe,
      });
    }
    return groups;
  }, [rows]);

  return (
    <div>
      <PageHeader
        eyebrow="Analytics"
        title="Fund & Scheme Analytics"
        subtitle="Evaluate the schemes you're invested in — rolling returns, risk-adjusted ratios and capture, benchmarked. This is fund evaluation, not AMC-stock tracking."
        right={<Pill tone="info">vs scheme benchmarks</Pill>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Schemes evaluated" value={rows.length} sub="MF · PMS · AIF" icon={<Layers className="h-4 w-4" />} />
        <StatTile label="Invested via managers" value={fmtFromBase(totalInvested, { compact: true })} sub="across the shown schemes" icon={<Briefcase className="h-4 w-4" />} />
        <StatTile label="Best risk-adjusted" value={bestSharpe ? bestSharpe.manager.split(" ").slice(0, 2).join(" ") : "—"} sub={bestSharpe ? `Sharpe ${bestSharpe.sharpe.toFixed(2)}` : "—"} icon={<Award className="h-4 w-4" />} />
        <StatTile label="Average alpha" value={fmtPct(avgAlpha, { sign: true, decimals: 1 })} sub="annualized, vs benchmark" delta={avgAlpha} icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      <Card className="mt-5" pad>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <Filter className="h-3.5 w-3.5" />
            <span className="label-xs">Vehicle</span>
            <select value={vehicle} onChange={(e) => setVehicle(e.target.value)} className="rounded-md border border-slate-700 bg-ink-700 px-2 py-1.5 text-xs text-slate-200 ring-focus">
              {["All", "Mutual Fund", "PMS", "AIF"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <span className="label-xs">Sort by</span>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="rounded-md border border-slate-700 bg-ink-700 px-2 py-1.5 text-xs text-slate-200 ring-focus">
              <option value="ret3y">3Y return</option>
              <option value="sharpe">Sharpe ratio</option>
              <option value="alpha">Alpha</option>
            </select>
          </label>
        </div>
      </Card>

      <Card className="mt-5" title="Risk vs return" subtitle="3Y return against volatility — bubble size = your invested amount">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
              <CartesianGrid stroke={chart.grid} strokeDasharray="2 4" />
              <XAxis type="number" dataKey="x" name="Volatility" unit="%" stroke={chart.axis} fontSize={11} domain={["dataMin - 1", "dataMax + 1"]} label={{ value: "Volatility (σ, %)", position: "insideBottom", offset: -4, fill: chart.axis, fontSize: 11 }} />
              <YAxis type="number" dataKey="y" name="3Y return" unit="%" stroke={chart.axis} fontSize={11} domain={["dataMin - 2", "dataMax + 2"]} />
              <ZAxis type="number" dataKey="z" range={[60, 420]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={chartTooltipStyle}
                labelStyle={chartTooltipLabelStyle}
                itemStyle={chartTooltipItemStyle}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as { manager: string; x: number; y: number; sharpe: number };
                  return (
                    <div style={chartTooltipStyle} className="px-3 py-2 text-xs">
                      <div className="font-semibold" style={{ color: "var(--chart-tooltip-text)" }}>{p.manager}</div>
                      <div style={{ color: "var(--chart-tooltip-muted)" }}>3Y {p.y.toFixed(1)}% · σ {p.x.toFixed(1)}% · Sharpe {p.sharpe.toFixed(2)}</div>
                    </div>
                  );
                }}
              />
              {Object.entries(scatterByVehicle).map(([v, data]) => (
                <Scatter key={v} name={v} data={data} fill={VEHICLE_COLOR[v] ?? chart.benchmark} fillOpacity={0.8} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
          {Object.keys(VEHICLE_COLOR).map((v) => (
            <span key={v} className="flex items-center gap-1.5 text-slate-400">
              <span className="h-2 w-2 rounded-full" style={{ background: VEHICLE_COLOR[v] }} />
              {v}
            </span>
          ))}
        </div>
      </Card>

      <Card className="mt-5" title="Scheme metrics" subtitle="Rolling returns, risk-adjusted ratios and capture vs benchmark" pad={false}>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-slate-800">
              <tr>
                <th className="label-xs px-4 py-2 text-left font-medium">Scheme</th>
                <th className="label-xs px-4 py-2 text-left font-medium">Vehicle</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Your MV</th>
                <th className="label-xs px-4 py-2 text-right font-medium">1Y</th>
                <th className="label-xs px-4 py-2 text-right font-medium">3Y</th>
                <th className="label-xs px-4 py-2 text-right font-medium">5Y</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Active 3Y</th>
                <th className="label-xs px-4 py-2 text-right font-medium">σ</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Sharpe</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Sortino</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Treynor</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Up / Down</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Alpha</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Expense</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {rows.map((r) => {
                const active3y = r.ret3y - r.benchRet3y;
                const isTopSharpe = bestSharpe && r.manager === bestSharpe.manager;
                return (
                  <tr key={r.manager} className={`hover:bg-slate-800/30 ${isTopSharpe ? "bg-gold-500/[0.04]" : ""}`}>
                    <td className={`px-4 py-2.5 ${isTopSharpe ? "border-l-2 border-gold-500" : ""}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-100">{r.manager}</span>
                        {isTopSharpe && <Pill tone="satellite">Top Sharpe</Pill>}
                      </div>
                      <div className="text-[11px] text-slate-500">{r.category} · {r.benchmark}</div>
                    </td>
                    <td className="px-4 py-2.5"><Pill tone="info">{r.vehicle}</Pill></td>
                    <td className="px-4 py-2.5 text-right mono text-slate-200">{r.investedMV > 0 ? fmtFromBase(r.investedMV, { compact: true }) : "—"}</td>
                    <td className="px-4 py-2.5 text-right mono text-slate-300">{fmtPct(r.ret1y)}</td>
                    <td className="px-4 py-2.5 text-right mono text-slate-100">{fmtPct(r.ret3y)}</td>
                    <td className="px-4 py-2.5 text-right mono text-slate-300">{fmtPct(r.ret5y)}</td>
                    <td className={`px-4 py-2.5 text-right mono ${changeColor(active3y)}`}>{fmtPct(active3y, { sign: true })}</td>
                    <td className="px-4 py-2.5 text-right mono text-slate-400">{r.stdDev.toFixed(1)}%</td>
                    <td className="px-4 py-2.5 text-right mono text-slate-100">{r.sharpe.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right mono text-slate-300">{r.sortino.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right mono text-slate-300">{r.treynor.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right mono text-slate-300">{r.upCapture} / {r.downCapture}</td>
                    <td className={`px-4 py-2.5 text-right mono ${changeColor(r.alpha)}`}>{fmtPct(r.alpha, { sign: true, decimals: 1 })}</td>
                    <td className="px-4 py-2.5 text-right mono text-slate-400">{r.expenseRatio.toFixed(2)}%</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={14} className="px-4 py-10 text-center text-xs text-slate-500">No schemes for this vehicle filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-3 px-1 text-[11px] text-slate-500">
        Returns are trailing/rolling CAGR. Capture shows up-market / down-market participation vs benchmark. Figures illustrative until a live AMFI / scheme-NAV feed is connected.
      </p>
    </div>
  );
}
