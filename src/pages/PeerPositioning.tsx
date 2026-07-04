import { Fragment, type ReactNode, useState } from "react";
import { Users, TrendingUp, TrendingDown, Landmark, Building2, ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { usePortfolio } from "@/context/PortfolioContext";
import { fmtPct } from "@/lib/format";
import type { Holding } from "@/lib/portfolioTypes";
import peers from "@/data/peers.json";
import fundHolders from "@/data/fundHolders.json";

// ---- peers.json shape (produced by ingest/build_peers.py) ------------------
type Ownership = {
  asOf: string;
  promoter: number | null;
  fii: number | null;
  dii: number | null;      // DII total (already includes mutual funds)
  mf: number | null;       // mutual-fund slice of DII — the "who else holds this" the family asked for
  retail: number | null;
  others: number | null;
  institutional: number | null; // FII + DII = total institutional footprint
};
type PeerStock = {
  company: string;
  sid: string | null;
  sector?: string | null;
  ownership: Ownership | null;
  history: { q: string; mf: number | null; fii: number | null; dii: number | null; promoter: number | null }[];
  investors: string[];
};
type PeersFile = {
  asOf: { ownership: string | null };
  coverage: { stocks: number; withOwnership: number };
  sources: string[];
  notes: string[];
  investors: { name: string; holdsNV: string[]; portfolioSize: number }[];
  stocks: Record<string, PeerStock>;
};
const PEERS = peers as unknown as PeersFile;

// ---- fundHolders.json (produced by ingest/build_fund_holdings.py) ----------
// Per stock: how many funds among the major houses we track hold it, and the
// top ones by weight in the fund — the concrete "which funds hold my stocks".
type FundHolder = { amc: string; scheme: string; pct: number };
type FundOverlap = { amc: string; scheme: string; stocks: string[]; count: number; sumPct: number };
type FundHoldersFile = {
  asOf: string | null;
  amcsCovered: string[];
  schemesParsed: number;
  notes: string[];
  stocks: Record<string, { count: number; top: FundHolder[] }>;
  fundOverlap: FundOverlap[];
};
const FUNDS = fundHolders as unknown as FundHoldersFile;

const mv = (h: Holding) => h.marketValueBase ?? h.marketValue;
const n0 = (x: number | null | undefined) => (x == null ? 0 : x);
const pp = (x: number) => `${x > 0 ? "+" : ""}${x.toFixed(1)} pp`;

// Ownership bar segments. MF is pulled OUT of DII so mutual-fund ownership gets
// its own colour (the family's focus); "Other DII" is the rest (insurance, banks).
const SEGMENTS = [
  { key: "promoter", label: "Promoter", cls: "bg-slate-400" },
  { key: "fii", label: "FII", cls: "bg-violet-500" },
  { key: "mf", label: "Mutual funds", cls: "bg-blue-600" },
  { key: "otherDii", label: "Other DII", cls: "bg-sky-400" },
  { key: "retail", label: "Retail", cls: "bg-amber-400" },
  { key: "others", label: "Others", cls: "bg-slate-200" },
] as const;

function segmentsFor(o: Ownership) {
  const otherDii = Math.max(0, n0(o.dii) - n0(o.mf));
  return {
    promoter: n0(o.promoter), fii: n0(o.fii), mf: n0(o.mf),
    otherDii, retail: n0(o.retail), others: n0(o.others),
  } as Record<(typeof SEGMENTS)[number]["key"], number>;
}

// Positioning read from institutional footprint (FII + DII). Absolute bands so
// the label is stable month-to-month, not relative to whatever else you hold.
function positioning(inst: number): { label: string; cls: string } {
  if (inst >= 40) return { label: "Consensus", cls: "border-blue-500/40 text-blue-700" };
  if (inst >= 20) return { label: "Balanced", cls: "border-slate-300 text-slate-500" };
  return { label: "Contrarian", cls: "border-amber-500/40 text-amber-700" };
}

// Mutual-fund accumulation over the last ~4 quarters (are funds adding or trimming?).
function mfTrend(s: PeerStock): number | null {
  const h = s.history.filter((x) => x.mf != null);
  if (h.length < 2) return null;
  const latest = h[h.length - 1].mf!;
  const past = h[Math.max(0, h.length - 5)].mf!; // ~4 quarters back
  return latest - past;
}

export function PeerPositioning() {
  const { portfolio } = usePortfolio();
  const [expanded, setExpanded] = useState<string | null>(null); // ticker whose fund list is open
  if (!portfolio) return null;

  const equities = portfolio.holdings.filter((h) => h.vehicle !== "Mutual Fund");
  const keyOf = (h: Holding) => h.apiTicker ?? h.ticker;

  // True weight in the direct-equity book (share of total equity market value),
  // so every "Your weight" figure is the real number — covered or not.
  const totalEqMV = equities.reduce((s, h) => s + mv(h), 0);
  const rows = equities
    .map((h) => ({ h, key: keyOf(h), peer: PEERS.stocks[keyOf(h)] as PeerStock | undefined }))
    .map((r) => ({ ...r, o: r.peer?.ownership ?? null, weight: totalEqMV > 0 ? (mv(r.h) / totalEqMV) * 100 : 0 }));

  const covered = rows.filter((r) => r.o) as (typeof rows[number] & { o: Ownership })[];
  const uncovered = rows.filter((r) => !r.o);

  // Book-level averages, weighted by NV's actual position sizes and renormalized
  // over the names we can measure (ENRIN, uncovered, is excluded — not counted as 0).
  const coveredWeight = covered.reduce((s, r) => s + r.weight, 0) || 1;
  const wavg = (pick: (o: Ownership) => number) =>
    covered.reduce((s, r) => s + r.weight * pick(r.o), 0) / coveredWeight;
  const bookInst = wavg((o) => n0(o.institutional));
  const bookMF = wavg((o) => n0(o.mf));

  const ranked = [...covered].sort((a, b) => n0(b.o.institutional) - n0(a.o.institutional));
  const mostConsensus = ranked[0];
  const mostContrarian = ranked[ranked.length - 1];

  const investorHits = PEERS.investors.filter((i) => i.holdsNV.length > 0);
  const marqueeCount = investorHits.reduce((s, i) => s + i.holdsNV.length, 0);

  // Data-driven summary of the overlap (so it stays true when the monthly
  // ingest reruns — nothing about the specific investors/names is hardcoded).
  const overlapPairs = investorHits.flatMap((i) => i.holdsNV.map((t) => `${i.name} in ${t}`));
  const overlapSummary =
    overlapPairs.length === 0
      ? "None of the tracked marquee individual investors currently hold your names — expected for a largely largecap, institution-owned book."
      : `${overlapPairs.length === 1 ? "The one overlap" : `${overlapPairs.length} overlaps`}: ${overlapPairs.join("; ")}. These investors concentrate in small/midcaps, so overlap lands on your smaller, less institution-owned names rather than your largecaps.`;

  // Institutional accumulation vs distribution over the last ~year, from the
  // 6-quarter ownership history (FII + DII). Positive = smart money adding.
  const instFlows = covered
    .map((r) => {
      const h = r.peer!.history.filter((x) => x.fii != null || x.dii != null);
      if (h.length < 2) return null;
      const inst = (x: { fii: number | null; dii: number | null }) => n0(x.fii) + n0(x.dii);
      return { key: r.key, delta: inst(h[h.length - 1]) - inst(h[Math.max(0, h.length - 5)]) };
    })
    .filter((f): f is { key: string; delta: number } => f != null)
    .sort((a, b) => b.delta - a.delta);
  const accumulating = instFlows.filter((f) => f.delta >= 0.5).slice(0, 6);
  const distributing = instFlows.filter((f) => f.delta <= -0.5).slice(-6).reverse();

  return (
    <div className="pb-8">
      <PageHeader
        eyebrow="Peer Comparison"
        title="Positioning"
        subtitle="Who else owns your book — ownership structure, the mutual funds holding each name, and marquee-investor overlap, from public filings. Are your names consensus institutional holdings or off-the-radar?"
        right={
          <span className="text-xs text-slate-500">
            Ownership as of {PEERS.asOf.ownership} · {PEERS.coverage.withOwnership}/{PEERS.coverage.stocks} covered
          </span>
        }
      />

      {/* KPI tiles */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          icon={<Landmark className="h-4 w-4" />}
          label="Book institutional ownership"
          value={fmtPct(bookInst, { decimals: 1 })}
          sub={`Weighted by your positions · ${fmtPct(bookMF, { decimals: 1 })} held by mutual funds`}
        />
        <Tile
          icon={<TrendingUp className="h-4 w-4" />}
          label="Most consensus name"
          value={mostConsensus?.key ?? "—"}
          sub={mostConsensus ? `${fmtPct(n0(mostConsensus.o.institutional), { decimals: 0 })} institutional` : undefined}
        />
        <Tile
          icon={<TrendingDown className="h-4 w-4" />}
          label="Most contrarian name"
          value={mostContrarian?.key ?? "—"}
          sub={mostContrarian ? `${fmtPct(n0(mostContrarian.o.institutional), { decimals: 0 })} institutional · ${fmtPct(n0(mostContrarian.o.promoter), { decimals: 0 })} promoter` : undefined}
        />
        <Tile
          icon={<Users className="h-4 w-4" />}
          label="Marquee-investor overlap"
          value={`${marqueeCount} name${marqueeCount === 1 ? "" : "s"}`}
          sub={`across ${PEERS.investors.length} tracked investors`}
        />
      </div>

      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500">
        <span className="font-medium text-slate-500">Ownership split:</span>
        {SEGMENTS.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm ${s.cls}`} />
            {s.label}
          </span>
        ))}
      </div>

      {/* Main table — sorted by institutional footprint (crowdedness) */}
      <Card pad={false}>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800/70">
                <th className="label-xs px-4 py-2.5 text-left font-medium">Holding</th>
                <th className="label-xs px-3 py-2.5 text-right font-medium">Your weight</th>
                <th className="label-xs px-4 py-2.5 text-left font-medium">Who owns it</th>
                <th className="label-xs px-3 py-2.5 text-right font-medium">Mutual funds</th>
                <th className="label-xs px-3 py-2.5 text-right font-medium">Institutional</th>
                <th className="label-xs px-3 py-2.5 text-center font-medium">Read</th>
                <th className="label-xs px-4 py-2.5 text-left font-medium">Marquee holders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {ranked.map((r) => {
                const seg = segmentsFor(r.o);
                const trend = mfTrend(r.peer!);
                const pos = positioning(n0(r.o.institutional));
                const funds = FUNDS.stocks[r.key];
                const isOpen = expanded === r.key;
                return (
                  <Fragment key={r.key}>
                    <tr className="hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <div className="mono font-semibold text-slate-100">{r.key}</div>
                        <div className="text-[11px] text-slate-500">{r.peer?.company}</div>
                      </td>
                      <td className="px-3 py-3 text-right mono text-slate-300">{fmtPct(r.weight, { decimals: 1 })}</td>
                      <td className="px-4 py-3">
                        <OwnershipBar seg={seg} />
                        <div className="mt-1 text-[10px] text-slate-500">
                          {n0(r.o.promoter) > 0 ? `${fmtPct(n0(r.o.promoter), { decimals: 0 })} promoter` : "no promoter"}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="mono text-slate-100">{fmtPct(n0(r.o.mf), { decimals: 1 })}</span>
                        {trend != null && Math.abs(trend) >= 0.5 && (
                          <div className={`text-[10px] ${trend > 0 ? "text-gain" : "text-loss"}`}>
                            {trend > 0 ? "▲" : "▼"} {pp(trend)} 1y
                          </div>
                        )}
                        {funds && funds.count > 0 && (
                          <button
                            onClick={() => setExpanded(isOpen ? null : r.key)}
                            className="ml-auto mt-0.5 flex items-center gap-0.5 text-[10px] font-medium text-blue-600 hover:underline"
                          >
                            {funds.count} fund{funds.count === 1 ? "" : "s"}
                            <ChevronDown className={`h-2.5 w-2.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right mono text-slate-300">{fmtPct(n0(r.o.institutional), { decimals: 1 })}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${pos.cls}`}>
                          {pos.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.peer && r.peer.investors.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {r.peer.investors.map((inv) => (
                              <span key={inv} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-500/20">
                                <Users className="h-2.5 w-2.5" /> {inv}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                    {isOpen && funds && (
                      <tr className="bg-blue-50/40">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="mb-2 text-[11px] font-medium text-slate-500">
                            Funds holding <span className="mono text-slate-300">{r.key}</span> — top {funds.top.length} of {funds.count} by weight in the fund
                            <span className="text-slate-400"> (among the major houses we track)</span>
                          </div>
                          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                            {funds.top.map((f, i) => (
                              <div key={i} className="flex items-center justify-between gap-3 border-b border-slate-200/50 py-1 text-[12px]">
                                <span className="truncate text-slate-300" title={f.scheme}>{f.scheme}</span>
                                <span className="shrink-0 mono text-slate-500">{f.pct.toFixed(1)}%</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

              {/* Honest coverage gaps (e.g. ENRIN — too newly listed to be covered) */}
              {uncovered.map((r) => (
                <tr key={r.key} className="bg-slate-50/40">
                  <td className="px-4 py-3">
                    <div className="mono font-semibold text-slate-400">{r.key}</div>
                    <div className="text-[11px] text-slate-400">{r.peer?.company ?? r.h.companyName}</div>
                  </td>
                  <td className="px-3 py-3 text-right mono text-slate-400">{fmtPct(r.weight, { decimals: 1 })}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-400" colSpan={5}>
                    Awaiting first institutional disclosure — recently listed, not yet in public shareholding data.
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* v2: institutional flows + fund crowding */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Institutional flows · 1 year" subtitle="Where funds & FIIs added to or trimmed your names (FII + DII, vs a year ago)">
          {accumulating.length === 0 && distributing.length === 0 ? (
            <p className="text-sm text-slate-400">Not enough history to show flows.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                  <TrendingUp className="h-3.5 w-3.5" /> Accumulating
                </div>
                {accumulating.length ? accumulating.map((f) => (
                  <div key={f.key} className="flex items-center justify-between border-b border-slate-200/50 py-1 text-[13px]">
                    <span className="mono text-slate-200">{f.key}</span>
                    <span className="mono text-gain">{pp(f.delta)}</span>
                  </div>
                )) : <div className="py-1 text-[12px] text-slate-400">—</div>}
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-rose-500">
                  <TrendingDown className="h-3.5 w-3.5" /> Trimming
                </div>
                {distributing.length ? distributing.map((f) => (
                  <div key={f.key} className="flex items-center justify-between border-b border-slate-200/50 py-1 text-[13px]">
                    <span className="mono text-slate-200">{f.key}</span>
                    <span className="mono text-loss">{pp(f.delta)}</span>
                  </div>
                )) : <div className="py-1 text-[12px] text-slate-400">—</div>}
              </div>
            </div>
          )}
        </Card>

        <Card title="Fund crowding" subtitle="Single funds holding several of your names — a shared holder means correlated exit risk">
          {FUNDS.fundOverlap.length > 0 ? (
            <div className="space-y-1.5">
              {FUNDS.fundOverlap.slice(0, 7).map((f) => (
                <div key={`${f.amc}-${f.scheme}`} className="flex items-center justify-between gap-3 border-b border-slate-200/50 py-1.5">
                  <span className="truncate text-[12.5px] text-slate-300" title={f.scheme}>{f.scheme}</span>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    {f.stocks.slice(0, 6).map((t) => (
                      <span key={t} className="mono rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">{t}</span>
                    ))}
                    {f.stocks.length > 6 && <span className="text-[10px] text-slate-400">+{f.stocks.length - 6}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No fund holds three or more of your names.</p>
          )}
        </Card>
      </div>

      {/* Marquee investor overlap */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Marquee investor overlap" subtitle={`Your book checked against ${PEERS.investors.length} well-known individual investors`}>
          {investorHits.length > 0 ? (
            <div className="space-y-2">
              {investorHits.map((i) => (
                <div key={i.name} className="flex items-center justify-between rounded-lg border border-slate-200/70 px-3 py-2">
                  <div>
                    <div className="text-sm font-medium text-slate-200">{i.name}</div>
                    <div className="text-[11px] text-slate-500">{i.portfolioSize} disclosed holdings</div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {i.holdsNV.map((t) => (
                      <span key={t} className="mono rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-500/20">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No overlap found.</p>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{overlapSummary}</p>
        </Card>

        <Card title="What this reads" subtitle="How to use it">
          <ul className="space-y-2.5 text-[13px] text-slate-300">
            <li className="flex gap-2"><Building2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /><span><b className="text-slate-200">Consensus</b> names (≥40% institutional) are crowded — well-owned, well-researched, less edge left.</span></li>
            <li className="flex gap-2"><TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><span><b className="text-slate-200">Contrarian</b> names (&lt;20%) are off the institutional radar — more room to re-rate, but you're early/alone.</span></li>
            <li className="flex gap-2"><TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>The <b className="text-slate-200">1-year MF arrow</b> shows whether funds are adding to or trimming each name.</span></li>
          </ul>
        </Card>
      </div>

      {/* Sources / honesty footnote */}
      <div className="mt-4 space-y-1 text-[11px] leading-relaxed text-slate-500">
        {PEERS.sources.map((s) => <div key={s}>· {s}</div>)}
        {FUNDS.amcsCovered.length > 0 && (
          <div>
            · Fund holders — {FUNDS.schemesParsed} equity schemes across {FUNDS.amcsCovered.length} major houses
            ({FUNDS.amcsCovered.join(", ")}), from official AMC monthly disclosures (as of {FUNDS.asOf}).
          </div>
        )}
        <div className="pt-1">
          {PEERS.notes.join(" ")} {FUNDS.notes[0]}
        </div>
      </div>
    </div>
  );
}

function OwnershipBar({ seg }: { seg: Record<(typeof SEGMENTS)[number]["key"], number> }) {
  const total = SEGMENTS.reduce((s, x) => s + seg[x.key], 0) || 100;
  return (
    <div className="flex h-3 w-full min-w-[180px] overflow-hidden rounded-sm bg-slate-100">
      {SEGMENTS.map((s) => {
        const w = (seg[s.key] / total) * 100;
        if (w <= 0) return null;
        return (
          <div
            key={s.key}
            className={s.cls}
            style={{ width: `${w}%` }}
            title={`${s.label}: ${seg[s.key].toFixed(1)}%`}
          />
        );
      })}
    </div>
  );
}

function Tile({ icon, label, value, sub }: { icon?: ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card pad>
      <div className="flex items-center gap-1.5 label-xs">
        {icon && <span className="text-gold-500">{icon}</span>}
        {label}
      </div>
      <div className="mt-1 font-display text-2xl text-slate-100">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>}
    </Card>
  );
}
