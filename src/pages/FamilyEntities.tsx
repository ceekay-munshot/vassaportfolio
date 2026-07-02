import { chart } from "@/theme/tokens";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Users, Building2, UserCheck, Wallet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { StatTile } from "@/components/StatTile";
import { usePortfolio } from "@/context/PortfolioContext";
import {
  activeOf,
  mvBase,
  familyOf,
  vehicleOf,
  bucketBy,
  allocationBucketOf,
  ALLOCATION_BUCKETS,
  type AllocationBucket,
} from "@/lib/portfolioAnalytics";
import { changeColor, fmtPct } from "@/lib/format";
import { FAMILY_TARGETS, targetFor } from "@/data/mockFamilyTargets";
import { chartTooltipStyle, chartTooltipLabelStyle, chartTooltipItemStyle } from "@/lib/chartTheme";

const BUCKET_COLOR: Record<AllocationBucket, string> = {
  Equity: chart.primary,
  "Fixed Income": chart.categorical[1],
  Gold: chart.categorical[9],
  "Real Estate": chart.gain,
  "Private & Alternatives": chart.categorical[3],
};

export function FamilyEntities() {
  const { portfolio, fmtFromBase } = usePortfolio();
  const [scope, setScope] = useState<string>("All entities");
  if (!portfolio) return null;

  const active = activeOf(portfolio);

  const members = useMemo(() => {
    const found = new Set(active.map(familyOf));
    const ordered = FAMILY_TARGETS.map((t) => t.member).filter((m) => found.has(m));
    for (const m of found) if (!ordered.includes(m)) ordered.push(m);
    return ordered;
  }, [active]);

  const totalMV = active.reduce((s, h) => s + mvBase(h), 0);

  // In-house vs advisor split.
  const mandate = useMemo(() => bucketBy(active, (h) => h.managerType ?? "In-house"), [active]);
  const inhouse = mandate.find((b) => b.key === "In-house");
  const advisor = mandate.find((b) => b.key === "Advisor");

  // Per-member actual allocation by bucket.
  const memberRows = useMemo(() => {
    return members.map((m) => {
      const hs = active.filter((h) => familyOf(h) === m);
      const mv = hs.reduce((s, h) => s + mvBase(h), 0);
      const actual: Record<AllocationBucket, number> = {
        Equity: 0, "Fixed Income": 0, Gold: 0, "Real Estate": 0, "Private & Alternatives": 0,
      };
      for (const h of hs) actual[allocationBucketOf(h)] += mvBase(h);
      const actualPct: Record<AllocationBucket, number> = { ...actual };
      ALLOCATION_BUCKETS.forEach((b) => (actualPct[b] = mv > 0 ? (actual[b] / mv) * 100 : 0));
      const target = targetFor(m)?.targets;
      let largestDrift = 0;
      let largestBucket: AllocationBucket = "Equity";
      ALLOCATION_BUCKETS.forEach((b) => {
        const d = actualPct[b] - (target?.[b] ?? 0);
        if (Math.abs(d) > Math.abs(largestDrift)) {
          largestDrift = d;
          largestBucket = b;
        }
      });
      return { member: m, mv, actualPct, holdings: hs, largestDrift, largestBucket };
    });
  }, [members, active]);

  const largestEntity = [...memberRows].sort((a, b) => b.mv - a.mv)[0];
  const advisorPct = totalMV > 0 ? ((advisor?.mv ?? 0) / totalMV) * 100 : 0;
  const inhousePct = totalMV > 0 ? ((inhouse?.mv ?? 0) / totalMV) * 100 : 0;

  const stackedData = memberRows.map((r) => {
    const row: Record<string, number | string> = { member: r.member };
    ALLOCATION_BUCKETS.forEach((b) => (row[b] = Number(r.actualPct[b].toFixed(1))));
    return row;
  });

  const selected = scope === "All entities" ? null : memberRows.find((r) => r.member === scope);
  const selectedTarget = selected ? targetFor(selected.member) : undefined;

  return (
    <div>
      <PageHeader
        eyebrow="Allocation"
        title="Family & Entities"
        subtitle="Slice the book by entity and family member — actual vs. each member's target asset allocation, and how much is run in-house vs. by advisors."
        right={<Pill tone="info">{members.length} entities</Pill>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Entities / members" value={members.length} sub="distinct owners in the book" icon={<Users className="h-4 w-4" />} />
        <StatTile label="Advisor-managed" value={`${advisorPct.toFixed(0)}%`} sub={fmtFromBase(advisor?.mv ?? 0, { compact: true })} icon={<UserCheck className="h-4 w-4" />} />
        <StatTile label="In-house" value={`${inhousePct.toFixed(0)}%`} sub={fmtFromBase(inhouse?.mv ?? 0, { compact: true })} icon={<Wallet className="h-4 w-4" />} />
        <StatTile label="Largest entity" value={largestEntity?.member ?? "—"} sub={largestEntity ? fmtFromBase(largestEntity.mv, { compact: true }) : "—"} icon={<Building2 className="h-4 w-4" />} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        {["All entities", ...members].map((m) => {
          const activeTab = scope === m;
          return (
            <button
              key={m}
              onClick={() => setScope(m)}
              className={[
                "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.97]",
                activeTab
                  ? "border-gold-500/40 bg-gold-500/10 text-gold-400"
                  : "border-slate-700 bg-ink-800/60 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200",
              ].join(" ")}
            >
              {m}
            </button>
          );
        })}
      </div>

      {!selected && (
        <>
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2" title="Asset allocation by entity" subtitle="Share of each member's NAV across asset buckets">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stackedData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke={chart.grid} strokeDasharray="2 4" vertical={false} />
                    <XAxis dataKey="member" stroke={chart.axis} fontSize={10} interval={0} angle={-12} textAnchor="end" height={48} />
                    <YAxis stroke={chart.axis} fontSize={11} tickFormatter={(v) => `${v}%`} />
                    <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} formatter={(v: number) => `${v.toFixed(1)}%`} />
                    {ALLOCATION_BUCKETS.map((b) => (
                      <Bar key={b} dataKey={b} stackId="x" fill={BUCKET_COLOR[b]} radius={b === "Private & Alternatives" ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
                {ALLOCATION_BUCKETS.map((b) => (
                  <span key={b} className="flex items-center gap-1.5 text-slate-400">
                    <span className="h-2 w-2 rounded-sm" style={{ background: BUCKET_COLOR[b] }} />
                    {b}
                  </span>
                ))}
              </div>
            </Card>

            <Card title="In-house vs advisor" subtitle="Who manages the capital — and the return each is delivering">
              <div className="relative h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "In-house", value: inhouse?.mv ?? 0 },
                        { name: "Advisor", value: advisor?.mv ?? 0 },
                      ]}
                      dataKey="value"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={2}
                      stroke="none"
                    >
                      <Cell fill={chart.benchmark} />
                      <Cell fill={chart.primary} />
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} formatter={(v: number) => fmtFromBase(v, { compact: true })} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                {[
                  { label: "In-house", b: inhouse, color: chart.benchmark },
                  { label: "Advisor", b: advisor, color: chart.primary },
                ].map(({ label, b, color }) => (
                  <div key={label} className="flex items-center justify-between gap-2 rounded-md border border-slate-800 bg-ink-700/40 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
                      <span className="text-slate-200">{label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="mono text-slate-300">{fmtFromBase(b?.mv ?? 0, { compact: true })}</span>
                      <span className={`mono ${changeColor(b?.returnPct ?? 0)}`}>{fmtPct(b?.returnPct ?? 0, { sign: true })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="mt-5" title="Entity allocation table" subtitle="Asset mix and biggest drift from target per member" pad={false}>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-slate-800">
                  <tr>
                    <th className="label-xs px-4 py-2 text-left font-medium">Entity</th>
                    <th className="label-xs px-4 py-2 text-right font-medium">NAV</th>
                    {ALLOCATION_BUCKETS.map((b) => (
                      <th key={b} className="label-xs px-4 py-2 text-right font-medium">{b}</th>
                    ))}
                    <th className="label-xs px-4 py-2 text-right font-medium">Largest drift</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-sm">
                  {memberRows.map((r) => (
                    <tr key={r.member} className="cursor-pointer hover:bg-slate-800/30" onClick={() => setScope(r.member)}>
                      <td className="px-4 py-2.5 font-medium text-slate-100">{r.member}</td>
                      <td className="px-4 py-2.5 text-right mono text-slate-200">{fmtFromBase(r.mv, { compact: true })}</td>
                      {ALLOCATION_BUCKETS.map((b) => (
                        <td key={b} className="px-4 py-2.5 text-right mono text-slate-300">{r.actualPct[b].toFixed(0)}%</td>
                      ))}
                      <td className={`px-4 py-2.5 text-right mono ${Math.abs(r.largestDrift) > 3 ? changeColor(r.largestDrift) : "text-slate-400"}`}>
                        {r.largestBucket} {fmtPct(r.largestDrift, { sign: true, decimals: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {selected && (
        <>
          <Card className="mt-5" title={`${selected.member} — expected vs actual`} subtitle={selectedTarget?.mandate ?? "Asset allocation vs target"} right={<Pill tone="info">{fmtFromBase(selected.mv, { compact: true })} NAV</Pill>}>
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={ALLOCATION_BUCKETS.map((b) => ({
                      bucket: b.length > 10 ? b.slice(0, 9) + "…" : b,
                      full: b,
                      Target: selectedTarget?.targets[b] ?? 0,
                      Actual: Number(selected.actualPct[b].toFixed(1)),
                    }))}
                    margin={{ top: 8, right: 8, left: -8, bottom: 24 }}
                  >
                    <CartesianGrid stroke={chart.grid} strokeDasharray="2 4" vertical={false} />
                    <XAxis dataKey="bucket" stroke={chart.axis} fontSize={10} interval={0} angle={-20} textAnchor="end" />
                    <YAxis stroke={chart.axis} fontSize={11} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      labelStyle={chartTooltipLabelStyle}
                      itemStyle={chartTooltipItemStyle}
                      formatter={(v: number) => `${v.toFixed(1)}%`}
                      labelFormatter={(_, p) => (p?.[0]?.payload?.full as string) ?? ""}
                    />
                    <Bar dataKey="Target" fill={chart.benchmarkBar} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Actual" fill={chart.primary} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {ALLOCATION_BUCKETS.map((b) => {
                  const t = selectedTarget?.targets[b] ?? 0;
                  const a = selected.actualPct[b];
                  const drift = a - t;
                  const within = Math.abs(drift) <= 3;
                  return (
                    <div key={b} className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-ink-700/40 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: BUCKET_COLOR[b] }} />
                        <span className="text-sm text-slate-200">{b}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="mono text-slate-300">{a.toFixed(0)}%</span>
                        <span className="text-slate-500">vs {t}%</span>
                        <Pill tone={within ? "gain" : drift > 0 ? "warn" : "loss"}>
                          {fmtPct(drift, { sign: true, decimals: 0 })}
                        </Pill>
                      </div>
                    </div>
                  );
                })}
                <p className="px-1 pt-1 text-[11px] text-slate-500">
                  {(() => {
                    const under = ALLOCATION_BUCKETS
                      .map((b) => ({ b, d: selected.actualPct[b] - (selectedTarget?.targets[b] ?? 0) }))
                      .filter((x) => x.d < -3)
                      .sort((a, c) => a.d - c.d)[0];
                    const over = ALLOCATION_BUCKETS
                      .map((b) => ({ b, d: selected.actualPct[b] - (selectedTarget?.targets[b] ?? 0) }))
                      .filter((x) => x.d > 3)
                      .sort((a, c) => c.d - a.d)[0];
                    const parts: string[] = [];
                    if (under) parts.push(`under-allocated to ${under.b} by ${Math.abs(under.d).toFixed(0)} pts`);
                    if (over) parts.push(`over-allocated to ${over.b} by ${over.d.toFixed(0)} pts`);
                    return parts.length ? `Rebalance: ${parts.join(" · ")}.` : "Within ±3 pts of every target — no rebalancing needed.";
                  })()}
                </p>
              </div>
            </div>
          </Card>

          <Card className="mt-5" title="Holdings by vehicle" subtitle={`How ${selected.member}'s capital is structured`} pad={false}>
            {selected.holdings.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-slate-500">No holdings under this entity.</div>
            ) : (
              <table className="min-w-full">
                <thead className="border-b border-slate-800">
                  <tr>
                    <th className="label-xs px-4 py-2 text-left font-medium">Vehicle</th>
                    <th className="label-xs px-4 py-2 text-right font-medium">Market value</th>
                    <th className="label-xs px-4 py-2 text-right font-medium">Weight</th>
                    <th className="label-xs px-4 py-2 text-right font-medium">Return</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-sm">
                  {bucketBy(selected.holdings, vehicleOf).map((b) => (
                    <tr key={b.key} className="hover:bg-slate-800/30">
                      <td className="px-4 py-2.5 text-slate-200">{b.key}</td>
                      <td className="px-4 py-2.5 text-right mono text-slate-200">{fmtFromBase(b.mv, { compact: true })}</td>
                      <td className="px-4 py-2.5 text-right mono text-slate-300">{(b.weight * 100).toFixed(1)}%</td>
                      <td className={`px-4 py-2.5 text-right mono ${changeColor(b.returnPct)}`}>{fmtPct(b.returnPct, { sign: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
