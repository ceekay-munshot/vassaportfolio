import { chart } from "@/theme/tokens";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { usePortfolio } from "@/context/PortfolioContext";
import { activeOf, mvBase, vehicleOf, isManagerVehicle } from "@/lib/portfolioAnalytics";
import { ALL_VEHICLES } from "@/lib/portfolioTypes";
import { chartTooltipStyle, chartTooltipItemStyle, chartTooltipLabelStyle } from "@/lib/chartTheme";

const PALETTE = chart.categorical;

// Illustrative NIFTY 500 sector weights (%), used for the variation-vs-benchmark
// read the family asked for ("my benchmark says Nifty 500 — what's my variation").
const NIFTY500_WEIGHTS: Record<string, number> = {
  Financials: 31.5,
  Technology: 12.8,
  Energy: 9.4,
  "Consumer Discretionary": 8.6,
  Industrials: 8.1,
  Healthcare: 7.2,
  "Consumer Staples": 6.9,
  Materials: 6.8,
  "Communication Services": 3.1,
  Utilities: 2.9,
  "Real Estate": 1.2,
};

type Scope = "Consolidated" | "Direct (no managers)" | "Via managers";

export function SectorComposition() {
  const { portfolio, fmtFromBase } = usePortfolio();
  const [scope, setScope] = useState<Scope>("Consolidated");
  const [vehicle, setVehicle] = useState<string>("All");
  if (!portfolio) return null;

  const holdings = useMemo(() => {
    return activeOf(portfolio).filter((h) => {
      if (scope === "Direct (no managers)" && isManagerVehicle(h)) return false;
      if (scope === "Via managers" && !isManagerVehicle(h)) return false;
      if (vehicle !== "All" && vehicleOf(h) !== vehicle) return false;
      return true;
    });
  }, [portfolio, scope, vehicle]);

  const totalMV = holdings.reduce((s, h) => s + mvBase(h), 0);

  const rows = useMemo(() => {
    const map: Record<string, { mv: number; positions: number }> = {};
    for (const h of holdings) {
      map[h.sector] = map[h.sector] || { mv: 0, positions: 0 };
      map[h.sector].mv += mvBase(h);
      map[h.sector].positions += 1;
    }
    return Object.entries(map)
      .map(([sector, v]) => {
        const actual = totalMV > 0 ? v.mv / totalMV : 0;
        const bench = NIFTY500_WEIGHTS[sector];
        return {
          sector,
          mv: v.mv,
          positions: v.positions,
          actual,
          bench: bench != null ? bench / 100 : null,
          variation: bench != null ? actual * 100 - bench : null,
        };
      })
      .sort((a, b) => b.mv - a.mv);
  }, [holdings, totalMV]);

  const sectorColor = (idx: number) => PALETTE[idx % PALETTE.length];
  const donutData = rows.map((r, i) => ({ name: r.sector, value: r.mv, color: sectorColor(i) }));
  const compareBars = rows.map((r) => ({
    name: r.sector.length > 12 ? r.sector.slice(0, 11) + "…" : r.sector,
    fullName: r.sector,
    Portfolio: Number((r.actual * 100).toFixed(1)),
    "NIFTY 500": r.bench != null ? Number((r.bench * 100).toFixed(1)) : 0,
  }));

  const SCOPES: Scope[] = ["Consolidated", "Direct (no managers)", "Via managers"];

  return (
    <div>
      <PageHeader
        eyebrow="Allocation"
        title="Sector Composition"
        subtitle="Sector tilts across your book, with the variation against your NIFTY 500 benchmark. Slice by vehicle to see direct-only or manager-routed exposure."
        right={<Pill tone="info">vs NIFTY 500</Pill>}
      />

      <Card className="mb-4" pad>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-0.5 rounded-md border border-slate-700 bg-ink-800/60 p-0.5">
            {SCOPES.map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={[
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors active:scale-[0.97]",
                  scope === s ? "bg-gold-500 text-ink-950" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200",
                ].join(" ")}
              >
                {s}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <span className="label-xs">Vehicle</span>
            <select value={vehicle} onChange={(e) => setVehicle(e.target.value)} className="rounded-md border border-slate-700 bg-ink-700 px-2 py-1.5 text-xs text-slate-200 ring-focus">
              {["All", ...ALL_VEHICLES].map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
          <span className="ml-auto text-[11px] text-slate-500">Fund/AIF/PMS holdings are tagged “Diversified”; benchmark variation applies to single-stock sectors.</span>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Sector mix" subtitle="Share of selected NAV">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} dataKey="value" innerRadius={56} outerRadius={92} paddingAngle={1.5} stroke="none">
                  {donutData.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmtFromBase(v, { compact: true })} contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs">
            {rows.slice(0, 10).map((r, i) => (
              <li key={r.sector} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-sm" style={{ background: sectorColor(i) }} />
                <span className="flex-1 truncate text-slate-300">{r.sector}</span>
                <span className="mono text-slate-200">{(r.actual * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2" title="Portfolio vs benchmark" subtitle="Your sector weight against NIFTY 500">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compareBars} margin={{ top: 8, right: 8, left: -8, bottom: 32 }}>
                <CartesianGrid stroke={chart.grid} strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="name" stroke={chart.axis} fontSize={10} interval={0} angle={-25} textAnchor="end" />
                <YAxis stroke={chart.axis} fontSize={11} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                  formatter={(v: number) => `${v.toFixed(1)}%`}
                  labelFormatter={(_, payload) => (payload?.[0]?.payload?.fullName as string) ?? ""}
                />
                <Bar dataKey="NIFTY 500" fill={chart.benchmarkBar} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Portfolio" fill={chart.primary} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="mt-5" title="Sector breakdown" subtitle="Weight, market value and variation vs NIFTY 500" pad={false}>
        <table className="min-w-full">
          <thead className="border-b border-slate-800">
            <tr>
              <th className="label-xs px-4 py-2 text-left font-medium">Sector</th>
              <th className="label-xs px-4 py-2 text-right font-medium">Positions</th>
              <th className="label-xs px-4 py-2 text-right font-medium">Mkt Value</th>
              <th className="label-xs px-4 py-2 text-right font-medium">Weight</th>
              <th className="label-xs px-4 py-2 text-right font-medium">NIFTY 500</th>
              <th className="label-xs px-4 py-2 text-right font-medium">Variation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 text-sm">
            {rows.map((r, i) => (
              <tr key={r.sector} className="hover:bg-slate-800/30">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-sm" style={{ background: sectorColor(i) }} />
                    <span className="text-slate-200">{r.sector}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right mono text-slate-300">{r.positions}</td>
                <td className="px-4 py-2.5 text-right mono text-slate-200">{fmtFromBase(r.mv, { compact: true })}</td>
                <td className="px-4 py-2.5 text-right mono text-slate-100">{(r.actual * 100).toFixed(2)}%</td>
                <td className="px-4 py-2.5 text-right mono text-slate-400">{r.bench != null ? `${(r.bench * 100).toFixed(1)}%` : "—"}</td>
                <td className="px-4 py-2.5 text-right">
                  {r.variation != null ? (
                    <Pill tone={Math.abs(r.variation) < 1 ? "default" : r.variation > 0 ? "gain" : "loss"}>
                      {r.variation > 0 ? "OW " : "UW "}{r.variation > 0 ? "+" : ""}{r.variation.toFixed(1)} pts
                    </Pill>
                  ) : (
                    <span className="text-xs text-slate-500">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
