import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, ShieldAlert, Layers, Gauge } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { usePortfolio } from "@/context/PortfolioContext";
import { fmtPct, changeColor } from "@/lib/format";
import {
  navOf,
  sectorAllocation,
  concentration,
  portfolioVol,
  volProxy,
  rangePosition,
  computeLeverage,
  type LeverageInputs,
} from "@/lib/riskAnalytics";

const LKEY = "nv:leverage";
const DEFAULT_LEV: LeverageInputs = { pledgedPct: 100, ltvPct: 50, fnoMarginCr: 0, fnoNotionalCr: 0 };

function useLeverage(): [LeverageInputs, (p: Partial<LeverageInputs>) => void] {
  const [inp, setInp] = useState<LeverageInputs>(() => {
    try {
      const s = localStorage.getItem(LKEY);
      if (s) return { ...DEFAULT_LEV, ...JSON.parse(s) };
    } catch {
      /* ignore */
    }
    return DEFAULT_LEV;
  });
  useEffect(() => {
    try {
      localStorage.setItem(LKEY, JSON.stringify(inp));
    } catch {
      /* ignore */
    }
  }, [inp]);
  return [inp, (p) => setInp((prev) => ({ ...prev, ...p }))];
}

export function RiskLeverage() {
  const { portfolio, fmtFromBase } = usePortfolio();
  const [lev, setLev] = useLeverage();

  const holdings = portfolio?.holdings ?? [];
  const nav = navOf(holdings);
  const pVol = portfolioVol(holdings);
  const conc = concentration(holdings);
  const sectors = sectorAllocation(holdings);
  const out = computeLeverage(nav, lev, pVol);
  const inr = (n: number) => fmtFromBase(n, { compact: true });

  if (!portfolio) return null;

  const liveRows = holdings
    .filter((h) => h.priceStatus === "live")
    .sort((a, b) => (b.marketValueBase ?? b.marketValue) - (a.marketValueBase ?? a.marketValue));

  return (
    <div className="pb-8">
      <PageHeader
        eyebrow="Analytics"
        title="Risk & Leverage"
        subtitle="Concentration and momentum are computed live from your holdings. Pledge & F&O figures are yours to enter — they're not in the uploaded files."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Net Worth (tracked)" value={inr(nav)} sub="Live portfolio value" />
        <Tile label="Gross Exposure" value={inr(out.grossExposure)} sub="Portfolio + F&O notional" />
        <Tile
          label="Gross Leverage"
          value={`${out.grossLeverage.toFixed(2)}×`}
          sub={out.grossLeverage > 2 ? "Elevated" : "Contained"}
          tone={out.grossLeverage > 3 ? "loss" : undefined}
        />
        <Tile
          label="1-Day VaR (95%)"
          value={`${out.var1dPctNetWorth.toFixed(1)}% of NW`}
          sub={`≈ ${inr(out.var1dValue)} · indicative`}
          tone={out.var1dPctNetWorth > 50 ? "loss" : undefined}
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card pad>
          <SectionTitle icon={<Gauge className="h-4 w-4" />} title="Leverage & Margin" note="your inputs" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <NumField label="Pledged (% of book)" value={lev.pledgedPct} onChange={(v) => setLev({ pledgedPct: v })} suffix="%" />
            <NumField label="Loan-to-value" value={lev.ltvPct} onChange={(v) => setLev({ ltvPct: v })} suffix="%" />
            <NumField label="F&O margin used" value={lev.fnoMarginCr} onChange={(v) => setLev({ fnoMarginCr: v })} suffix="₹Cr" />
            <NumField label="F&O notional" value={lev.fnoNotionalCr} onChange={(v) => setLev({ fnoNotionalCr: v })} suffix="₹Cr" />
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <Row k="Pledged collateral" v={inr(out.collateral)} />
            <Row k="Borrowing limit (against pledge)" v={inr(out.borrowingLimit)} />
            <Row k="Margin utilisation" v={fmtPct(out.marginUtil * 100, { decimals: 0 })} tone={out.marginUtil > 0.8 ? "loss" : undefined} />
            <Row k="Free margin buffer" v={inr(out.buffer)} tone={out.buffer < 0 ? "loss" : "gain"} />
            <div className="divider my-2" />
            <Row k="Buffer after a 10% market drop" v={inr(out.stressBuffer10)} tone={out.stressBuffer10 < 0 ? "loss" : undefined} />
            {out.stressBuffer10 < 0 && (
              <div className="mt-1 flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-500">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> A 10% fall would breach your limit — margin-call risk.
              </div>
            )}
          </div>
        </Card>

        <Card pad>
          <SectionTitle icon={<Layers className="h-4 w-4" />} title="Concentration" note="live" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Mini label="Top-5 weight" value={fmtPct(conc.top5Weight * 100, { decimals: 0 })} />
            <Mini label="Largest name" value={`${conc.maxName} · ${fmtPct(conc.maxNameWeight * 100, { decimals: 0 })}`} />
            <Mini label="Largest sector" value={`${conc.maxSector}`} sub={fmtPct(conc.maxSectorWeight * 100, { decimals: 0 })} />
            <Mini label="Effective # names" value={conc.effectiveNames.toFixed(1)} sub={`HHI ${conc.hhi.toFixed(3)}`} />
          </div>
          <div className="mt-4">
            <div className="label-xs mb-2">Sector allocation</div>
            <div className="space-y-1.5">
              {sectors.map((s) => (
                <div key={s.sector} className="flex items-center gap-2 text-xs">
                  <span className="w-40 shrink-0 truncate text-slate-400">{s.sector}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full bg-gold-500/80" style={{ width: `${s.weight * 100}%` }} />
                  </div>
                  <span className="w-10 shrink-0 text-right mono text-slate-300">{fmtPct(s.weight * 100, { decimals: 0 })}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card pad={false}>
        <div className="border-b border-slate-800 px-4 py-3">
          <SectionTitle icon={<ShieldAlert className="h-4 w-4" />} title="Per-holding risk & momentum" note="live" />
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="label-xs px-4 py-2 text-left font-medium">Stock</th>
                <th className="label-xs px-3 py-2 text-right font-medium">Weight</th>
                <th className="label-xs px-3 py-2 text-right font-medium">1Y change</th>
                <th className="label-xs px-3 py-2 text-left font-medium">52-wk range (low → high)</th>
                <th className="label-xs px-3 py-2 text-right font-medium">vs 200-DMA</th>
                <th className="label-xs px-3 py-2 text-right font-medium">Vol (proxy)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {liveRows.map((h) => {
                const rp = rangePosition(h);
                const vp = volProxy(h);
                const vs200 = h.ma200 ? ((h.currentPrice - h.ma200) / h.ma200) * 100 : undefined;
                return (
                  <tr key={h.isin ?? h.ticker} className="hover:bg-slate-800/30">
                    <td className="px-4 py-2.5">
                      <span className="mono font-semibold text-slate-100">{h.ticker}</span>
                      <span className="ml-2 text-[11px] text-slate-500">{h.sector}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right mono text-slate-300">{fmtPct(h.portfolioWeight * 100, { decimals: 1 })}</td>
                    <td className={`px-3 py-2.5 text-right mono ${h.yearlyChangePct != null ? changeColor(h.yearlyChangePct) : "text-slate-500"}`}>
                      {h.yearlyChangePct != null ? fmtPct(h.yearlyChangePct, { sign: true, decimals: 1 }) : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      {rp != null ? (
                        <div className="flex items-center gap-2">
                          <div className="relative h-1.5 w-28 rounded-full bg-slate-800">
                            <div
                              className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-gold-500 shadow"
                              style={{ left: `calc(${Math.max(0, Math.min(1, rp)) * 100}% - 5px)` }}
                            />
                          </div>
                          <span className="mono text-[11px] text-slate-500">{fmtPct(rp * 100, { decimals: 0 })}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className={`px-3 py-2.5 text-right mono ${vs200 != null ? changeColor(vs200) : "text-slate-500"}`}>
                      {vs200 != null ? fmtPct(vs200, { sign: true, decimals: 1 }) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right mono text-slate-400">{vp != null ? fmtPct(vp * 100, { decimals: 0 }) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-800 px-4 py-2 text-[11px] text-slate-500">
          Vol is a 52-week-range proxy, not a returns-series volatility. Full statistical VaR / Sharpe / beta need a price-history feed — a next step.
        </div>
      </Card>
    </div>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "gain" | "loss" }) {
  return (
    <Card pad>
      <div className="label-xs">{label}</div>
      <div className={`mt-1 font-display text-2xl ${tone === "loss" ? "text-loss" : tone === "gain" ? "text-gain" : "text-slate-100"}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>}
    </Card>
  );
}

function SectionTitle({ icon, title, note }: { icon: ReactNode; title: string; note?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gold-500">{icon}</span>
      <span className="text-sm font-semibold text-slate-100">{title}</span>
      {note && <span className="pill ml-auto">{note}</span>}
    </div>
  );
}

function NumField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <label className="block">
      <span className="label-xs">{label}</span>
      <div className="mt-1 flex items-center rounded-md border border-slate-700 bg-ink-700">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full bg-transparent px-2.5 py-1.5 text-sm text-slate-100 ring-focus"
        />
        {suffix && <span className="px-2 text-[11px] text-slate-500">{suffix}</span>}
      </div>
    </label>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: "gain" | "loss" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{k}</span>
      <span className={`mono font-medium ${tone === "loss" ? "text-loss" : tone === "gain" ? "text-gain" : "text-slate-100"}`}>{v}</span>
    </div>
  );
}

function Mini({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-ink-700/40 px-3 py-2">
      <div className="label-xs">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-100">{value}</div>
      {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
    </div>
  );
}
