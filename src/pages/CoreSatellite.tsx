import { chart } from "@/theme/tokens";
import { useMemo } from "react";
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
import { holdingsByCoreSatellite, usePortfolio } from "@/context/PortfolioContext";
import { changeColor, fmtPct } from "@/lib/format";
import { chartTooltipStyle, chartTooltipItemStyle } from "@/lib/chartTheme";

// Default IC target if the upload doesn't specify one.
const DEFAULT_CORE_TARGET = 0.7;
const DEFAULT_SATELLITE_TARGET = 0.3;

export function CoreSatellite() {
  const { portfolio, fmtFromBase } = usePortfolio();
  if (!portfolio) return null;

  const cs = holdingsByCoreSatellite(portfolio);
  const mvOf = (h: { marketValueBase?: number; marketValue: number }) =>
    h.marketValueBase ?? h.marketValue;
  const equityTotal = cs.Core.reduce((s, h) => s + mvOf(h), 0) + cs.Satellite.reduce((s, h) => s + mvOf(h), 0);

  const coreMV = cs.Core.reduce((s, h) => s + mvOf(h), 0);
  const satMV = cs.Satellite.reduce((s, h) => s + mvOf(h), 0);
  const coreActual = equityTotal > 0 ? coreMV / equityTotal : 0;
  const satActual = equityTotal > 0 ? satMV / equityTotal : 0;
  const coreDrift = (coreActual - DEFAULT_CORE_TARGET) * 100;
  const satDrift = (satActual - DEFAULT_SATELLITE_TARGET) * 100;

  const donutData = useMemo(
    () => [
      { name: "Core", value: coreMV, color: chart.benchmark },
      { name: "Satellite", value: satMV, color: chart.primary },
    ],
    [coreMV, satMV],
  );

  const sleeveBars = [
    { name: "Core", Actual: coreActual * 100, Target: DEFAULT_CORE_TARGET * 100 },
    { name: "Satellite", Actual: satActual * 100, Target: DEFAULT_SATELLITE_TARGET * 100 },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Allocation"
        title="Core vs Satellite"
        subtitle="Your stability anchor vs. the conviction sleeve. Drift tracked against an IC target of 70 / 30."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Sleeve mix">
          <div className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} dataKey="value" innerRadius={60} outerRadius={88} paddingAngle={2} stroke="none">
                  {donutData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => fmtFromBase(v, { compact: true })}
                  contentStyle={chartTooltipStyle} itemStyle={chartTooltipItemStyle}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="label-xs">Active NAV</div>
              <div className="mt-1 text-lg font-semibold tabular text-slate-100">
                {fmtFromBase(equityTotal, { compact: true })}
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <SleeveRow label="Core" actual={coreActual} target={DEFAULT_CORE_TARGET} drift={coreDrift} color={chart.benchmark} />
            <SleeveRow label="Satellite" actual={satActual} target={DEFAULT_SATELLITE_TARGET} drift={satDrift} color={chart.primary} />
          </div>
        </Card>

        <Card
          className="lg:col-span-2"
          title="Drift vs target"
          subtitle="Each sleeve charted against the default 70/30 IC target"
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sleeveBars} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={chart.grid} strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="name" stroke={chart.axis} fontSize={11} />
                <YAxis stroke={chart.axis} fontSize={11} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={chartTooltipStyle} itemStyle={chartTooltipItemStyle}
                  formatter={(v: number) => `${v.toFixed(1)}%`}
                />
                <Bar dataKey="Target" fill={chart.benchmarkBar} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Actual" fill={chart.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {Math.abs(coreDrift) > 3 && (
              <Pill tone="warn">
                Core drift {coreDrift > 0 ? "+" : ""}{coreDrift.toFixed(1)} pts —{" "}
                {coreDrift > 0 ? "trim satellite winners" : "redeploy from satellite"}
              </Pill>
            )}
            {Math.abs(satDrift) > 3 && (
              <Pill tone="warn">
                Satellite drift {satDrift > 0 ? "+" : ""}{satDrift.toFixed(1)} pts
              </Pill>
            )}
            {Math.abs(coreDrift) <= 3 && Math.abs(satDrift) <= 3 && (
              <Pill tone="gain">Within ±3 pts of target — no action required</Pill>
            )}
            {cs.Satellite.length === 0 && (
              <Pill>
                No satellite holdings tagged. Add a `coreSatellite` column to your upload to split the book.
              </Pill>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {(["Core", "Satellite"] as const).map((sleeve) => {
          const holdings = cs[sleeve].sort((a, b) => mvOf(b) - mvOf(a));
          const sleeveMV = holdings.reduce((s, h) => s + mvOf(h), 0);
          return (
            <Card key={sleeve} title={`${sleeve} sleeve`} subtitle={`${holdings.length} positions · ${fmtFromBase(sleeveMV, { compact: true })}`} pad={false}>
              {holdings.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-slate-500">
                  No holdings classified as {sleeve}.
                </div>
              ) : (
                <table className="min-w-full">
                  <thead className="border-b border-slate-800">
                    <tr>
                      <th className="label-xs px-4 py-2 text-left font-medium">Ticker</th>
                      <th className="label-xs px-4 py-2 text-left font-medium">Company</th>
                      <th className="label-xs px-4 py-2 text-right font-medium">Mkt Value</th>
                      <th className="label-xs px-4 py-2 text-right font-medium">Sleeve %</th>
                      <th className="label-xs px-4 py-2 text-right font-medium">Return</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-sm">
                    {holdings.map((h) => {
                      const mv = mvOf(h);
                      return (
                        <tr key={h.ticker} className="hover:bg-slate-800/30">
                          <td className="px-4 py-2 mono font-semibold text-slate-100">{h.ticker}</td>
                          <td className="px-4 py-2 text-slate-400 truncate max-w-[200px]">{h.companyName}</td>
                          <td className="px-4 py-2 text-right mono text-slate-200">
                            {fmtFromBase(mv, { compact: true })}
                          </td>
                          <td className="px-4 py-2 text-right mono text-slate-300">
                            {sleeveMV > 0 ? ((mv / sleeveMV) * 100).toFixed(1) : "0"}%
                          </td>
                          <td className={`px-4 py-2 text-right mono ${changeColor(h.returnPct)}`}>
                            {fmtPct(h.returnPct, { sign: true })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SleeveRow({
  label,
  actual,
  target,
  drift,
  color,
}: {
  label: string;
  actual: number;
  target: number;
  drift: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-ink-700/40 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
        <span className="text-sm font-medium text-slate-200">{label}</span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="mono text-slate-300">{(actual * 100).toFixed(1)}%</span>
        <span className="text-slate-500">vs {(target * 100).toFixed(0)}% target</span>
        <span className={`mono ${changeColor(drift)}`}>{fmtPct(drift, { sign: true, decimals: 1 })}</span>
      </div>
    </div>
  );
}
