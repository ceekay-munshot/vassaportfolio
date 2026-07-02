import { useMemo } from "react";
import { Receipt, TrendingUp, Scissors, Landmark } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { StatTile } from "@/components/StatTile";
import { usePortfolio } from "@/context/PortfolioContext";
import { mvBase, costBaseOf, pnlBase, holdingYears, vehicleOf } from "@/lib/portfolioAnalytics";
import { changeColor, fmtPct, fmtDate } from "@/lib/format";

const ASOF = new Date("2026-06-30");
const LTCG_RATE = 0.125;
const STCG_RATE = 0.2;
const LTCG_EXEMPTION = 125000; // ₹1.25 L, FY26-27 equity

const isLongTerm = (h: { purchaseDate?: string }) => holdingYears(h as any, ASOF) >= 1;

export function CapitalGains() {
  const { portfolio, fmtFromBase } = usePortfolio();
  if (!portfolio) return null;

  const realized = useMemo(() => portfolio.holdings.filter((h) => h.status === "Exited"), [portfolio]);
  const active = useMemo(() => portfolio.holdings.filter((h) => h.status !== "Exited"), [portfolio]);

  const realizedTotal = realized.reduce((s, h) => s + pnlBase(h), 0);
  const realizedLT = realized.filter(isLongTerm).reduce((s, h) => s + pnlBase(h), 0);
  const realizedST = realized.filter((h) => !isLongTerm(h)).reduce((s, h) => s + pnlBase(h), 0);

  const unrealizedTotal = active.reduce((s, h) => s + pnlBase(h), 0);
  const unrealCost = active.reduce((s, h) => s + costBaseOf(h), 0);
  const unrealReturnPct = unrealCost > 0 ? (unrealizedTotal / unrealCost) * 100 : 0;
  const unrealLTGain = active.filter((h) => isLongTerm(h) && pnlBase(h) > 0).reduce((s, h) => s + pnlBase(h), 0);
  const unrealSTGain = active.filter((h) => !isLongTerm(h) && pnlBase(h) > 0).reduce((s, h) => s + pnlBase(h), 0);

  const lossCandidates = active.filter((h) => pnlBase(h) < 0).sort((a, b) => pnlBase(a) - pnlBase(b));
  const harvestable = lossCandidates.reduce((s, h) => s + Math.abs(pnlBase(h)), 0);

  const taxLT = Math.max(0, realizedLT - LTCG_EXEMPTION) * LTCG_RATE;
  const taxST = Math.max(0, realizedST) * STCG_RATE;
  const estTax = taxLT + taxST;

  const unrealByName = [...active].sort((a, b) => Math.abs(pnlBase(b)) - Math.abs(pnlBase(a))).slice(0, 12);

  return (
    <div>
      <PageHeader
        eyebrow="Tax"
        title="Capital Gains & Tax"
        subtitle="Realized gains this financial year, unrealized long- vs short-term, and loss-harvesting opportunities to offset the tax bill."
        right={<Pill tone="info">FY2026-27 · illustrative</Pill>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Realized gains (this FY)" value={fmtFromBase(realizedTotal, { compact: true, sign: true })} sub={`${realized.length} exited position${realized.length === 1 ? "" : "s"}`} icon={<Receipt className="h-4 w-4" />} />
        <StatTile label="Unrealized gains" value={fmtFromBase(unrealizedTotal, { compact: true, sign: true })} delta={unrealReturnPct} sub="across current holdings" icon={<TrendingUp className="h-4 w-4" />} />
        <StatTile label="Harvestable losses" value={fmtFromBase(harvestable, { compact: true })} sub={`${lossCandidates.length} name${lossCandidates.length === 1 ? "" : "s"} in the red`} icon={<Scissors className="h-4 w-4" />} />
        <StatTile label="Est. tax on realized" value={fmtFromBase(estTax, { compact: true })} sub="LTCG 12.5% + STCG 20%" icon={<Landmark className="h-4 w-4" />} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Realized — this financial year" subtitle="Long-term vs short-term split">
          <div className="grid grid-cols-2 gap-3">
            <SplitCell label="Long-term (LTCG)" value={fmtFromBase(realizedLT, { sign: true, compact: true })} tone={realizedLT >= 0 ? "gain" : "loss"} />
            <SplitCell label="Short-term (STCG)" value={fmtFromBase(realizedST, { sign: true, compact: true })} tone={realizedST >= 0 ? "gain" : "loss"} />
          </div>
          <div className="mt-3 rounded-md border border-slate-800 bg-ink-700/40 p-3 text-[11px] text-slate-400">
            Est. tax: LTCG {fmtFromBase(taxLT, { compact: true })} (after ₹1.25 L exemption) + STCG {fmtFromBase(taxST, { compact: true })}.
          </div>
        </Card>
        <Card title="Unrealized — long vs short term" subtitle="Gains sitting in the book today">
          <div className="grid grid-cols-2 gap-3">
            <SplitCell label="Long-term unrealized" value={fmtFromBase(unrealLTGain, { sign: true, compact: true })} tone="gain" />
            <SplitCell label="Short-term unrealized" value={fmtFromBase(unrealSTGain, { sign: true, compact: true })} tone="gain" />
          </div>
          <div className="mt-3 rounded-md border border-slate-800 bg-ink-700/40 p-3 text-[11px] text-slate-400">
            Long-term names qualify for the lower 12.5% rate on exit — factor holding period before booking gains.
          </div>
        </Card>
      </div>

      <Card className="mt-5" title="Realized transactions — this FY" pad={false}>
        {realized.length === 0 ? (
          <div className="px-4 py-10 text-center text-xs text-slate-500">No realized transactions this financial year.</div>
        ) : (
          <table className="min-w-full">
            <thead className="border-b border-slate-800">
              <tr>
                <th className="label-xs px-4 py-2 text-left font-medium">Ticker</th>
                <th className="label-xs px-4 py-2 text-left font-medium">Company</th>
                <th className="label-xs px-4 py-2 text-left font-medium">Bought</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Holding period</th>
                <th className="label-xs px-4 py-2 text-center font-medium">Type</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Gain / Loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {realized.map((h) => {
                const lt = isLongTerm(h);
                const yrs = holdingYears(h, ASOF);
                return (
                  <tr key={h.ticker} className="hover:bg-slate-800/30">
                    <td className="px-4 py-2.5 mono font-semibold text-slate-100">{h.ticker}</td>
                    <td className="px-4 py-2.5 text-slate-400">{h.companyName}</td>
                    <td className="px-4 py-2.5 text-slate-400">{h.purchaseDate ? fmtDate(h.purchaseDate) : "—"}</td>
                    <td className="px-4 py-2.5 text-right mono text-slate-300">{yrs > 0 ? `${yrs.toFixed(1)} yrs` : "—"}</td>
                    <td className="px-4 py-2.5 text-center"><Pill tone={lt ? "info" : "warn"}>{lt ? "LTCG" : "STCG"}</Pill></td>
                    <td className={`px-4 py-2.5 text-right mono ${changeColor(pnlBase(h))}`}>{fmtFromBase(pnlBase(h), { sign: true, compact: true })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="mt-5" title="Loss-harvesting opportunities" subtitle={lossCandidates.length ? `Book up to ${fmtFromBase(harvestable, { compact: true })} of losses to offset realized gains` : undefined} pad={false}>
        {lossCandidates.length === 0 ? (
          <div className="px-4 py-10 text-center text-xs text-slate-500">No loss-harvesting candidates — the book is in the green.</div>
        ) : (
          <table className="min-w-full">
            <thead className="border-b border-slate-800">
              <tr>
                <th className="label-xs px-4 py-2 text-left font-medium">Ticker</th>
                <th className="label-xs px-4 py-2 text-left font-medium">Company</th>
                <th className="label-xs px-4 py-2 text-left font-medium">Vehicle</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Unrealized loss</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Return</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {lossCandidates.map((h) => (
                <tr key={h.ticker} className="hover:bg-slate-800/30">
                  <td className="px-4 py-2.5 mono font-semibold text-slate-100">{h.ticker}</td>
                  <td className="px-4 py-2.5 text-slate-400">{h.companyName}</td>
                  <td className="px-4 py-2.5 text-slate-400">{vehicleOf(h)}</td>
                  <td className="px-4 py-2.5 text-right mono text-loss">{fmtFromBase(pnlBase(h), { sign: true, compact: true })}</td>
                  <td className={`px-4 py-2.5 text-right mono ${changeColor(h.returnPct)}`}>{fmtPct(h.returnPct, { sign: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="mt-5" title="Unrealized by holding" subtitle="Largest gains and losses sitting in the book" pad={false}>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-slate-800">
              <tr>
                <th className="label-xs px-4 py-2 text-left font-medium">Ticker</th>
                <th className="label-xs px-4 py-2 text-center font-medium">Term</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Cost</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Market value</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Unrealized</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Return</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {unrealByName.map((h) => (
                <tr key={h.ticker} className="hover:bg-slate-800/30">
                  <td className="px-4 py-2.5">
                    <div className="mono font-semibold text-slate-100">{h.ticker}</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[200px]">{h.companyName}</div>
                  </td>
                  <td className="px-4 py-2.5 text-center"><Pill tone={isLongTerm(h) ? "info" : "warn"}>{isLongTerm(h) ? "LT" : "ST"}</Pill></td>
                  <td className="px-4 py-2.5 text-right mono text-slate-400">{fmtFromBase(costBaseOf(h), { compact: true })}</td>
                  <td className="px-4 py-2.5 text-right mono text-slate-200">{fmtFromBase(mvBase(h), { compact: true })}</td>
                  <td className={`px-4 py-2.5 text-right mono ${changeColor(pnlBase(h))}`}>{fmtFromBase(pnlBase(h), { sign: true, compact: true })}</td>
                  <td className={`px-4 py-2.5 text-right mono ${changeColor(h.returnPct)}`}>{fmtPct(h.returnPct, { sign: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-3 px-1 text-[11px] text-slate-500">
        Illustrative tax only. India FY2026-27 equity: LTCG 12.5% on gains above ₹1.25 L; STCG 20%. Long-term = held ≥ 1 year. Confirm with your tax advisor before acting.
      </p>
    </div>
  );
}

function SplitCell({ label, value, tone }: { label: string; value: string; tone: "gain" | "loss" }) {
  return (
    <div className="rounded-md border border-slate-800 bg-ink-700/40 px-3 py-2.5">
      <div className="label-xs">{label}</div>
      <div className={`mt-1 text-lg font-semibold tabular ${tone === "gain" ? "text-gain" : "text-loss"}`}>{value}</div>
    </div>
  );
}
