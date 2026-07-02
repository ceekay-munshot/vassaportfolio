import { chart } from "@/theme/tokens";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  AlertTriangle,
  Newspaper,
  Sparkles,
  Activity,
  Briefcase,
} from "lucide-react";
import {
  Area,
  AreaChart,
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
import { activeHoldings, usePortfolio } from "@/context/PortfolioContext";
import { fmtPct, changeColor, relativeTime } from "@/lib/format";
import { bucketBy, vehicleOf } from "@/lib/portfolioAnalytics";
import { buildBenchmarkSeries } from "@/data/mockBenchmark";
import { MOCK_NEWS } from "@/data/mockNews";
import { chartTooltipStyle, chartTooltipLabelStyle, chartTooltipItemStyle } from "@/lib/chartTheme";
import { MOCK_RECOMMENDATIONS } from "@/data/mockRecommendations";

export function MorningCIO() {
  const { portfolio, fmtFromBase } = usePortfolio();
  if (!portfolio) return null;

  const holdings = activeHoldings(portfolio);
  const byVehicle = bucketBy(holdings, vehicleOf);
  const totalValue = portfolio.totalValue;
  // Sum in base currency so mixed-currency portfolios produce a coherent
  // P&L and cost basis. Fall back to native fields if older holdings
  // (persisted before the FX layer) lack the Base field.
  const totalCost = holdings.reduce((s, h) => s + (h.costBasisBase ?? h.costBasis), 0);
  const totalPnL = holdings.reduce((s, h) => s + (h.unrealizedPnLBase ?? h.unrealizedPnL), 0);
  const totalReturnPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  // Illustrative benchmark series — labeled clearly as demo data
  // until a real performance feed is wired up.
  const series = buildBenchmarkSeries();
  const portRet = series[series.length - 1].portfolio - 100;
  const benchRet = series[series.length - 1].benchmark - 100;
  const alphaBps = (portRet - benchRet) * 100;

  const tickerSet = new Set(holdings.map((h) => h.ticker));
  const relevantNews = MOCK_NEWS.filter((n) => n.tickers.some((t) => tickerSet.has(t)));

  // Top movers: by % return since purchase (we don't have day-change data
  // from the upload — return-since-purchase is the most useful proxy).
  const movers = [...holdings]
    .sort((a, b) => Math.abs(b.returnPct) - Math.abs(a.returnPct))
    .slice(0, 5);

  const exited = portfolio.holdings.filter((h) => h.status === "Exited").length;
  const watchlist = portfolio.holdings.filter((h) => h.status === "Watchlist").length;

  return (
    <div>
      <PageHeader
        eyebrow="Daily Briefing"
        title="Good morning — here's where things stand"
        subtitle={`Snapshot generated ${new Date().toLocaleString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}`}
        right={<Pill tone="info">Source: {portfolio.fileName}</Pill>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Portfolio NAV"
          value={fmtFromBase(totalValue, { compact: true })}
          sub={`${holdings.length} active holdings`}
          icon={<Briefcase className="h-4 w-4" />}
        />
        <StatTile
          label="Unrealized P&L"
          value={fmtFromBase(totalPnL, { compact: true, sign: true })}
          delta={totalReturnPct}
          sub={`Cost basis ${fmtFromBase(totalCost, { compact: true })}`}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatTile
          label="Watchlist / Exited"
          value={`${watchlist} / ${exited}`}
          sub={`${portfolio.holdings.length} total rows`}
        />
        <StatTile
          label="Alpha vs Benchmark (1Y)"
          value={`${alphaBps >= 0 ? "+" : ""}${alphaBps.toFixed(0)} bps`}
          sub="Illustrative — performance feed pending"
          delta={portRet - benchRet}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Portfolio vs Benchmark"
          subtitle="Indexed to 100 · trailing 12 months · illustrative until live price feed"
          right={<Pill tone="gain">+{(portRet - benchRet).toFixed(1)} pts excess</Pill>}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="port" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chart.primary} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={chart.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bench" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chart.benchmark} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={chart.benchmark} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chart.grid} strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="date" stroke={chart.axis} fontSize={11} tickFormatter={(d) => d.slice(5)} />
                <YAxis stroke={chart.axis} fontSize={11} domain={["dataMin - 2", "dataMax + 2"]} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                />
                <Area type="monotone" dataKey="benchmark" stroke={chart.axis} strokeWidth={1.5} fill="url(#bench)" name="Benchmark" />
                <Area type="monotone" dataKey="portfolio" stroke={chart.primary} strokeWidth={2} fill="url(#port)" name="Portfolio" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Top movers (since cost)">
          <ul className="divide-y divide-slate-800">
            {movers.map((h) => (
              <li key={h.ticker} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="mono text-[13px] font-semibold text-slate-100">{h.ticker}</span>
                    <Pill tone={h.coreSatellite === "Core" ? "core" : "satellite"}>{h.coreSatellite}</Pill>
                  </div>
                  <div className="truncate text-[11px] text-slate-500">{h.companyName}</div>
                </div>
                <div className="text-right">
                  <div className={`mono text-[13px] ${changeColor(h.returnPct)}`}>
                    {fmtPct(h.returnPct, { sign: true })}
                  </div>
                  <div className={`mono text-[11px] ${changeColor(h.unrealizedPnL)}`}>
                    {fmtFromBase(h.unrealizedPnLBase ?? h.unrealizedPnL, { compact: true, sign: true })}
                  </div>
                </div>
              </li>
            ))}
            {movers.length === 0 && (
              <li className="py-8 text-center text-xs text-slate-500">No active holdings yet.</li>
            )}
          </ul>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="What matters to your portfolio today"
          subtitle="News filtered to your holdings only"
          right={
            <Link to="/intelligence" className="text-xs text-gold-400 hover:underline">
              Open intelligence →
            </Link>
          }
        >
          <ul className="space-y-3">
            {relevantNews.slice(0, 4).map((n) => {
              const href =
                n.sourceUrl ??
                `https://news.google.com/search?q=${encodeURIComponent(`${n.source} ${n.title}`)}`;
              return (
                <li key={n.id}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-3 rounded-lg border border-slate-800 bg-ink-700/40 p-3 transition-colors hover:border-gold-400/40 hover:bg-ink-700/60"
                  >
                    <div
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                        n.impact === "positive"
                          ? "bg-emerald-400"
                          : n.impact === "negative"
                            ? "bg-rose-400"
                            : "bg-slate-500"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Newspaper className="h-3.5 w-3.5 text-slate-500" />
                        <span className="text-[11px] uppercase tracking-wider text-slate-500">
                          {n.source} · {relativeTime(n.date)}
                        </span>
                        <Pill tone={n.importance === "high" ? "warn" : "default"} className="ml-auto">
                          {n.importance}
                        </Pill>
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-100">{n.title}</div>
                      <p className="mt-1 text-xs text-slate-400">{n.summary}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {n.tickers.filter((t) => tickerSet.has(t)).map((t) => (
                          <Pill key={t}>{t}</Pill>
                        ))}
                      </div>
                    </div>
                  </a>
                </li>
              );
            })}
            {relevantNews.length === 0 && (
              <li className="py-6 text-center text-xs text-slate-500">
                No news items match your current holdings.
              </li>
            )}
          </ul>
        </Card>

        <Card
          title="Suggested actions"
          right={
            <Link to="/recommendations" className="text-xs text-gold-400 hover:underline">
              View all →
            </Link>
          }
        >
          <ul className="space-y-3">
            {MOCK_RECOMMENDATIONS.filter((r) =>
              r.affectedTickers.length === 0 || r.affectedTickers.some((t) => tickerSet.has(t)),
            )
              .slice(0, 3)
              .map((r) => (
                <li key={r.id} className="rounded-lg border border-slate-800 bg-ink-700/40 p-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-gold-400" />
                    <Pill tone={r.priority === "high" ? "loss" : r.priority === "medium" ? "warn" : "info"}>
                      {r.type}
                    </Pill>
                    <span className="ml-auto text-[11px] text-slate-500">conf {r.confidence}</span>
                  </div>
                  <div className="mt-1.5 text-sm font-medium text-slate-100">{r.title}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {r.affectedTickers.slice(0, 4).map((t) => (
                      <Pill key={t}>{t}</Pill>
                    ))}
                  </div>
                </li>
              ))}
          </ul>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Consolidated by vehicle"
          subtitle={`Direct equity, mutual funds, PMS, AIFs & private — ${byVehicle.filter((b) => ["Mutual Fund", "PMS", "AIF"].includes(b.key)).reduce((s, b) => s + b.count, 0)} positions via managers`}
          right={<Link to="/look-through" className="text-xs text-gold-400 hover:underline">Look-through →</Link>}
        >
          <ul className="space-y-2">
            {byVehicle.map((b) => (
              <li key={b.key} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-sm text-slate-300">{b.key}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full bg-gold-500/70" style={{ width: `${Math.max(2, b.weight * 100)}%` }} />
                </div>
                <span className="w-20 shrink-0 text-right mono text-sm text-slate-100">{fmtFromBase(b.mv, { compact: true })}</span>
                <span className="w-12 shrink-0 text-right mono text-[11px] text-slate-500">{(b.weight * 100).toFixed(0)}%</span>
                <span className={`w-14 shrink-0 text-right mono text-[11px] ${changeColor(b.returnPct)}`}>{fmtPct(b.returnPct, { sign: true })}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Jump to">
          <ul className="space-y-2 text-sm">
            {[
              { to: "/ask", label: "Ask Munshot — chat with your book" },
              { to: "/look-through", label: "Look-Through & Overlap" },
              { to: "/family", label: "Family & Entities" },
              { to: "/funds", label: "Fund & Scheme Analytics" },
              { to: "/liquidity", label: "Liquidity & Capital Calls" },
              { to: "/corporate-actions", label: "Corporate Actions" },
            ].map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="flex items-center gap-2 rounded-md border border-slate-800 bg-ink-700/40 px-3 py-2 text-slate-300 transition-colors hover:border-gold-400/40 hover:text-slate-100 active:scale-[0.99]">
                  <ArrowUpRight className="h-3.5 w-3.5 text-gold-400" />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card title="At a glance">
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span className="text-slate-400">Active holdings</span>
              <span className="mono text-slate-100">{holdings.length}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-slate-400">Sectors covered</span>
              <span className="mono text-slate-100">
                {new Set(holdings.map((h) => h.sector)).size}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-slate-400">Geographies</span>
              <span className="mono text-slate-100">
                {Array.from(new Set(holdings.map((h) => h.geography))).join(" · ") || "—"}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-slate-400">Active recommendations</span>
              <span className="mono text-slate-100">{MOCK_RECOMMENDATIONS.length}</span>
            </li>
          </ul>
        </Card>

        <Card title="Risk watch">
          <ul className="space-y-2.5 text-xs">
            {(() => {
              const items: { text: string }[] = [];
              const concentrated = holdings.filter((h) => h.portfolioWeight > 0.1);
              concentrated.forEach((h) =>
                items.push({ text: `${h.ticker} concentration is ${(h.portfolioWeight * 100).toFixed(1)}% of NAV.` }),
              );
              const unclassified = holdings.filter((h) => h.sector === "Unclassified");
              if (unclassified.length > 0) {
                items.push({ text: `${unclassified.length} holding(s) have no sector tag — analytics partial.` });
              }
              if (items.length === 0) {
                items.push({ text: "No concentration alerts. Diversification looks healthy." });
              }
              return items.slice(0, 4).map((i, idx) => (
                <li key={idx} className="flex items-start gap-2 text-slate-300">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-amber-400" />
                  {i.text}
                </li>
              ));
            })()}
          </ul>
        </Card>

        <Card title="Open this week">
          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <ArrowUpRight className="h-3.5 w-3.5 text-gold-400" />
              IC review meeting — Friday 10:30
            </li>
            <li className="flex items-center gap-2">
              <ArrowUpRight className="h-3.5 w-3.5 text-gold-400" />
              Review high-concentration positions
            </li>
            <li className="flex items-center gap-2">
              <ArrowUpRight className="h-3.5 w-3.5 text-gold-400" />
              Sector tagging for unclassified holdings
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
