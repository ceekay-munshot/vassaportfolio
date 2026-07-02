import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, TrendingUp, TrendingDown, ChevronRight, Filter } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { usePortfolio } from "@/context/PortfolioContext";
import { fmtDate, relativeTime } from "@/lib/format";
import { MOCK_BROKER_REPORTS } from "@/data/mockBrokerReports";

export function BrokerResearch() {
  const { portfolio } = usePortfolio();
  const [onlyMine, setOnlyMine] = useState(true);
  const [recFilter, setRecFilter] = useState<string>("All");

  if (!portfolio) return null;
  const myTickers = new Set(portfolio.holdings.map((h) => h.ticker));

  const reports = useMemo(() => {
    return MOCK_BROKER_REPORTS.filter((r) => {
      if (onlyMine && !r.tickers.some((t) => myTickers.has(t))) return false;
      if (recFilter !== "All" && r.recommendation !== recFilter) return false;
      return true;
    });
  }, [onlyMine, recFilter, myTickers]);

  const correlation = (r: typeof MOCK_BROKER_REPORTS[number]) =>
    r.tickers.filter((t) => myTickers.has(t));

  return (
    <div>
      <PageHeader
        eyebrow="Intelligence"
        title="Broker Research Correlation"
        subtitle="Street research filtered against your holdings. Track upgrades, target moves, and what each note implies for your book."
        right={
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={onlyMine}
                onChange={(e) => setOnlyMine(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-700 bg-ink-700 text-gold-500 ring-focus"
              />
              Only my holdings
            </label>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5" />
              <select
                value={recFilter}
                onChange={(e) => setRecFilter(e.target.value)}
                className="rounded-md border border-slate-700 bg-ink-700 px-2 py-1 text-xs text-slate-200 ring-focus"
              >
                <option>All</option>
                <option>BUY</option>
                <option>OVERWEIGHT</option>
                <option>HOLD</option>
                <option>UNDERWEIGHT</option>
                <option>SELL</option>
              </select>
            </div>
          </div>
        }
      />

      <div className="space-y-4">
        {reports.map((r) => {
          const heldTickers = correlation(r);
          const ptDelta = r.priceTargetChange
            ? ((r.priceTargetChange.to - r.priceTargetChange.from) / r.priceTargetChange.from) * 100
            : null;
          const isPositive = ["BUY", "OVERWEIGHT"].includes(r.recommendation);
          const isNegative = ["SELL", "UNDERWEIGHT"].includes(r.recommendation);
          return (
            <Card key={r.id} pad>
              <div className="flex flex-wrap items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-slate-700 bg-ink-700 text-slate-400">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500">
                    <span className="text-slate-300">{r.broker}</span>
                    <span>·</span>
                    <span>{fmtDate(r.date)}</span>
                    <span>·</span>
                    <span>{relativeTime(r.date)}</span>
                    {r.sector && (
                      <>
                        <span>·</span>
                        <span>{r.sector}</span>
                      </>
                    )}
                    <Pill tone={isPositive ? "gain" : isNegative ? "loss" : "default"} className="ml-2">
                      {r.recommendation}
                    </Pill>
                    {heldTickers.length > 0 && <Pill tone="warn">Impacts {heldTickers.length} of your holdings</Pill>}
                  </div>
                  <div className="mt-1 text-base font-semibold text-slate-100">{r.title}</div>
                  <p className="mt-1.5 text-sm text-slate-300">{r.summary}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                    {r.ratingChange && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="label-xs">Rating</span>
                        <span className="mono text-slate-300">{r.ratingChange.from}</span>
                        <ChevronRight className="h-3 w-3" />
                        <span className="mono text-slate-100">{r.ratingChange.to}</span>
                      </div>
                    )}
                    {r.priceTargetChange && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="label-xs">Price Target</span>
                        <span className="mono text-slate-300">
                          {r.priceTargetChange.currency === "INR" ? "₹" : "$"}
                          {r.priceTargetChange.from.toLocaleString()}
                        </span>
                        <ChevronRight className="h-3 w-3" />
                        <span className="mono text-slate-100">
                          {r.priceTargetChange.currency === "INR" ? "₹" : "$"}
                          {r.priceTargetChange.to.toLocaleString()}
                        </span>
                        {ptDelta !== null && (
                          <span className={`mono ${ptDelta >= 0 ? "text-gain" : "text-loss"}`}>
                            {ptDelta >= 0 ? <TrendingUp className="inline h-3 w-3" /> : <TrendingDown className="inline h-3 w-3" />}{" "}
                            {ptDelta >= 0 ? "+" : ""}
                            {ptDelta.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <div>
                      <div className="label-xs mb-1.5">Key takeaways</div>
                      <ul className="space-y-1 text-xs text-slate-300">
                        {r.keyTakeaways.map((t, i) => (
                          <li key={i} className="flex gap-1.5">
                            <span className="text-slate-500">·</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="label-xs mb-1.5">What this means for you</div>
                      <div className="rounded-md border border-gold-500/20 bg-gold-500/5 p-3 text-xs text-slate-200">
                        {heldTickers.length === 0 ? (
                          <>No direct exposure. Tracked for context.</>
                        ) : (
                          <>
                            You hold <span className="mono text-gold-400">{heldTickers.join(", ")}</span>.{" "}
                            {isPositive
                              ? "Thesis supportive — review whether to add at current levels."
                              : isNegative
                                ? "Thesis cautious — see Recommendations for sizing implications."
                                : "Neutral implication — maintain current positioning."}{" "}
                            <Link to="/recommendations" className="font-medium text-gold-400 hover:underline">
                              View linked actions →
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {r.tickers.map((t) => (
                      <Pill key={t} tone={myTickers.has(t) ? "warn" : "default"}>
                        {t}
                      </Pill>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}

        {reports.length === 0 && (
          <Card pad>
            <div className="py-8 text-center text-sm text-slate-400">
              No broker reports match the current filter. Try toggling "Only my holdings" off.
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
