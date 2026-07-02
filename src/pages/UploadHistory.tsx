import { useState } from "react";
import { Link } from "react-router-dom";
import {
  History,
  FileSpreadsheet,
  Sparkles,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { usePortfolio } from "@/context/PortfolioContext";
import { fmtCurrency, fmtDateTime, fmtPct, relativeTime } from "@/lib/format";
import { totalChangeCount } from "@/lib/portfolioDiff";
import type { ChangeSummary, UploadEvent } from "@/lib/portfolioTypes";

export function UploadHistory() {
  const { uploads, portfolio } = usePortfolio();
  const [expanded, setExpanded] = useState<string | null>(uploads[0]?.uploadId ?? null);

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Upload History"
        subtitle="Versioned ledger of every committed portfolio upload. Each entry has the file's checksum, row counts, status mix, and a full change-summary against the prior upload."
        right={
          <Link to="/upload" className="btn-primary text-xs">
            New upload
          </Link>
        }
      />

      {uploads.length === 0 ? (
        <Card pad>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full border border-slate-700 bg-slate-800 text-slate-400">
              <History className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-slate-200">No uploads yet</h3>
            <p className="mt-1 max-w-md text-xs text-slate-400">
              Upload a portfolio CSV or XLSX to start the audit trail. Each upload is timestamped, checksummed, and diffed against the previous one.
            </p>
            <Link to="/upload" className="btn-primary mt-4 text-xs">
              Go to Upload
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {uploads.map((u) => {
            const isActive = portfolio?.id === u.uploadId;
            const isOpen = expanded === u.uploadId;
            const changes = u.changeSummary ? totalChangeCount(u.changeSummary) : 0;
            return (
              <Card key={u.uploadId} pad={false}>
                <button
                  onClick={() => setExpanded(isOpen ? null : u.uploadId)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-800/30"
                >
                  {isOpen ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                  <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-100">{u.fileName}</span>
                      {isActive && <Pill tone="gain">Active</Pill>}
                      {u.warnings.length > 0 && (
                        <Pill tone="warn">
                          <AlertTriangle className="h-3 w-3" />
                          {u.warnings.length} warning{u.warnings.length === 1 ? "" : "s"}
                        </Pill>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                      <span>{fmtDateTime(u.uploadedAt)}</span>
                      <span>·</span>
                      <span>{relativeTime(u.uploadedAt)}</span>
                      <span>·</span>
                      <span className="mono">checksum {u.checksum}</span>
                    </div>
                  </div>
                  <div className="hidden shrink-0 grid-cols-4 gap-4 text-right text-xs lg:grid">
                    <Stat label="Rows" value={u.numberOfRows} />
                    <Stat label="Current" value={u.countCurrent} tone="gain" />
                    <Stat label="Watch" value={u.countWatchlist} tone="warn" />
                    <Stat label="Exited" value={u.countExited} tone="loss" />
                  </div>
                  <div className="hidden shrink-0 lg:block">
                    <div className="label-xs text-right">Total</div>
                    <div className="mono text-right text-sm text-slate-100">
                      {fmtCurrency(u.totalPortfolioValue, portfolio?.baseCurrency ?? "INR", { compact: true })}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-800 px-4 pt-3 pb-4">
                    {/* Mobile stat grid (visible only on small screens) */}
                    <div className="mb-3 grid grid-cols-4 gap-2 text-center text-xs lg:hidden">
                      <Stat label="Rows" value={u.numberOfRows} />
                      <Stat label="Current" value={u.countCurrent} tone="gain" />
                      <Stat label="Watch" value={u.countWatchlist} tone="warn" />
                      <Stat label="Exited" value={u.countExited} tone="loss" />
                    </div>

                    {u.warnings.length > 0 && (
                      <div className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5">
                        <div className="mb-1 flex items-center gap-2 text-[11px] font-medium text-amber-300">
                          <AlertTriangle className="h-3 w-3" />
                          Parse warnings
                        </div>
                        <ul className="space-y-0.5 text-[11px] text-amber-200/90">
                          {u.warnings.map((w, i) => (
                            <li key={i} className="flex gap-2">
                              {w.field && <span className="mono">{w.field}:</span>}
                              <span>{w.message}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <ChangeSummaryView u={u} changes={changes} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "gain" | "warn" | "loss";
}) {
  const color =
    tone === "gain" ? "text-emerald-300" : tone === "warn" ? "text-amber-300" : tone === "loss" ? "text-rose-300" : "text-slate-200";
  return (
    <div>
      <div className="label-xs">{label}</div>
      <div className={`mono text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function ChangeSummaryView({ u, changes }: { u: UploadEvent; changes: number }) {
  if (!u.changeSummary) {
    return (
      <div className="rounded-md border border-slate-800 bg-ink-700/30 p-2.5 text-[11px] text-slate-400">
        First upload — nothing to diff against.
      </div>
    );
  }
  if (changes === 0) {
    return (
      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-[11px] text-emerald-200">
        <CheckCircle2 className="mr-1.5 inline h-3 w-3" />
        No material changes vs. previous upload.
      </div>
    );
  }
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-gold-400" />
        <span className="label-xs">Change summary vs prior upload — {changes} total</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <DiffBlock label="Added" tone="gain" rows={u.changeSummary.added.map((a) => `${a.ticker} — ${a.companyName}`)} />
        <DiffBlock label="Removed" tone="loss" rows={u.changeSummary.removed.map((a) => `${a.ticker} — ${a.companyName}`)} />
        <DiffBlock
          label="Quantity changed"
          tone="info"
          rows={u.changeSummary.quantityChanged.map((a) => `${a.ticker}: ${a.from} → ${a.to} (${a.delta > 0 ? "+" : ""}${a.delta})`)}
        />
        <DiffBlock
          label="Price changed"
          tone="info"
          rows={u.changeSummary.priceChanged.map(
            (a) => `${a.ticker}: ${a.from} → ${a.to} (${fmtPct(a.pctChange, { sign: true })})`,
          )}
        />
        <DiffBlock
          label="Weight changed"
          tone="warn"
          rows={u.changeSummary.weightChanged.map(
            (a) => `${a.ticker}: ${(a.from * 100).toFixed(2)}% → ${(a.to * 100).toFixed(2)}%`,
          )}
        />
        <DiffBlock
          label="Status changed"
          tone="warn"
          rows={u.changeSummary.statusChanged.map((a) => `${a.ticker}: ${a.from} → ${a.to}`)}
        />
        <DiffBlock
          label="Core/Satellite reclassified"
          tone="warn"
          rows={u.changeSummary.classificationChanged.map((a) => `${a.ticker}: ${a.from} → ${a.to}`)}
        />
      </div>
    </div>
  );
}

function DiffBlock({
  label,
  rows,
  tone,
}: {
  label: string;
  rows: string[];
  tone: "gain" | "loss" | "warn" | "info";
}) {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-md border border-slate-800 bg-ink-700/30 p-2.5">
      <div className="mb-1.5 flex items-center gap-2">
        <Pill tone={tone}>{label}</Pill>
        <span className="text-[10px] text-slate-500">{rows.length}</span>
      </div>
      <ul className="space-y-0.5 text-[11px] text-slate-300">
        {rows.slice(0, 6).map((r, i) => (
          <li key={i} className="truncate">
            {r}
          </li>
        ))}
        {rows.length > 6 && <li className="text-slate-500">… and {rows.length - 6} more</li>}
      </ul>
    </div>
  );
}
