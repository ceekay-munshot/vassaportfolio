import { useState } from "react";
import { PieChart, Boxes } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { usePortfolio } from "@/context/PortfolioContext";
import { fmtPct, changeColor } from "@/lib/format";
import type { Holding } from "@/lib/portfolioTypes";

const mv = (h: Holding) => h.marketValueBase ?? h.marketValue;
const cost = (h: Holding) => (h.costUnknown ? 0 : h.costBasisBase ?? h.costBasis);
const gain = (h: Holding) => (h.costUnknown ? 0 : h.unrealizedPnLBase ?? h.unrealizedPnL);

type Agg = { sector: string; cost: number; value: number; gain: number; count: number; hasUnknownCost: boolean };

export function SectorComposition() {
  const { portfolio, fmtFromBase } = usePortfolio();
  const [basis, setBasis] = useState<"value" | "cost">("value");

  const holdings = portfolio?.holdings ?? [];
  const inr = (n: number) => fmtFromBase(n, { compact: true });

  if (!portfolio) return null;

  const totalValue = holdings.reduce((s, h) => s + mv(h), 0);
  const totalCost = holdings.reduce((s, h) => s + cost(h), 0);
  // Gain sums only holdings with a cost record — so it matches the header P&L
  // and never counts a cost-unknown holding's value as "gain".
  const totalGain = holdings.reduce((s, h) => s + gain(h), 0);

  const m = new Map<string, Agg>();
  for (const h of holdings) {
    const a = m.get(h.sector) ?? { sector: h.sector, cost: 0, value: 0, gain: 0, count: 0, hasUnknownCost: false };
    a.cost += cost(h);
    a.value += mv(h);
    a.gain += gain(h);
    a.count += 1;
    if (h.costUnknown) a.hasUnknownCost = true;
    m.set(h.sector, a);
  }
  const sectors = Array.from(m.values()).sort((x, y) => (basis === "value" ? y.value - x.value : y.cost - x.cost));
  const maxBar = Math.max(1, ...sectors.map((s) => (basis === "value" ? s.value : s.cost)));

  const mfValue = holdings.filter((h) => h.vehicle === "Mutual Fund").reduce((s, h) => s + mv(h), 0);
  const directValue = totalValue - mfValue;
  const directPct = totalValue > 0 ? (directValue / totalValue) * 100 : 0;

  const ranked = sectors.filter((s) => s.cost > 0).map((s) => ({ ...s, ret: (s.gain / s.cost) * 100 }));
  const best = ranked.length ? ranked.reduce((a, b) => (b.ret > a.ret ? b : a)) : undefined;
  const worst = ranked.length ? ranked.reduce((a, b) => (b.ret < a.ret ? b : a)) : undefined;

  return (
    <div className="pb-8">
      <PageHeader
        eyebrow="Allocation"
        title="Sector Composition"
        subtitle="Live GICS-sector exposure — switch between money put (cost) and money made (market value), and see which sectors are working."
        right={
          <div className="inline-flex items-center rounded-md border border-slate-700 bg-ink-800/60 p-0.5 text-xs">
            {(["value", "cost"] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBasis(b)}
                className={`rounded px-2.5 py-1 font-medium transition-colors ${
                  basis === b ? "bg-gold-500 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {b === "value" ? "Money made (value)" : "Money put (cost)"}
              </button>
            ))}
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Tile label="Sectors" value={String(sectors.length)} sub={`${holdings.length} holdings`} icon={<Boxes className="h-4 w-4" />} />
        <Tile label="Best sector (return)" value={best ? best.sector : "—"} sub={best ? fmtPct(best.ret, { sign: true }) : undefined} tone="gain" />
        <Tile label="Weakest sector (return)" value={worst ? worst.sector : "—"} sub={worst ? fmtPct(worst.ret, { sign: true }) : undefined} tone="loss" />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card pad className="lg:col-span-2">
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4 text-gold-500" />
            <span className="text-sm font-semibold text-slate-100">Allocation by {basis === "value" ? "market value" : "cost"}</span>
          </div>
          <div className="mt-4 space-y-2.5">
            {sectors.map((s) => {
              const amt = basis === "value" ? s.value : s.cost;
              const denom = basis === "value" ? totalValue : totalCost;
              const pct = denom > 0 ? (amt / denom) * 100 : 0;
              return (
                <div key={s.sector} className="flex items-center gap-3 text-sm">
                  <span className="w-44 shrink-0 truncate text-slate-300">{s.sector}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-gold-500/80" style={{ width: `${(amt / maxBar) * 100}%` }} />
                  </div>
                  <span className="w-20 shrink-0 text-right mono text-slate-200">{inr(amt)}</span>
                  <span className="w-12 shrink-0 text-right mono text-slate-500">{fmtPct(pct, { decimals: 0 })}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card pad>
          <div className="text-sm font-semibold text-slate-100">Direct vs Managed</div>
          <div className="mt-1 text-[11px] text-slate-500">How much you run yourself vs via a fund / manager.</div>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-gold-500/80" style={{ width: `${directPct}%` }} />
            <div className="h-full bg-slate-500/50" style={{ width: `${100 - directPct}%` }} />
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-slate-300"><span className="h-2 w-2 rounded-full bg-gold-500" /> Direct equity</span>
              <span className="mono text-slate-100">{inr(directValue)} · {fmtPct(directPct, { decimals: 0 })}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-slate-300"><span className="h-2 w-2 rounded-full bg-slate-500" /> Via managers (MF)</span>
              <span className="mono text-slate-100">{inr(mfValue)} · {fmtPct(100 - directPct, { decimals: 0 })}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card pad={false}>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="label-xs px-4 py-2.5 text-left font-medium">Sector</th>
                <th className="label-xs px-3 py-2.5 text-right font-medium"># Holdings</th>
                <th className="label-xs px-3 py-2.5 text-right font-medium">Cost (money put)</th>
                <th className="label-xs px-3 py-2.5 text-right font-medium">Value (money made)</th>
                <th className="label-xs px-3 py-2.5 text-right font-medium">Gain</th>
                <th className="label-xs px-3 py-2.5 text-right font-medium">Return %</th>
                <th className="label-xs px-3 py-2.5 text-right font-medium">Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {sectors.map((s) => {
                const ret = s.cost > 0 ? (s.gain / s.cost) * 100 : undefined;
                const wt = totalValue > 0 ? (s.value / totalValue) * 100 : 0;
                return (
                  <tr key={s.sector} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-200">{s.sector}</td>
                    <td className="px-3 py-3 text-right mono text-slate-400">{s.count}</td>
                    <td className="px-3 py-3 text-right mono text-slate-300">{s.hasUnknownCost && s.cost === 0 ? "—" : inr(s.cost)}</td>
                    <td className="px-3 py-3 text-right mono text-slate-100">{inr(s.value)}</td>
                    <td className={`px-3 py-3 text-right mono ${ret == null ? "text-slate-500" : changeColor(s.gain)}`}>
                      {ret == null ? "—" : fmtFromBase(s.gain, { compact: true, sign: true })}
                    </td>
                    <td className={`px-3 py-3 text-right mono ${ret == null ? "text-slate-500" : changeColor(ret)}`}>
                      {ret == null ? "—" : fmtPct(ret, { sign: true })}
                    </td>
                    <td className="px-3 py-3 text-right mono text-slate-200">{fmtPct(wt, { decimals: 1 })}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-700">
                <td className="px-4 py-3 text-xs uppercase tracking-wider text-slate-500">Total</td>
                <td className="px-3 py-3 text-right mono text-slate-400">{holdings.length}</td>
                <td className="px-3 py-3 text-right mono text-slate-300">{inr(totalCost)}</td>
                <td className="px-3 py-3 text-right mono font-semibold text-slate-100">{inr(totalValue)}</td>
                <td className={`px-3 py-3 text-right mono ${changeColor(totalGain)}`}>{fmtFromBase(totalGain, { compact: true, sign: true })}</td>
                <td className="px-3 py-3 text-right mono text-slate-400">{totalCost > 0 ? fmtPct((totalGain / totalCost) * 100, { sign: true }) : "—"}</td>
                <td className="px-3 py-3 text-right mono text-slate-200">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="border-t border-slate-800 px-4 py-2 text-[11px] text-slate-500">
          Cost excludes holdings with no cost record (e.g. DCB Bank), so a sector may show value without a return.
        </div>
      </Card>
    </div>
  );
}

function Tile({ label, value, sub, tone, icon }: { label: string; value: string; sub?: string; tone?: "gain" | "loss"; icon?: React.ReactNode }) {
  return (
    <Card pad>
      <div className="flex items-center gap-1.5 label-xs">
        {icon && <span className="text-gold-500">{icon}</span>}
        {label}
      </div>
      <div className="mt-1 font-display text-xl text-slate-100">{value}</div>
      {sub && <div className={`mt-0.5 text-[11px] ${tone === "loss" ? "text-loss" : tone === "gain" ? "text-gain" : "text-slate-500"}`}>{sub}</div>}
    </Card>
  );
}
