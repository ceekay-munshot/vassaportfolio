import { type ReactNode } from "react";
import { Activity, FileSpreadsheet, Landmark, Users, Layers, RefreshCw, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { usePortfolio } from "@/context/PortfolioContext";
import { fmtDate } from "@/lib/format";
import peers from "@/data/peers.json";
import fundHolders from "@/data/fundHolders.json";

const PEERS = peers as unknown as {
  asOf: { ownership: string | null };
  coverage: { stocks: number; withOwnership: number };
  investors: { name: string }[];
};
const FUNDS = fundHolders as unknown as {
  asOf: string | null;
  amcsCovered: string[];
  schemesParsed: number;
};

type Source = {
  icon: ReactNode;
  name: string;
  kind: string;
  powers: string;
  freshness: string;
  cadence: string;
  coverage: string;
  live: boolean;
};

export function DataSources() {
  const { portfolio } = usePortfolio();
  const holdings = portfolio?.holdings ?? [];
  const equityCount = holdings.filter((h) => h.vehicle !== "Mutual Fund").length;

  // Every source below is actually wired — nothing here is illustrative.
  const sources: Source[] = [
    {
      icon: <FileSpreadsheet className="h-4 w-4" />,
      name: "Your holdings & cost",
      kind: "Uploaded files",
      powers: "The book itself — every screen",
      freshness: portfolio ? fmtDate(portfolio.uploadedAt) : "—",
      cadence: "On upload",
      coverage: `${holdings.length} holdings · cost joined to custody by ISIN`,
      live: true,
    },
    {
      icon: <Activity className="h-4 w-4" />,
      name: "Munshot price API",
      kind: "Live market data",
      powers: "Prices, day change, 52-week & moving averages, valuation multiples",
      freshness: "Live on load",
      cadence: "Every visit",
      coverage: `${equityCount} listed holdings priced in real time`,
      live: true,
    },
    {
      icon: <Landmark className="h-4 w-4" />,
      name: "Tickertape",
      kind: "Shareholding pattern",
      powers: "Positioning — promoter / FII / DII / mutual-fund / retail ownership",
      freshness: PEERS.asOf.ownership ? `As of ${PEERS.asOf.ownership}` : "—",
      cadence: "Monthly refresh",
      coverage: `${PEERS.coverage.withOwnership}/${PEERS.coverage.stocks} stocks, 6 quarters of history`,
      live: true,
    },
    {
      icon: <Users className="h-4 w-4" />,
      name: "Trendlyne",
      kind: "Superstar shareholders",
      powers: "Positioning — marquee individual-investor overlap",
      freshness: "Latest disclosed quarter",
      cadence: "Monthly refresh",
      coverage: `${PEERS.investors.length} marquee investors checked against your book`,
      live: true,
    },
    {
      icon: <Layers className="h-4 w-4" />,
      name: "AMC monthly disclosures",
      kind: "Mutual-fund holdings",
      powers: "Positioning — which funds hold each of your stocks",
      freshness: FUNDS.asOf ? `As of ${FUNDS.asOf}` : "—",
      cadence: "Monthly refresh",
      coverage: `${FUNDS.schemesParsed} equity schemes across ${FUNDS.amcsCovered.length} fund houses`,
      live: true,
    },
  ];

  return (
    <div className="pb-8">
      <PageHeader
        eyebrow="Data"
        title="Data Sources"
        subtitle="Every number on this dashboard traces to a real, named source. Here's what's wired, what each one powers, and how fresh it is — nothing is illustrative."
        right={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 px-2.5 py-1 text-xs font-medium text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> {sources.filter((s) => s.live).length} sources live
          </span>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Live sources" value={`${sources.length}`} sub="all wired, no mock data" />
        <Tile label="Ownership as of" value={PEERS.asOf.ownership ?? "—"} sub="exchange filings (Tickertape)" />
        <Tile label="Fund houses" value={`${FUNDS.amcsCovered.length}`} sub={`${FUNDS.schemesParsed} equity schemes`} />
        <Tile label="Peer data refresh" value="Monthly" sub="automated GitHub Action" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {sources.map((s) => (
          <Card key={s.name} pad>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-blue-50 text-blue-600 ring-1 ring-blue-500/20">
                  {s.icon}
                </span>
                <div>
                  <div className="font-display text-[15px] text-slate-100">{s.name}</div>
                  <div className="label-xs">{s.kind}</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
              </span>
            </div>
            <p className="mt-3 text-[13px] text-slate-300">{s.powers}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200/60 pt-3 text-[11px]">
              <Meta label="Freshness" value={s.freshness} />
              <Meta label="Refresh" value={s.cadence} />
              <Meta label="Coverage" value={s.coverage} />
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-slate-200/70 px-4 py-3">
        <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
        <p className="text-[12px] leading-relaxed text-slate-400">
          The three peer sources (Tickertape, Trendlyne, AMC disclosures) are refreshed by a monthly GitHub Action that
          re-runs the ingests and opens a pull request with the updated data — so figures stay current without manual work,
          and every refresh is reviewable. Prices are fetched live on each visit. The book updates whenever you re-upload.
        </p>
      </div>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card pad>
      <div className="label-xs">{label}</div>
      <div className="mt-1 font-display text-2xl text-slate-100">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>}
    </Card>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-slate-500">{label}</div>
      <div className="mt-0.5 text-slate-300">{value}</div>
    </div>
  );
}
