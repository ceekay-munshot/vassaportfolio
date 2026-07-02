import {
  Plug,
  RefreshCw,
  FileStack,
  Clock,
  FileText,
  Sheet,
  Image as ImageIcon,
  FileAudio,
  NotebookText,
  Mail,
  ArrowUpRight,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { StatTile } from "@/components/StatTile";
import {
  DATA_CONNECTORS,
  INBOUND_DOCS,
  type ConnectorStatus,
  type InboundDoc,
} from "@/data/mockDataSources";

const ACCENT_DOT: Record<string, string> = {
  gold: "bg-gold-500",
  sky: "bg-sky-400",
  emerald: "bg-emerald-400",
  violet: "bg-violet-400",
  amber: "bg-amber-400",
  slate: "bg-slate-400",
};

const STATUS_TONE: Record<ConnectorStatus, "gain" | "info" | "warn" | "default"> = {
  Connected: "gain",
  Syncing: "info",
  "Action needed": "warn",
  Available: "default",
};

const FORMAT_ICON: Record<InboundDoc["format"], any> = {
  PDF: FileText,
  Excel: Sheet,
  Image: ImageIcon,
  Transcript: FileAudio,
  Note: NotebookText,
  Email: Mail,
};

export function DataSources() {
  const connected = DATA_CONNECTORS.filter((c) => c.status === "Connected").length;
  const syncing = DATA_CONNECTORS.filter((c) => c.status === "Syncing").length;

  return (
    <div>
      <PageHeader
        eyebrow="Data"
        title="Data Sources & Integrations"
        subtitle="One consolidated front office. Artyan, custodian feeds, AMFI, NSE/BSE, Notion and a WhatsApp inbox flow in automatically — and every number traces back to its source."
        right={<Pill tone="info">Everything traces to source</Pill>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Connected sources" value={connected} sub={`${DATA_CONNECTORS.length} total adapters`} icon={<Plug className="h-4 w-4" />} />
        <StatTile label="Syncing now" value={syncing} sub="refreshing in the background" icon={<RefreshCw className="h-4 w-4" />} />
        <StatTile label="Documents ingested" value={INBOUND_DOCS.length} sub="PDF · Excel · image · transcript" icon={<FileStack className="h-4 w-4" />} />
        <StatTile label="Freshness" value="12 min" sub="since last consolidation" icon={<Clock className="h-4 w-4" />} />
      </div>

      <Card className="mt-5" pad>
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-gold-500/30 bg-gold-500/10 text-gold-400">
            <Plug className="h-4 w-4" />
          </div>
          <p className="text-sm text-slate-300">
            Plug the family's existing rails straight in — <span className="text-slate-100">Artyan</span> (your CA's back office) via API,
            custodian and AMC emails, NSE/BSE filings and AMFI NAVs, your <span className="text-slate-100">Notion</span> notes, and a
            dedicated WhatsApp inbox at <span className="mono text-gold-400">tech@glowventures.in</span>. PDFs, Excel sheets and even
            photos of handwritten notes are parsed on arrival, and each figure links back to the document it came from for reconciliation.
          </p>
        </div>
      </Card>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DATA_CONNECTORS.map((c) => (
          <div key={c.id} className="card p-4 transition-colors hover:border-gold-400/40">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${ACCENT_DOT[c.accent] ?? "bg-slate-400"}`} />
                <div>
                  <div className="h-section">{c.name}</div>
                  <div className="label-xs">{c.kind}</div>
                </div>
              </div>
              <Pill tone={STATUS_TONE[c.status]}>{c.status}</Pill>
            </div>
            <div className="mt-3 space-y-1 text-[11px]">
              <Row label="Last sync" value={c.lastSync} />
              <Row label="Refresh" value={c.cadence} />
              <Row label="Covers" value={c.records} />
            </div>
            <p className="mt-3 text-xs text-slate-400">{c.note}</p>
            <button className="btn-ghost mt-3 w-full text-xs active:scale-[0.97]">
              {c.status === "Available" ? "Connect" : "View source"}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <Card className="mt-5" title="Recently ingested" subtitle="Documents parsed across your connectors — each linked to a holding, fund or entity" pad={false}>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-slate-800">
              <tr>
                <th className="label-xs px-4 py-2 text-left font-medium">Document</th>
                <th className="label-xs px-4 py-2 text-left font-medium">Format</th>
                <th className="label-xs px-4 py-2 text-left font-medium">Source</th>
                <th className="label-xs px-4 py-2 text-left font-medium">Received</th>
                <th className="label-xs px-4 py-2 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {INBOUND_DOCS.map((d) => {
                const Icon = FORMAT_ICON[d.format];
                return (
                  <tr key={d.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-100">{d.title}</div>
                      <div className="text-[10px] text-slate-500">linked to {d.linkedTo}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-ink-700 px-2 py-0.5 text-xs text-slate-300">
                        <Icon className="h-3 w-3" />
                        {d.format}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{d.source}</td>
                    <td className="px-4 py-2.5 text-slate-400">{d.received}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Pill tone={d.status === "Parsed" ? "gain" : d.status === "Parsing" ? "info" : "warn"}>{d.status}</Pill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-300">{value}</span>
    </div>
  );
}
