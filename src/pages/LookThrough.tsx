import { chart } from "@/theme/tokens";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Layers, Search, GitMerge, Building2, Briefcase } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { StatTile } from "@/components/StatTile";
import { usePortfolio } from "@/context/PortfolioContext";
import {
  activeOf,
  mvBase,
  vehicleOf,
  managerOf,
  isManagerVehicle,
} from "@/lib/portfolioAnalytics";
import { FUND_LOOKTHROUGH, hasLookthrough } from "@/data/mockFundLookthrough";
import { chartTooltipStyle, chartTooltipLabelStyle, chartTooltipItemStyle } from "@/lib/chartTheme";

type ExposureRow = {
  ticker: string;
  companyName: string;
  direct: number;
  viaFunds: number;
  total: number;
  managers: { manager: string; amount: number }[];
};

export function LookThrough() {
  const { portfolio, fmtFromBase } = usePortfolio();
  const [q, setQ] = useState("");
  if (!portfolio) return null;

  const rows = useMemo<ExposureRow[]>(() => {
    const map = new Map<string, ExposureRow>();
    const touch = (ticker: string, companyName: string) => {
      let r = map.get(ticker);
      if (!r) {
        r = { ticker, companyName, direct: 0, viaFunds: 0, total: 0, managers: [] };
        map.set(ticker, r);
      }
      return r;
    };

    for (const h of activeOf(portfolio)) {
      const v = vehicleOf(h);
      // Direct single-stock exposure: directly-held listed equity + unlisted/private.
      const isSingleName = (v === "Direct Equity" && h.assetClass === "Equity") || v === "Private";
      if (isSingleName) {
        const r = touch(h.ticker, h.companyName);
        r.direct += mvBase(h);
      }
      // Look-through exposure inside managed vehicles.
      if (isManagerVehicle(h) && hasLookthrough(managerOf(h))) {
        const mgr = managerOf(h);
        for (const line of FUND_LOOKTHROUGH[mgr]) {
          const amt = mvBase(h) * line.weight;
          const r = touch(line.ticker, line.companyName);
          r.viaFunds += amt;
          const existing = r.managers.find((m) => m.manager === mgr);
          if (existing) existing.amount += amt;
          else r.managers.push({ manager: mgr, amount: amt });
        }
      }
    }
    const out = [...map.values()];
    out.forEach((r) => {
      r.total = r.direct + r.viaFunds;
      r.managers.sort((a, b) => b.amount - a.amount);
    });
    return out.sort((a, b) => b.total - a.total);
  }, [portfolio]);

  const overlaps = useMemo(() => rows.filter((r) => r.direct > 0 && r.viaFunds > 0), [rows]);
  const viaTotal = rows.reduce((s, r) => s + r.viaFunds, 0);
  const largest = rows[0];

  const filtered = q
    ? rows.filter((r) => `${r.ticker} ${r.companyName}`.toLowerCase().includes(q.toLowerCase()))
    : rows;

  const top10 = rows.slice(0, 10).map((r) => ({
    ticker: r.ticker,
    Direct: Math.round(r.direct),
    "Via funds": Math.round(r.viaFunds),
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Consolidated"
        title="Look-Through & Overlap"
        subtitle="Your true single-stock exposure — direct holdings plus what you own inside every mutual fund, PMS and AIF. Overlap is flagged so the same name isn't a hidden over-weight."
        right={<Pill tone="info">As of 30 Jun 2026</Pill>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Look-through positions"
          value={rows.length}
          sub="distinct names across all vehicles"
          icon={<Layers className="h-4 w-4" />}
        />
        <StatTile
          label="Overlaps detected"
          value={overlaps.length}
          sub="held directly & via managers"
          icon={<GitMerge className="h-4 w-4" />}
        />
        <StatTile
          label="Largest single-stock exposure"
          value={largest ? largest.ticker : "—"}
          sub={
            largest
              ? `${fmtFromBase(largest.total, { compact: true })} · ${((largest.total / portfolio.totalValue) * 100).toFixed(1)}% of NAV`
              : "—"
          }
          icon={<Building2 className="h-4 w-4" />}
        />
        <StatTile
          label="Routed via managers"
          value={fmtFromBase(viaTotal, { compact: true })}
          sub="look-through equity inside funds"
          icon={<Briefcase className="h-4 w-4" />}
        />
      </div>

      {overlaps.length > 0 && (
        <Card
          className="mt-5"
          title="Overlap watch"
          subtitle="Names you hold directly and again inside managed schemes — watch these for creeping concentration"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {overlaps.slice(0, 6).map((r) => {
              const directPct = r.total > 0 ? (r.direct / r.total) * 100 : 0;
              return (
                <div
                  key={r.ticker}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 transition-colors hover:border-amber-500/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="mono text-sm font-semibold text-slate-100">{r.ticker}</span>
                    <Pill tone="warn">Overlap</Pill>
                  </div>
                  <div className="truncate text-[11px] text-slate-500">{r.companyName}</div>
                  <div className="mt-2 text-sm font-semibold tabular text-slate-100">
                    {fmtFromBase(r.total, { compact: true })}
                    <span className="ml-1.5 text-[11px] font-normal text-slate-500">
                      {((r.total / portfolio.totalValue) * 100).toFixed(1)}% NAV
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full bg-gold-500/70" style={{ width: `${directPct}%` }} />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
                    <span>Direct {fmtFromBase(r.direct, { compact: true })}</span>
                    <span>via {r.managers.length} {r.managers.length === 1 ? "scheme" : "schemes"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card
        className="mt-5"
        title="Top consolidated exposures"
        subtitle="Direct vs. look-through, ranked by total rupee exposure"
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top10} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={chart.grid} strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="ticker" stroke={chart.axis} fontSize={10} interval={0} angle={-25} textAnchor="end" height={50} />
              <YAxis stroke={chart.axis} fontSize={11} tickFormatter={(v: number) => fmtFromBase(v, { compact: true })} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                labelStyle={chartTooltipLabelStyle}
                itemStyle={chartTooltipItemStyle}
                formatter={(v: number) => fmtFromBase(v, { compact: true })}
              />
              <Bar dataKey="Direct" stackId="x" fill={chart.primary} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Via funds" stackId="x" fill={chart.categorical[1]} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="mt-5" pad={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
          <div>
            <div className="h-section">Consolidated single-stock exposure</div>
            <div className="mt-1 text-xs text-slate-400">Every name, with its direct and look-through split</div>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search a stock — e.g. Reliance, HDFC Bank…"
              className="w-64 rounded-md border border-slate-700 bg-ink-700 py-1.5 pl-9 pr-3 text-xs text-slate-200 ring-focus"
            />
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-slate-800">
              <tr>
                <th className="label-xs px-4 py-2 text-left font-medium">Ticker</th>
                <th className="label-xs px-4 py-2 text-left font-medium">Company</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Direct</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Via Funds</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Total</th>
                <th className="label-xs px-4 py-2 text-right font-medium">% NAV</th>
                <th className="label-xs px-4 py-2 text-left font-medium">Source(s)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {filtered.map((r) => {
                const overlap = r.direct > 0 && r.viaFunds > 0;
                return (
                  <tr key={r.ticker} className="hover:bg-slate-800/30">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="mono font-semibold text-slate-100">{r.ticker}</span>
                        {overlap && <Pill tone="warn">Overlap</Pill>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">
                      <div className="max-w-[220px] truncate">{r.companyName}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right mono text-slate-300">
                      {r.direct > 0 ? fmtFromBase(r.direct, { compact: true }) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right mono text-slate-300">
                      {r.viaFunds > 0 ? fmtFromBase(r.viaFunds, { compact: true }) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right mono text-slate-100">
                      {fmtFromBase(r.total, { compact: true })}
                    </td>
                    <td className="px-4 py-2.5 text-right mono text-slate-200">
                      {((r.total / portfolio.totalValue) * 100).toFixed(2)}%
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {r.direct > 0 && <Pill>Direct</Pill>}
                        {r.managers.slice(0, 3).map((m) => (
                          <Pill key={m.manager} tone="info">{m.manager}</Pill>
                        ))}
                        {r.managers.length > 3 && (
                          <span className="text-[11px] text-slate-500">+{r.managers.length - 3}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-xs text-slate-500">
                    No name matches “{q}”. Try a different stock.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
