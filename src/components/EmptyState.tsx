// Premium empty state shown when a portfolio-dependent route is opened
// without an active portfolio. Renders the upload CTA plus 4 disabled
// preview cards that telegraph what comes after upload.

import { Link } from "react-router-dom";
import {
  Upload,
  LineChart,
  Layers,
  ShieldAlert,
  FileText,
  Lock,
  Sparkles,
} from "lucide-react";

const PREVIEWS = [
  {
    title: "Portfolio Monitor",
    description: "Position-level table — weights, P&L, sector, region.",
    icon: LineChart,
    body: (
      <div className="space-y-2">
        {[68, 52, 41, 34, 28].map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2.5 w-14 rounded bg-slate-700/60" />
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gold-500/30" style={{ width: `${w}%` }} />
            </div>
            <div className="h-2.5 w-10 rounded bg-slate-700/60" />
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "Core vs Satellite",
    description: "Sleeve mix vs. IC target. Drift detection.",
    icon: Layers,
    body: (
      <div className="flex items-end justify-center gap-3 py-2">
        <div className="grid h-20 w-20 place-items-center rounded-full border-[10px] border-slate-700 border-r-gold-500/40 border-t-gold-500/40">
          <div className="text-xs text-slate-500 mono">70/30</div>
        </div>
        <div className="space-y-1.5">
          <div className="h-2 w-24 rounded bg-slate-700/60" />
          <div className="h-2 w-20 rounded bg-slate-700/40" />
          <div className="h-2 w-16 rounded bg-slate-700/30" />
        </div>
      </div>
    ),
  },
  {
    title: "Risk & Performance",
    description: "Sharpe, drawdown, vol, alpha vs. benchmark.",
    icon: ShieldAlert,
    body: (
      <div className="flex h-20 items-end gap-1.5">
        {[36, 52, 28, 64, 48, 72, 58, 46, 68, 80, 62, 74].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-gold-500/25"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    ),
  },
  {
    title: "Broker Research Correlation",
    description: "Street notes mapped to your holdings.",
    icon: FileText,
    body: (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded border border-slate-800 bg-slate-800/30 p-2">
            <div className="mb-1 flex items-center gap-2">
              <div className="h-2 w-12 rounded bg-slate-700/60" />
              <div className="h-2 w-8 rounded bg-gold-500/30" />
            </div>
            <div className="h-1.5 w-full rounded bg-slate-800" />
            <div className="mt-1 h-1.5 w-3/4 rounded bg-slate-800" />
          </div>
        ))}
      </div>
    ),
  },
] as const;

export function EmptyState() {
  return (
    <div>
      <div className="card relative overflow-hidden p-8 md:p-12">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold-500/5 blur-3xl" />
        <div className="relative flex flex-col items-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl border border-gold-500/30 bg-gold-500/10 text-gold-400 shadow-glow">
            <Upload className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-100">
            Upload your portfolio to activate the family office dashboard
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Every analytic on this dashboard is computed against your live holdings. Drop a CSV or XLSX
            from your custodian, or load the sample to explore the cockpit. Nothing leaves your browser.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Link to="/upload" className="btn-primary">
              <Upload className="h-4 w-4" />
              Upload Portfolio
            </Link>
            <Link to="/upload" className="btn-ghost">
              <Sparkles className="h-4 w-4" />
              See sample schema
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2 px-1">
          <Lock className="h-3.5 w-3.5 text-slate-500" />
          <span className="label-xs">What unlocks after upload</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PREVIEWS.map((p) => (
            <DisabledPreviewCard key={p.title} {...p} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DisabledPreviewCard({
  title,
  description,
  icon: Icon,
  body,
}: {
  title: string;
  description: string;
  icon: any;
  body: React.ReactNode;
}) {
  return (
    <div
      className="card relative overflow-hidden opacity-70 transition-opacity hover:opacity-90"
      title="Upload portfolio first"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-900/60" />
      <div className="relative p-4">
        <div className="flex items-start justify-between">
          <div className="grid h-8 w-8 place-items-center rounded-md border border-slate-700 bg-ink-700 text-slate-400">
            <Icon className="h-4 w-4" />
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[10px] font-medium text-slate-500">
            <Lock className="h-2.5 w-2.5" />
            Locked
          </span>
        </div>
        <h3 className="mt-3 text-sm font-semibold text-slate-200">{title}</h3>
        <p className="mt-1 text-[11px] text-slate-500">{description}</p>
        <div className="mt-4 select-none filter blur-[0.5px]">{body}</div>
      </div>
    </div>
  );
}
