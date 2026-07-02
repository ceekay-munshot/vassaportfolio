// Upload Portfolio — simple two-step flow.
//
// 1. Drop a file → parser stages the result in context.
// 2. A friendly confirmation card appears with one primary action
//    ("Open Dashboard"). Everything technical (column mappings, totals,
//    full row errors, full diff) is collapsed behind a single
//    "Show details" toggle so non-technical users see a clean success
//    state by default.

import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Briefcase,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { usePortfolio } from "@/context/PortfolioContext";
import { SAMPLE_CSV } from "@/lib/portfolioParser";
import { fmtCurrency, fmtDateTime } from "@/lib/format";
import type {
  ChangeSummary,
  FieldMappingTrace,
  ParseError,
  ParseWarning,
} from "@/lib/portfolioTypes";
import { totalChangeCount } from "@/lib/portfolioDiff";

export function UploadPortfolio() {
  const navigate = useNavigate();
  const {
    portfolio,
    staged,
    stagingError,
    isParsing,
    parseFile,
    commitStagedUpload,
    cancelStagedUpload,
  } = usePortfolio();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(f: File) {
    await parseFile(f);
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "family_office_portfolio_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCommit() {
    const committed = commitStagedUpload();
    if (committed) navigate("/cio");
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Setup"
        title="Upload Portfolio"
        subtitle="Drop a CSV or Excel file. We'll figure out the columns and activate your dashboard."
      />

      {/* Drop zone — hidden once a file is staged so the success card has full focus */}
      {!staged && (
        <Card className="mb-5">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center transition-colors ${
              dragOver
                ? "border-gold-500 bg-gold-500/5"
                : "border-slate-700 hover:border-slate-600 hover:bg-slate-800/30"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                if (inputRef.current) inputRef.current.value = "";
              }}
            />
            <div className="grid h-14 w-14 place-items-center rounded-full border border-gold-500/30 bg-gold-500/10 text-gold-400">
              {isParsing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-100">
              {isParsing ? "Reading your file…" : "Drag a file here, or browse"}
            </h3>
            <p className="mt-1 max-w-md text-xs text-slate-400">
              CSV or Excel. Columns like Ticker, Company, Qty, CMP, Avg Cost are detected automatically.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="btn-primary"
                disabled={isParsing}
              >
                Browse files
              </button>
              <button type="button" onClick={downloadSample} className="btn-ghost">
                <Download className="h-4 w-4" />
                Download sample
              </button>
            </div>
            {stagingError && (
              <div className="mt-4 flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                <XCircle className="h-3.5 w-3.5" />
                {stagingError}
              </div>
            )}
          </label>
        </Card>
      )}

      {/* Friendly post-parse confirmation */}
      {staged && (
        <StagingReview
          warnings={staged.parse.warnings}
          errors={staged.parse.errors}
          mappings={staged.parse.fieldMappings}
          holdingsCount={staged.parse.holdings.length}
          rawRowCount={staged.parse.rawRowCount}
          totalValue={staged.parse.totalValue}
          baseCurrency={staged.parse.baseCurrency}
          fileName={staged.parse.fileName}
          changeSummary={staged.changeSummary}
          hasPrevious={!!portfolio}
          sectorCount={new Set(staged.parse.holdings.map((h) => h.sector)).size}
          onCommit={handleCommit}
          onCancel={cancelStagedUpload}
        />
      )}

      {!staged && portfolio && (
        <Card pad>
          <div className="flex items-start gap-3">
            <Briefcase className="mt-0.5 h-5 w-5 text-gold-400" />
            <div className="text-xs text-slate-300">
              <div className="font-medium text-slate-200">Currently loaded: {portfolio.fileName}</div>
              <div className="mt-0.5 text-slate-400">
                {portfolio.holdings.length} holdings · uploaded {fmtDateTime(portfolio.uploadedAt)}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Staging review — friendly success state, with details collapsed.
// ---------------------------------------------------------------------------

function StagingReview({
  warnings,
  errors,
  mappings,
  holdingsCount,
  rawRowCount,
  totalValue,
  baseCurrency,
  fileName,
  changeSummary,
  hasPrevious,
  sectorCount,
  onCommit,
  onCancel,
}: {
  warnings: ParseWarning[];
  errors: ParseError[];
  mappings: FieldMappingTrace[];
  holdingsCount: number;
  rawRowCount: number;
  totalValue: number;
  baseCurrency: string;
  fileName: string;
  changeSummary: ChangeSummary;
  hasPrevious: boolean;
  sectorCount: number;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const changes = totalChangeCount(changeSummary);
  const usableSectorCount = sectorCount > 0 ? sectorCount : 0;

  return (
    <Card className="overflow-hidden">
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-100">Your portfolio is ready</h2>
        <p className="mt-1 truncate text-xs text-slate-500">{fileName}</p>

        <div className="mx-auto mt-5 inline-flex items-center gap-6 rounded-lg border border-slate-800 bg-slate-800/30 px-5 py-3">
          <Stat label="Holdings" value={holdingsCount} />
          <div className="h-8 w-px bg-slate-700/60" />
          <Stat label="Total value" value={fmtCurrency(totalValue, baseCurrency, { compact: true })} />
          {usableSectorCount > 0 && (
            <>
              <div className="h-8 w-px bg-slate-700/60" />
              <Stat label="Sectors" value={usableSectorCount} />
            </>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button onClick={onCommit} className="btn-primary" disabled={holdingsCount === 0}>
            Open Dashboard
            <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={onCancel} className="btn-ghost">
            Choose a different file
          </button>
        </div>
      </div>

      {/* Inline status notes — only render the ones that matter */}
      <div className="mt-6 space-y-2">
        {errors.length > 0 && (
          <NoteRow
            tone="error"
            icon={<XCircle className="h-4 w-4" />}
            summary={`${errors.length} ${errors.length === 1 ? "row was" : "rows were"} skipped`}
          >
            <ul className="space-y-0.5 text-[11px] text-rose-200/90">
              {errors.slice(0, 8).map((e, i) => (
                <li key={i}>
                  Row {e.row} — {e.message}
                </li>
              ))}
              {errors.length > 8 && (
                <li className="text-rose-300/70">… and {errors.length - 8} more</li>
              )}
            </ul>
          </NoteRow>
        )}

        {warnings.length > 0 && (
          <NoteRow
            tone="warn"
            icon={<AlertTriangle className="h-4 w-4" />}
            summary={summarizeWarnings(warnings)}
          >
            <ul className="space-y-0.5 text-[11px] text-amber-200/90">
              {warnings.map((w, i) => (
                <li key={i}>{w.message}</li>
              ))}
            </ul>
          </NoteRow>
        )}

        {hasPrevious && changes > 0 && (
          <NoteRow
            tone="info"
            icon={<Sparkles className="h-4 w-4" />}
            summary={summarizeChanges(changeSummary)}
          >
            <ChangeSummaryCompact summary={changeSummary} />
          </NoteRow>
        )}

        {hasPrevious && changes === 0 && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-200">
            <CheckCircle2 className="mr-1.5 inline h-3 w-3" />
            No changes vs. your previous upload.
          </div>
        )}
      </div>

      {/* Technical details — opt-in */}
      <div className="mt-6 border-t border-slate-800 pt-4">
        <button
          onClick={() => setShowDetails((v) => !v)}
          className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300"
        >
          {showDetails ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {showDetails ? "Hide" : "Show"} technical details
        </button>

        {showDetails && (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded-md border border-slate-800 bg-ink-700/30 p-3">
              <div className="label-xs mb-2">Column mapping</div>
              <ul className="space-y-0.5 text-[11px]">
                {mappings
                  .filter((m) => m.canonical !== "unmapped")
                  .map((m, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="mono text-slate-400">{m.source}</span>
                      <ChevronRight className="h-3 w-3 text-slate-600" />
                      <span className="mono text-gold-400">{m.canonical}</span>
                    </li>
                  ))}
              </ul>
            </div>
            <div className="rounded-md border border-slate-800 bg-ink-700/30 p-3">
              <div className="label-xs mb-2">Totals</div>
              <ul className="space-y-1 text-[11px]">
                <Row label="Holdings accepted" value={String(holdingsCount)} />
                <Row label="Rows in file" value={String(rawRowCount)} />
                <Row label="Rows skipped" value={String(rawRowCount - holdingsCount)} />
                <Row label="Total value" value={fmtCurrency(totalValue, baseCurrency, { compact: true })} />
              </ul>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-left">
      <div className="label-xs">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular text-slate-100">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="mono text-slate-200">{value}</span>
    </li>
  );
}

function NoteRow({
  tone,
  icon,
  summary,
  children,
}: {
  tone: "info" | "warn" | "error";
  icon: React.ReactNode;
  summary: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const styles =
    tone === "error"
      ? "border-rose-500/30 bg-rose-500/5 text-rose-200"
      : tone === "warn"
        ? "border-amber-500/30 bg-amber-500/5 text-amber-200"
        : "border-sky-500/30 bg-sky-500/5 text-sky-200";
  return (
    <div className={`rounded-md border ${styles}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs"
      >
        {icon}
        <span className="flex-1">{summary}</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

// Group seven raw warnings like "No 'sector' column found…" into a single
// human sentence: "Sector, classification, and status columns were missing —
// defaults applied. Market value and weight calculated."
function summarizeWarnings(ws: ParseWarning[]): string {
  const fieldNames = ws.map((w) => w.field).filter(Boolean) as string[];
  if (fieldNames.length === 0) return `${ws.length} parse note${ws.length === 1 ? "" : "s"}`;

  const friendly: Record<string, string> = {
    sector: "sector",
    coreSatellite: "classification",
    status: "status",
    geography: "region",
    assetClass: "asset class",
    benchmark: "benchmark",
  };
  const missing = fieldNames
    .filter((f) => f in friendly)
    .map((f) => friendly[f]);
  const computed = fieldNames.filter((f) => f === "marketValue" || f === "portfolioWeight");

  const parts: string[] = [];
  if (missing.length) parts.push(`${joinList(missing)} not provided — defaults applied`);
  if (computed.length) parts.push("market value and weight were calculated for you");

  if (!parts.length) return `${ws.length} parse note${ws.length === 1 ? "" : "s"}`;
  // Sentence case + period.
  const sentence = parts.join(" · ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function summarizeChanges(s: ChangeSummary): string {
  const parts: string[] = [];
  if (s.added.length) parts.push(`${s.added.length} added`);
  if (s.removed.length) parts.push(`${s.removed.length} removed`);
  if (s.quantityChanged.length) parts.push(`${s.quantityChanged.length} qty changed`);
  if (s.priceChanged.length) parts.push(`${s.priceChanged.length} price moved`);
  if (s.weightChanged.length) parts.push(`${s.weightChanged.length} weight shifted`);
  if (s.statusChanged.length) parts.push(`${s.statusChanged.length} status changed`);
  if (s.classificationChanged.length) parts.push(`${s.classificationChanged.length} reclassified`);
  return `Changes vs. last upload: ${parts.join(" · ")}`;
}

function ChangeSummaryCompact({ summary }: { summary: ChangeSummary }) {
  const sections = [
    { label: "Added", items: summary.added.map((a) => `${a.ticker} · ${a.companyName}`) },
    { label: "Removed", items: summary.removed.map((a) => `${a.ticker} · ${a.companyName}`) },
    {
      label: "Quantity",
      items: summary.quantityChanged.map((a) => `${a.ticker}: ${a.from} → ${a.to}`),
    },
    {
      label: "Price",
      items: summary.priceChanged.map(
        (a) => `${a.ticker}: ${a.from} → ${a.to} (${a.pctChange >= 0 ? "+" : ""}${a.pctChange.toFixed(1)}%)`,
      ),
    },
    {
      label: "Status",
      items: summary.statusChanged.map((a) => `${a.ticker}: ${a.from} → ${a.to}`),
    },
  ].filter((s) => s.items.length > 0);

  if (sections.length === 0) {
    return <div className="text-[11px] text-slate-400">No changes recorded.</div>;
  }
  return (
    <div className="space-y-2">
      {sections.map((s, i) => (
        <div key={i}>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">{s.label}</div>
          <ul className="mt-0.5 space-y-0.5 text-[11px] text-slate-300">
            {s.items.slice(0, 4).map((line, j) => (
              <li key={j}>{line}</li>
            ))}
            {s.items.length > 4 && <li className="text-slate-500">… and {s.items.length - 4} more</li>}
          </ul>
        </div>
      ))}
    </div>
  );
}
