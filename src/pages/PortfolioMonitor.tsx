import { useMemo, useState } from "react";
import { ArrowUpDown, Filter } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { usePortfolio } from "@/context/PortfolioContext";
import { changeColor, fmtCurrency, fmtNum, fmtPct } from "@/lib/format";
import type { Holding } from "@/lib/portfolioTypes";

type SortKey = "weight" | "mv" | "pnl" | "ret" | "ticker";

const mv = (h: Holding) => h.marketValueBase ?? h.marketValue;
const pnl = (h: Holding) => h.unrealizedPnLBase ?? h.unrealizedPnL;
const DASH = "—";

export function PortfolioMonitor() {
  const { portfolio, fmtFromBase } = usePortfolio();
  const [sortKey, setSortKey] = useState<SortKey>("weight");
  const [sortDesc, setSortDesc] = useState(true);
  const [filterSector, setFilterSector] = useState<string>("All");
  const [filterBroker, setFilterBroker] = useState<string>("All");

  const holdings = portfolio?.holdings ?? [];
  const sectors = Array.from(new Set(holdings.map((h) => h.sector))).sort();
  const brokers = Array.from(new Set(holdings.map((h) => h.broker ?? DASH))).sort();

  const rows = useMemo(() => {
    const filtered = holdings.filter((h) => {
      if (filterSector !== "All" && h.sector !== filterSector) return false;
      if (filterBroker !== "All" && (h.broker ?? DASH) !== filterBroker) return false;
      return true;
    });
    const cmp = (a: Holding, b: Holding) => {
      switch (sortKey) {
        case "weight": return a.portfolioWeight - b.portfolioWeight;
        case "mv": return mv(a) - mv(b);
        case "pnl": return pnl(a) - pnl(b);
        case "ret": return a.returnPct - b.returnPct;
        case "ticker": return a.ticker.localeCompare(b.ticker);
      }
    };
    return [...filtered].sort((a, b) => (sortDesc ? cmp(b, a) : cmp(a, b)));
  }, [holdings, filterSector, filterBroker, sortKey, sortDesc]);

  if (!portfolio) return null;

  const totalMV = rows.reduce((s, h) => s + mv(h), 0);
  const totalPnL = rows.filter((h) => !h.costUnknown).reduce((s, h) => s + pnl(h), 0);
  const totalWeight = rows.reduce((s, h) => s + h.portfolioWeight, 0);
  const maxWeight = Math.max(0.0001, ...rows.map((h) => h.portfolioWeight));

  function head(label: string, key: SortKey) {
    const active = sortKey === key;
    return (
      <th
        scope="col"
        className="label-xs cursor-pointer select-none px-3 py-2.5 text-right font-medium"
        onClick={() => {
          if (active) setSortDesc((d) => !d);
          else { setSortKey(key); setSortDesc(true); }
        }}
      >
        <span className={`inline-flex items-center gap-1 ${active ? "text-slate-100" : ""}`}>
          {label}
          <ArrowUpDown className="h-3 w-3 opacity-60" />
        </span>
      </th>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        eyebrow="Holdings"
        title="Portfolio Monitor"
        subtitle="Every position in one view — cost basis from the Zerodha trade book, custody per the Axis demat, joined on ISIN."
        right={
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Filter className="h-3.5 w-3.5" />
            <span>{rows.length} of {holdings.length} holdings</span>
          </div>
        }
      />

      <Card className="mb-4" pad>
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect label="Sector" value={filterSector} options={["All", ...sectors]} onChange={setFilterSector} />
          <FilterSelect label="Broker" value={filterBroker} options={["All", ...brokers]} onChange={setFilterBroker} />
        </div>
      </Card>

      <Card pad={false} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-full">
            <thead>
              <tr className="sticky top-0 z-20 border-b border-slate-800 bg-ink-800">
                <th
                  scope="col"
                  className="sticky left-0 z-30 cursor-pointer select-none bg-ink-800 px-3 py-2.5 text-left label-xs font-medium"
                  onClick={() => { if (sortKey === "ticker") setSortDesc((d) => !d); else { setSortKey("ticker"); setSortDesc(true); } }}
                >
                  <span className={`inline-flex items-center gap-1 ${sortKey === "ticker" ? "text-slate-100" : ""}`}>
                    Stock
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </span>
                </th>
                <th className="label-xs px-3 py-2.5 text-left font-medium">Broker</th>
                <th className="label-xs px-3 py-2.5 text-left font-medium">Sector</th>
                <th className="label-xs px-3 py-2.5 text-right font-medium">Qty</th>
                <th className="label-xs px-3 py-2.5 text-right font-medium">Avg Cost</th>
                <th className="label-xs px-3 py-2.5 text-right font-medium">CMP</th>
                {head("Return %", "ret")}
                {head("Market Value", "mv")}
                {head("Unrealized P&L", "pnl")}
                {head("Weight", "weight")}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {rows.map((h) => (
                <tr key={h.isin ?? h.ticker} className="group text-sm hover:bg-slate-800/30">
                  <td className="sticky left-0 z-10 bg-ink-800 px-3 py-3 group-hover:bg-ink-700">
                    <div className="flex items-center gap-2">
                      <span className="mono font-semibold text-slate-100">{h.ticker}</span>
                      {h.vehicle === "Mutual Fund" && <Pill tone="info">MF</Pill>}
                    </div>
                    <div className="max-w-[220px] truncate text-[11px] text-slate-500">{h.companyName}</div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-slate-300">{h.broker ?? DASH}</div>
                    {h.costUnknown
                      ? <div className="text-[10px] text-amber-500">no cost basis</div>
                      : h.costSource && <div className="text-[10px] text-slate-500">cost: {h.costSource}</div>}
                  </td>
                  <td className="px-3 py-3 text-slate-400">{h.sector}</td>
                  <td className="px-3 py-3 text-right mono text-slate-300">{fmtNum(h.quantity)}</td>
                  <td className="px-3 py-3 text-right mono text-slate-400">
                    {h.costUnknown ? <span className="text-slate-500">{DASH}</span> : fmtCurrency(h.averageCost, h.currency ?? "INR")}
                  </td>
                  <td className="px-3 py-3 text-right mono text-slate-200">{fmtCurrency(h.currentPrice, h.currency ?? "INR")}</td>
                  <td className={`px-3 py-3 text-right mono ${h.costUnknown ? "text-slate-500" : changeColor(h.returnPct)}`}>
                    {h.costUnknown ? DASH : fmtPct(h.returnPct, { sign: true })}
                  </td>
                  <td className="px-3 py-3 text-right mono text-slate-100">{fmtFromBase(mv(h), { compact: true })}</td>
                  <td className={`px-3 py-3 text-right mono ${h.costUnknown ? "text-slate-500" : changeColor(pnl(h))}`}>
                    {h.costUnknown ? DASH : fmtFromBase(pnl(h), { compact: true, sign: true })}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="mono text-slate-200">{(h.portfolioWeight * 100).toFixed(1)}%</div>
                    <div className="mt-1 ml-auto h-1 w-16 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full bg-gold-500/80" style={{ width: `${(h.portfolioWeight / maxWeight) * 100}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-xs text-slate-500">
                    No holdings match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="sticky bottom-0 border-t border-slate-700 bg-ink-800">
                  <td className="sticky left-0 bg-ink-800 px-3 py-3 text-xs uppercase tracking-wider text-slate-500">Total · {rows.length}</td>
                  <td colSpan={6} className="px-3 py-3" />
                  <td className="px-3 py-3 text-right mono font-semibold text-slate-100">{fmtFromBase(totalMV, { compact: true })}</td>
                  <td className={`px-3 py-3 text-right mono font-semibold ${changeColor(totalPnL)}`}>{fmtFromBase(totalPnL, { compact: true, sign: true })}</td>
                  <td className="px-3 py-3 text-right mono text-slate-200">{(totalWeight * 100).toFixed(0)}%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-400">
      <span className="label-xs">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-700 bg-ink-700 px-2.5 py-1.5 text-xs text-slate-200 ring-focus"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
