import { useMemo, useState } from "react";
import {
  Coins,
  Scissors,
  Gift,
  RefreshCw,
  GitMerge,
  PlusCircle,
  CalendarDays,
  Bell,
  Filter,
  FileText,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { StatTile } from "@/components/StatTile";
import { usePortfolio } from "@/context/PortfolioContext";
import { fmtDate, relativeTime } from "@/lib/format";
import { MOCK_CORPORATE_ACTIONS, type CorpActionType } from "@/data/mockCorporateActions";

const ASOF = new Date("2026-06-30");

const TYPE_ICON: Record<CorpActionType, any> = {
  Dividend: Coins,
  "Stock Split": Scissors,
  Bonus: Gift,
  Buyback: RefreshCw,
  Demerger: GitMerge,
  Merger: GitMerge,
  Rights: PlusCircle,
  AGM: CalendarDays,
};

const STATUS_ORDER: Record<string, number> = { "Ex-date soon": 0, Upcoming: 1, Announced: 2, Completed: 3 };

export function CorporateActions() {
  const { portfolio } = usePortfolio();
  const [onlyMine, setOnlyMine] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("All");
  if (!portfolio) return null;

  const myTickers = new Set(portfolio.holdings.map((h) => h.ticker));

  const actions = useMemo(() => {
    return MOCK_CORPORATE_ACTIONS.filter((a) => {
      if (onlyMine && !myTickers.has(a.ticker)) return false;
      if (typeFilter !== "All" && a.type !== typeFilter) return false;
      return true;
    }).sort((a, b) => {
      const so = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
      if (so !== 0) return so;
      return +new Date(a.exDate) - +new Date(b.exDate);
    });
  }, [onlyMine, typeFilter, myTickers]);

  const next30 = actions.filter((a) => {
    const days = (+new Date(a.exDate) - +ASOF) / 86400000;
    return a.status !== "Completed" && days >= 0 && days <= 30;
  }).length;
  const dividends = actions.filter((a) => a.type === "Dividend").length;
  const structural = actions.filter((a) => ["Stock Split", "Bonus", "Demerger", "Merger", "Rights"].includes(a.type)).length;

  return (
    <div>
      <PageHeader
        eyebrow="Events"
        title="Corporate Actions"
        subtitle="Splits, bonuses, dividends, buybacks and demergers — auto-populated from NSE/BSE filings and your custodian, mapped to the names you hold."
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
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-md border border-slate-700 bg-ink-700 px-2 py-1 text-xs text-slate-200 ring-focus">
                <option>All</option>
                {(["Dividend", "Stock Split", "Bonus", "Buyback", "Demerger", "Rights", "AGM"] as CorpActionType[]).map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Actions tracked" value={actions.length} sub="across your book" icon={<CalendarDays className="h-4 w-4" />} />
        <StatTile label="Next 30 days" value={next30} sub="record/ex-dates approaching" icon={<Bell className="h-4 w-4" />} />
        <StatTile label="Dividends & distributions" value={dividends} sub="cash inflows incoming" icon={<Coins className="h-4 w-4" />} />
        <StatTile label="Structural events" value={structural} sub="splits · bonus · demergers · rights" icon={<GitMerge className="h-4 w-4" />} />
      </div>

      <div className="mt-5 space-y-3">
        {actions.map((a) => {
          const Icon = TYPE_ICON[a.type];
          const held = myTickers.has(a.ticker);
          const tone = a.impact === "positive" ? "gain" : a.impact === "info" ? "info" : "default";
          return (
            <Card key={a.id} pad>
              <div className="flex flex-wrap items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-slate-700 bg-ink-700 text-gold-400">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={tone}>{a.type}</Pill>
                    <Pill tone={held ? "warn" : "default"}>{a.ticker}</Pill>
                    <span className="text-sm text-slate-400">{a.companyName}</span>
                    <Pill tone={a.status === "Completed" ? "default" : a.status === "Ex-date soon" ? "loss" : "info"} className="ml-auto">
                      {a.status}
                    </Pill>
                  </div>
                  <div className="mt-1.5 text-base font-semibold text-slate-100">{a.detail}</div>
                  <p className="mt-1 text-sm text-slate-400">{a.note}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3 w-3" />
                      {a.status === "Completed" ? "Recorded" : "Ex / record"} {fmtDate(a.exDate)} · {relativeTime(a.exDate)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-3 w-3" />
                      {a.source}
                    </span>
                  </div>
                </div>
                <button className="btn-ghost shrink-0 text-xs active:scale-[0.97]">
                  <Bell className="h-3.5 w-3.5" />
                  Set alert
                </button>
              </div>
            </Card>
          );
        })}

        {actions.length === 0 && (
          <Card pad>
            <div className="py-10 text-center text-sm text-slate-400">
              No corporate actions match the filter. Try turning off “Only my holdings” or changing the type.
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
