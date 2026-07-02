import { chart } from "@/theme/tokens";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { StatTile } from "@/components/StatTile";
import { Pill } from "@/components/Pill";
import { buildBenchmarkSeries, buildDrawdownSeries } from "@/data/mockBenchmark";
import { fmtPct } from "@/lib/format";
import { usePortfolio } from "@/context/PortfolioContext";
import { chartTooltipStyle, chartTooltipItemStyle } from "@/lib/chartTheme";

// This view currently runs on illustrative time-series data — once a live
// pricing feed is wired in, the metric block, drawdown chart, and rolling
// returns will switch to real values without any UI change.

export function RiskPerformance() {
  const { portfolio } = usePortfolio();
  if (!portfolio) return null;

  const series = buildBenchmarkSeries();
  const ddSeries = buildDrawdownSeries();
  const portRet = series[series.length - 1].portfolio - 100;
  const benchRet = series[series.length - 1].benchmark - 100;
  const maxDD = Math.min(...ddSeries.map((d) => d.drawdown));

  const periods = [
    { period: "1M", port: 2.1, bench: 1.4 },
    { period: "3M", port: 6.3, bench: 4.8 },
    { period: "6M", port: 11.8, bench: 9.1 },
    { period: "YTD", port: 14.6, bench: 11.6 },
    { period: "1Y", port: portRet, bench: benchRet },
    { period: "3Y CAGR", port: 12.4, bench: 9.8 },
    { period: "5Y CAGR", port: 10.8, bench: 9.2 },
    { period: "Since Inception", port: 142.6, bench: 96.2 },
  ];

  const metrics = [
    { k: "Sharpe", v: "1.34", bench: "0.98" },
    { k: "Sortino", v: "1.92", bench: "1.34" },
    { k: "Volatility (ann.)", v: "14.6%", bench: "16.2%" },
    { k: "Beta", v: "0.92", bench: "1.00" },
    { k: "Alpha (ann.)", v: "+3.8%", bench: "—" },
    { k: "Tracking error", v: "5.4%", bench: "—" },
    { k: "Up capture", v: "106%", bench: "100%" },
    { k: "Down capture", v: "81%", bench: "100%" },
  ];

  const rollingPeriods = [
    { period: "Jul", up: 2.4, down: 0 },
    { period: "Aug", up: 0, down: -1.2 },
    { period: "Sep", up: 3.1, down: 0 },
    { period: "Oct", up: 0, down: -2.6 },
    { period: "Nov", up: 4.8, down: 0 },
    { period: "Dec", up: 2.1, down: 0 },
    { period: "Jan", up: 0, down: -3.2 },
    { period: "Feb", up: 1.7, down: 0 },
    { period: "Mar", up: 3.4, down: 0 },
    { period: "Apr", up: 2.2, down: 0 },
    { period: "May", up: 4.1, down: 0 },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Analytics"
        title="Risk & Performance"
        subtitle="Quant signature of the book. Time-series shown is illustrative until a price feed is connected."
        right={<Pill tone="info">Benchmark: NIFTY 500</Pill>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="YTD Return" value={fmtPct(14.6, { sign: true })} sub={`Bench ${fmtPct(11.6, { sign: true })}`} delta={14.6} />
        <StatTile label="Max Drawdown" value={fmtPct(maxDD, { decimals: 2 })} sub="Trailing 12M" delta={maxDD} />
        <StatTile label="Sharpe Ratio" value="1.34" sub="vs benchmark 0.98" />
        <StatTile label="Volatility (ann.)" value="14.6%" sub="vs benchmark 16.2%" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Cumulative performance" subtitle="Indexed to 100">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="rp-port" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chart.primary} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={chart.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chart.grid} strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="date" stroke={chart.axis} fontSize={11} tickFormatter={(d) => d.slice(5)} />
                <YAxis stroke={chart.axis} fontSize={11} domain={["dataMin - 2", "dataMax + 2"]} />
                <Tooltip contentStyle={chartTooltipStyle} itemStyle={chartTooltipItemStyle} />
                <Area type="monotone" dataKey="benchmark" stroke={chart.axis} strokeWidth={1.5} fill="transparent" />
                <Area type="monotone" dataKey="portfolio" stroke={chart.primary} strokeWidth={2} fill="url(#rp-port)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Drawdown" subtitle="Peak-to-trough underwater">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ddSeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="dd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chart.loss} stopOpacity={0} />
                    <stop offset="100%" stopColor={chart.loss} stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chart.grid} strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="date" stroke={chart.axis} fontSize={11} tickFormatter={(d) => d.slice(5)} />
                <YAxis stroke={chart.axis} fontSize={11} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <Tooltip
                  formatter={(v: number) => `${v.toFixed(2)}%`}
                  contentStyle={chartTooltipStyle} itemStyle={chartTooltipItemStyle}
                />
                <Area type="monotone" dataKey="drawdown" stroke={chart.loss} strokeWidth={1.5} fill="url(#dd)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Returns by period" pad={false}>
          <table className="min-w-full">
            <thead className="border-b border-slate-800">
              <tr>
                <th className="label-xs px-4 py-2 text-left font-medium">Period</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Portfolio</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Benchmark</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {periods.map((r) => {
                const active = r.port - r.bench;
                return (
                  <tr key={r.period} className="hover:bg-slate-800/30">
                    <td className="px-4 py-2 text-slate-300">{r.period}</td>
                    <td className="px-4 py-2 text-right mono text-slate-100">{fmtPct(r.port, { sign: true })}</td>
                    <td className="px-4 py-2 text-right mono text-slate-400">{fmtPct(r.bench, { sign: true })}</td>
                    <td className={`px-4 py-2 text-right mono ${active >= 0 ? "text-gain" : "text-loss"}`}>
                      {fmtPct(active, { sign: true })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card title="Risk-adjusted metrics" pad={false}>
          <table className="min-w-full">
            <thead className="border-b border-slate-800">
              <tr>
                <th className="label-xs px-4 py-2 text-left font-medium">Metric</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Portfolio</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Benchmark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {metrics.map((m) => (
                <tr key={m.k} className="hover:bg-slate-800/30">
                  <td className="px-4 py-2 text-slate-300">{m.k}</td>
                  <td className="px-4 py-2 text-right mono text-slate-100">{m.v}</td>
                  <td className="px-4 py-2 text-right mono text-slate-400">{m.bench}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card className="mt-5" title="Monthly returns" subtitle="Trailing 11 months">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rollingPeriods} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={chart.grid} strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="period" stroke={chart.axis} fontSize={11} />
              <YAxis stroke={chart.axis} fontSize={11} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={chartTooltipStyle} itemStyle={chartTooltipItemStyle}
                formatter={(v: number) => `${v.toFixed(2)}%`}
              />
              <Bar dataKey="up" fill={chart.gain} stackId="stack" radius={[3, 3, 0, 0]} />
              <Bar dataKey="down" fill={chart.loss} stackId="stack" radius={[0, 0, 3, 3]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
