import { chart } from "@/theme/tokens";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Wallet, Droplet, CalendarClock, ArrowDownToLine } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { StatTile } from "@/components/StatTile";
import { usePortfolio } from "@/context/PortfolioContext";
import { fmtDate, relativeTime } from "@/lib/format";
import {
  MOCK_COMMITMENTS,
  MOCK_CAPITAL_CALLS,
  MOCK_DISTRIBUTIONS,
} from "@/data/mockCapitalCalls";
import { chartTooltipStyle, chartTooltipLabelStyle, chartTooltipItemStyle } from "@/lib/chartTheme";

const ASOF = new Date("2026-06-30");
const inrCr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")} Cr`;

function quarterLabel(iso: string): string {
  const d = new Date(iso);
  const m = d.getMonth();
  const q = Math.floor(((m - 3 + 12) % 12) / 3) + 1; // Apr -> Q1
  const fy = m >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `Q${q} FY${String((fy + 1) % 100).padStart(2, "0")}`;
}

export function Liquidity() {
  const { portfolio } = usePortfolio();
  if (!portfolio) return null;

  const totals = useMemo(() => {
    const committed = MOCK_COMMITMENTS.reduce((s, c) => s + c.committed, 0);
    const drawn = MOCK_COMMITMENTS.reduce((s, c) => s + c.drawn, 0);
    const distributed = MOCK_COMMITMENTS.reduce((s, c) => s + c.distributed, 0);
    const nav = MOCK_COMMITMENTS.reduce((s, c) => s + c.nav, 0);
    return { committed, drawn, distributed, nav, undrawn: committed - drawn };
  }, []);

  const calls = useMemo(() => [...MOCK_CAPITAL_CALLS].sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate)), []);
  const next90 = calls.filter((c) => {
    const days = (+new Date(c.dueDate) - +ASOF) / 86400000;
    return days >= 0 && days <= 90;
  });
  const next90Sum = next90.reduce((s, c) => s + c.amount, 0);
  const dist12m = MOCK_DISTRIBUTIONS.filter((d) => (+ASOF - +new Date(d.date)) / 86400000 <= 365).reduce((s, d) => s + d.amount, 0);

  const callsByQuarter = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, number>();
    for (const c of calls) {
      const q = quarterLabel(c.dueDate);
      if (!map.has(q)) order.push(q);
      map.set(q, (map.get(q) ?? 0) + c.amount);
    }
    return order.map((q) => ({ quarter: q, amount: map.get(q) ?? 0 }));
  }, [calls]);

  const buffer = next90Sum + totals.undrawn * 0.1; // near-term calls + a 10% margin on undrawn

  return (
    <div>
      <PageHeader
        eyebrow="Private Markets"
        title="Liquidity & Capital Calls"
        subtitle="Your private-markets commitments, the drawdown schedule, distributions received, and the cash buffer to keep ready for upcoming calls."
        right={<Pill tone="info">₹ Crore</Pill>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total committed" value={inrCr(totals.committed)} sub={`${MOCK_COMMITMENTS.length} funds · ${inrCr(totals.drawn)} drawn`} icon={<Wallet className="h-4 w-4" />} />
        <StatTile label="Undrawn commitments" value={inrCr(totals.undrawn)} sub="dry powder still owed" icon={<Droplet className="h-4 w-4" />} />
        <StatTile label="Calls — next 90 days" value={inrCr(next90Sum)} sub={`${next90.length} expected call${next90.length === 1 ? "" : "s"}`} icon={<CalendarClock className="h-4 w-4" />} />
        <StatTile label="Distributions (12m)" value={inrCr(dist12m)} sub="returned to the family" icon={<ArrowDownToLine className="h-4 w-4" />} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Capital call calendar" subtitle="Expected drawdowns by quarter — plan liquidity ahead">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={callsByQuarter} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={chart.grid} strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="quarter" stroke={chart.axis} fontSize={11} />
                <YAxis stroke={chart.axis} fontSize={11} tickFormatter={(v) => `₹${v}`} />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} formatter={(v: number) => inrCr(v)} />
                <Bar dataKey="amount" fill={chart.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Liquidity to hold" subtitle="Recommended cash buffer">
          <div className="text-3xl font-semibold tabular tracking-tight text-slate-100">{inrCr(buffer)}</div>
          <p className="mt-2 text-xs text-slate-400">
            Covers all calls due in the next 90 days ({inrCr(next90Sum)}) plus a 10% margin on undrawn commitments for indicative calls.
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <Line label="Undrawn commitments" value={inrCr(totals.undrawn)} />
            <Line label="Current NAV (drawn)" value={inrCr(totals.nav)} />
            <Line label="Blended TVPI" value={`${((totals.nav + totals.distributed) / totals.drawn).toFixed(2)}×`} />
            <Line label="DPI (distributed / drawn)" value={`${(totals.distributed / totals.drawn).toFixed(2)}×`} />
          </div>
        </Card>
      </div>

      <Card className="mt-5" title="Upcoming capital calls" pad={false}>
        <table className="min-w-full">
          <thead className="border-b border-slate-800">
            <tr>
              <th className="label-xs px-4 py-2 text-left font-medium">Fund</th>
              <th className="label-xs px-4 py-2 text-left font-medium">Due</th>
              <th className="label-xs px-4 py-2 text-right font-medium">Amount</th>
              <th className="label-xs px-4 py-2 text-left font-medium">Purpose</th>
              <th className="label-xs px-4 py-2 text-center font-medium">Likelihood</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 text-sm">
            {calls.map((c) => (
              <tr key={c.id} className="hover:bg-slate-800/30">
                <td className="px-4 py-2.5">
                  <div className="font-medium text-slate-100">{c.fund}</div>
                  <div className="text-[10px] text-slate-500">{c.manager}</div>
                </td>
                <td className="px-4 py-2.5 text-slate-300">{fmtDate(c.dueDate)}<div className="text-[10px] text-slate-500">{relativeTime(c.dueDate)}</div></td>
                <td className="px-4 py-2.5 text-right mono text-slate-100">{inrCr(c.amount)}</td>
                <td className="px-4 py-2.5 text-slate-400">{c.purpose}</td>
                <td className="px-4 py-2.5 text-center">
                  <Pill tone={c.probability === "Confirmed" ? "gain" : c.probability === "Expected" ? "warn" : "default"}>{c.probability}</Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="mt-5" title="Commitments" subtitle="Called %, NAV and multiples across the private-markets book" pad={false}>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-slate-800">
              <tr>
                <th className="label-xs px-4 py-2 text-left font-medium">Fund</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Committed</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Drawn</th>
                <th className="label-xs px-4 py-2 text-right font-medium">Undrawn</th>
                <th className="label-xs px-4 py-2 text-right font-medium">NAV</th>
                <th className="label-xs px-4 py-2 text-right font-medium">TVPI</th>
                <th className="label-xs px-4 py-2 text-left font-medium">Called</th>
                <th className="label-xs px-4 py-2 text-left font-medium">Entity</th>
                <th className="label-xs px-4 py-2 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {MOCK_COMMITMENTS.map((c) => {
                const calledPct = (c.drawn / c.committed) * 100;
                const tvpi = (c.nav + c.distributed) / c.drawn;
                return (
                  <tr key={c.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-100">{c.fund}</div>
                      <div className="text-[10px] text-slate-500">{c.manager} · {c.vintage} · {c.strategy}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right mono text-slate-200">{inrCr(c.committed)}</td>
                    <td className="px-4 py-2.5 text-right mono text-slate-300">{inrCr(c.drawn)}</td>
                    <td className="px-4 py-2.5 text-right mono text-slate-300">{inrCr(c.committed - c.drawn)}</td>
                    <td className="px-4 py-2.5 text-right mono text-slate-100">{inrCr(c.nav)}</td>
                    <td className="px-4 py-2.5 text-right mono text-gain">{tvpi.toFixed(2)}×</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
                          <div className="h-full bg-gold-500/70" style={{ width: `${calledPct}%` }} />
                        </div>
                        <span className="mono text-[11px] text-slate-400">{calledPct.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{c.familyMember}</td>
                    <td className="px-4 py-2.5 text-center"><Pill tone={c.status === "Harvesting" ? "gain" : c.status === "Investing" ? "info" : "default"}>{c.status}</Pill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-5" title="Recent distributions" pad={false}>
        <table className="min-w-full">
          <thead className="border-b border-slate-800">
            <tr>
              <th className="label-xs px-4 py-2 text-left font-medium">Fund</th>
              <th className="label-xs px-4 py-2 text-left font-medium">Date</th>
              <th className="label-xs px-4 py-2 text-left font-medium">Kind</th>
              <th className="label-xs px-4 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 text-sm">
            {[...MOCK_DISTRIBUTIONS].sort((a, b) => +new Date(b.date) - +new Date(a.date)).map((d) => (
              <tr key={d.id} className="hover:bg-slate-800/30">
                <td className="px-4 py-2.5 text-slate-200">{d.fund}</td>
                <td className="px-4 py-2.5 text-slate-400">{fmtDate(d.date)}</td>
                <td className="px-4 py-2.5"><Pill tone="default">{d.kind}</Pill></td>
                <td className="px-4 py-2.5 text-right mono text-gain">{inrCr(d.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-slate-800 bg-ink-700/40 px-3 py-2">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="mono text-sm text-slate-100">{value}</span>
    </div>
  );
}
