import { useMemo, useState } from "react";
import { Sparkles, ChevronRight, ShieldCheck, Check, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { usePortfolio } from "@/context/PortfolioContext";
import { fmtDate, relativeTime } from "@/lib/format";
import { MOCK_RECOMMENDATIONS } from "@/data/mockRecommendations";
import { MOCK_SOURCES } from "@/data/mockSources";

export function Recommendations() {
  const { portfolio } = usePortfolio();
  const [filter, setFilter] = useState<string>("All");

  if (!portfolio) return null;
  const myTickers = new Set(portfolio.holdings.map((h) => h.ticker));

  const recs = useMemo(() => {
    if (filter === "All") return MOCK_RECOMMENDATIONS;
    if (filter === "High priority") return MOCK_RECOMMENDATIONS.filter((r) => r.priority === "high");
    return MOCK_RECOMMENDATIONS.filter((r) => r.type === filter);
  }, [filter]);

  return (
    <div>
      <PageHeader
        eyebrow="Action"
        title="Recommendations"
        subtitle="AI-assisted suggestions correlated against your book, broker calls, and macro signal. Every action is backed by evidence."
        right={
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-slate-700 bg-ink-700 px-2 py-1.5 text-xs text-slate-200 ring-focus"
          >
            <option>All</option>
            <option>High priority</option>
            <option>REBALANCE</option>
            <option>ADD</option>
            <option>TRIM</option>
            <option>EXIT</option>
            <option>HEDGE</option>
            <option>WATCH</option>
          </select>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <StatChip label="Total" value={MOCK_RECOMMENDATIONS.length} />
        <StatChip label="High priority" value={MOCK_RECOMMENDATIONS.filter((r) => r.priority === "high").length} tone="loss" />
        <StatChip label="Rebalance" value={MOCK_RECOMMENDATIONS.filter((r) => ["TRIM", "ADD", "REBALANCE"].includes(r.type)).length} tone="info" />
        <StatChip label="Watch / Hedge" value={MOCK_RECOMMENDATIONS.filter((r) => ["WATCH", "HEDGE"].includes(r.type)).length} tone="warn" />
      </div>

      <div className="space-y-4">
        {recs.map((r) => {
          const evidence = MOCK_SOURCES.filter((s) => r.evidenceIds.includes(s.id));
          return (
            <Card key={r.id} pad>
              <div className="flex flex-wrap items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-gold-500/30 bg-gold-500/10 text-gold-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={r.priority === "high" ? "loss" : r.priority === "medium" ? "warn" : "info"}>
                      {r.priority} priority
                    </Pill>
                    <Pill tone={r.type === "TRIM" || r.type === "EXIT" ? "loss" : r.type === "ADD" ? "gain" : "default"}>
                      {r.type}
                    </Pill>
                    <span className="text-[11px] text-slate-500">
                      {fmtDate(r.date)} · {relativeTime(r.date)}
                    </span>
                    <span className="ml-auto flex items-center gap-1 text-[11px] text-slate-400">
                      <ShieldCheck className="h-3 w-3" /> Confidence {r.confidence}
                    </span>
                  </div>
                  <div className="mt-2 text-base font-semibold text-slate-100">{r.title}</div>
                  <p className="mt-1 text-sm text-slate-300">{r.rationale}</p>

                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <div>
                      <div className="label-xs mb-1.5">Suggested action</div>
                      <div className="rounded-md border border-slate-800 bg-ink-700/40 p-3 text-xs text-slate-200">
                        {r.suggestedAction}
                      </div>
                    </div>
                    <div>
                      <div className="label-xs mb-1.5">Expected impact</div>
                      <div className="rounded-md border border-slate-800 bg-ink-700/40 p-3 text-xs text-slate-200">
                        {r.expectedImpact || "—"}
                      </div>
                    </div>
                  </div>

                  {r.affectedTickers.length > 0 && (
                    <div className="mt-3">
                      <div className="label-xs mb-1.5">Affected tickers</div>
                      <div className="flex flex-wrap gap-1.5">
                        {r.affectedTickers.map((t) => (
                          <Pill key={t} tone={myTickers.has(t) ? "warn" : "default"}>{t}</Pill>
                        ))}
                      </div>
                    </div>
                  )}

                  {evidence.length > 0 && (
                    <div className="mt-3">
                      <div className="label-xs mb-1.5">Evidence trail</div>
                      <ul className="space-y-1.5">
                        {evidence.map((e) => (
                          <li key={e.id} className="flex items-start gap-2 text-xs">
                            <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                            <span className="text-slate-300">
                              <span className="text-slate-100">{e.name}</span>
                              <span className="text-slate-500"> — {e.summary}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="btn-primary text-xs">
                      <Check className="h-3.5 w-3.5" /> Approve & route to OMS
                    </button>
                    <button className="btn-ghost text-xs">
                      <X className="h-3.5 w-3.5" /> Dismiss
                    </button>
                    <button className="btn-ghost text-xs">Send to advisor</button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function StatChip({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "loss" | "warn" | "info" }) {
  const cls =
    tone === "loss"
      ? "border-rose-500/30 bg-rose-500/10"
      : tone === "warn"
        ? "border-amber-500/30 bg-amber-500/10"
        : tone === "info"
          ? "border-sky-500/30 bg-sky-500/10"
          : "border-slate-800 bg-ink-800";
  return (
    <div className={`rounded-lg border ${cls} px-4 py-3`}>
      <div className="label-xs">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular text-slate-100">{value}</div>
    </div>
  );
}
