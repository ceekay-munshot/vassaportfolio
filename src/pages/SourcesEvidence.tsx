import { useState } from "react";
import {
  BookOpenText,
  FileText,
  Newspaper,
  Building2,
  FileWarning,
  NotebookText,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { usePortfolio } from "@/context/PortfolioContext";
import { fmtDate, relativeTime } from "@/lib/format";
import { MOCK_SOURCES } from "@/data/mockSources";
import type { SourceDoc } from "@/types";

const TYPE_ICONS: Record<SourceDoc["type"], any> = {
  "Broker Report": FileText,
  News: Newspaper,
  Regulatory: FileWarning,
  Earnings: Building2,
  Macro: TrendingUp,
  "Internal Memo": NotebookText,
};

export function SourcesEvidence() {
  const { portfolio } = usePortfolio();
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [q, setQ] = useState("");

  if (!portfolio) return null;
  const myTickers = new Set(portfolio.holdings.map((h) => h.ticker));

  const filtered = MOCK_SOURCES.filter((s) => {
    if (typeFilter !== "All" && s.type !== typeFilter) return false;
    if (q && !(`${s.name} ${s.summary} ${s.relatedTickers.join(" ")}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  }).sort((a, b) => +new Date(b.date) - +new Date(a.date));

  const counts = MOCK_SOURCES.reduce<Record<string, number>>((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Sources & Evidence"
        subtitle="Every recommendation, every signal — traceable to the underlying source. Audit trail for the IC."
        right={
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search sources…"
              className="rounded-md border border-slate-700 bg-ink-700 px-3 py-1.5 text-xs text-slate-200 ring-focus"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-md border border-slate-700 bg-ink-700 px-2 py-1.5 text-xs text-slate-200 ring-focus"
            >
              <option>All</option>
              <option>Broker Report</option>
              <option>News</option>
              <option>Regulatory</option>
              <option>Macro</option>
              <option>Internal Memo</option>
            </select>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SourceTypeCard label="Total" value={MOCK_SOURCES.length} icon={BookOpenText} />
        <SourceTypeCard label="Broker Reports" value={counts["Broker Report"] || 0} icon={FileText} />
        <SourceTypeCard label="News" value={counts["News"] || 0} icon={Newspaper} />
        <SourceTypeCard label="Regulatory" value={counts["Regulatory"] || 0} icon={FileWarning} />
        <SourceTypeCard label="Macro / Memo" value={(counts["Macro"] || 0) + (counts["Internal Memo"] || 0)} icon={NotebookText} />
      </div>

      <Card pad={false}>
        <table className="min-w-full">
          <thead className="border-b border-slate-800">
            <tr>
              <th className="label-xs px-4 py-2 text-left font-medium">Date</th>
              <th className="label-xs px-4 py-2 text-left font-medium">Type</th>
              <th className="label-xs px-4 py-2 text-left font-medium">Source</th>
              <th className="label-xs px-4 py-2 text-left font-medium">Summary</th>
              <th className="label-xs px-4 py-2 text-left font-medium">Linked tickers</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 text-sm">
            {filtered.map((s) => {
              const Icon = TYPE_ICONS[s.type];
              return (
                <tr key={s.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-2.5 align-top">
                    <div className="text-slate-200">{fmtDate(s.date)}</div>
                    <div className="text-[11px] text-slate-500">{relativeTime(s.date)}</div>
                  </td>
                  <td className="px-4 py-2.5 align-top">
                    <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-ink-700 px-2 py-0.5 text-xs text-slate-300">
                      <Icon className="h-3 w-3" />
                      {s.type}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 align-top">
                    <div className="text-sm font-medium text-slate-100">{s.name}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      ID: <span className="mono">{s.id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 align-top max-w-md text-xs text-slate-300">{s.summary}</td>
                  <td className="px-4 py-2.5 align-top">
                    <div className="flex flex-wrap gap-1">
                      {s.relatedTickers.length === 0 ? (
                        <span className="text-xs text-slate-500">—</span>
                      ) : (
                        s.relatedTickers.map((t) => (
                          <Pill key={t} tone={myTickers.has(t) ? "warn" : "default"}>
                            {t}
                          </Pill>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function SourceTypeCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className="grid h-9 w-9 place-items-center rounded-md border border-slate-700 bg-ink-700 text-slate-400">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="label-xs">{label}</div>
        <div className="text-lg font-semibold tabular text-slate-100">{value}</div>
      </div>
    </div>
  );
}
