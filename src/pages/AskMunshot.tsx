import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Sparkles, Send, FileText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { usePortfolio } from "@/context/PortfolioContext";
import {
  activeOf,
  mvBase,
  pnlBase,
  costBaseOf,
  vehicleOf,
  managerOf,
  bucketBy,
  allocationBucketOf,
  ALLOCATION_BUCKETS,
  holdingYears,
} from "@/lib/portfolioAnalytics";
import { changeColor, fmtPct, fmtDate } from "@/lib/format";
import { FUND_LOOKTHROUGH, hasLookthrough } from "@/data/mockFundLookthrough";
import { MOCK_CAPITAL_CALLS } from "@/data/mockCapitalCalls";
import { FAMILY_TARGETS, targetFor } from "@/data/mockFamilyTargets";

const ASOF = new Date("2026-06-30");

const CHIPS = [
  "What's my total exposure to HDFC Bank?",
  "Capital gains this financial year?",
  "Where am I overlapping between direct and funds?",
  "What did I add in the last 3 months?",
  "Ankita's allocation vs target",
  "Capital calls due next quarter",
];

type Msg = { id: number; role: "user" | "assistant"; content: ReactNode; sources?: string[] };

export function AskMunshot() {
  const { portfolio, fmtFromBase } = usePortfolio();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const idRef = useRef(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);

  const active = useMemo(() => (portfolio ? activeOf(portfolio) : []), [portfolio]);

  // Consolidated single-stock exposure (direct + look-through) — built once.
  const exposureMap = useMemo(() => {
    const m = new Map<string, { ticker: string; companyName: string; direct: number; viaFunds: number; managers: Map<string, number> }>();
    const touch = (t: string, n: string) => {
      let r = m.get(t);
      if (!r) { r = { ticker: t, companyName: n, direct: 0, viaFunds: 0, managers: new Map() }; m.set(t, r); }
      return r;
    };
    for (const h of active) {
      const v = vehicleOf(h);
      if ((v === "Direct Equity" && h.assetClass === "Equity") || v === "Private") touch(h.ticker, h.companyName).direct += mvBase(h);
      if (hasLookthrough(managerOf(h)) && (v === "Mutual Fund" || v === "PMS" || v === "AIF")) {
        for (const line of FUND_LOOKTHROUGH[managerOf(h)]) {
          const r = touch(line.ticker, line.companyName);
          const amt = mvBase(h) * line.weight;
          r.viaFunds += amt;
          r.managers.set(managerOf(h), (r.managers.get(managerOf(h)) ?? 0) + amt);
        }
      }
    }
    return m;
  }, [active]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  if (!portfolio) return null;
  const pf = portfolio;
  const nav = portfolio.totalValue;
  const fmt = (n: number, opts?: { compact?: boolean; sign?: boolean }) => fmtFromBase(n, { compact: true, ...opts });

  // ---- answer engine -------------------------------------------------------
  type ExposureEntry = { ticker: string; companyName: string; direct: number; viaFunds: number; managers: Map<string, number> };
  function findExposure(q: string): ExposureEntry | null {
    let best: ExposureEntry | null = null;
    let bestScore = 0;
    for (const r of exposureMap.values()) {
      const tk = r.ticker.toLowerCase();
      let score = 0;
      if (q.includes(tk)) score += tk.length + 5;
      const words = r.companyName.toLowerCase().replace(/ltd\.?|limited|industries|company|services|software|broking|solutions|technologies/g, "").split(/\s+/).filter((w) => w.length >= 4);
      for (const w of words) if (q.includes(w)) score += w.length;
      if (score > bestScore) { bestScore = score; best = r; }
    }
    return bestScore >= 4 ? best : null;
  }

  function answer(raw: string): { content: ReactNode; sources: string[] } {
    const q = raw.toLowerCase();

    // Capital calls / liquidity
    if (q.includes("capital call") || q.includes("drawdown") || q.includes("liquidity") || q.includes("dry powder") || (q.includes("call") && q.includes("quarter"))) {
      const upcoming = MOCK_CAPITAL_CALLS.filter((c) => { const d = (+new Date(c.dueDate) - +ASOF) / 86400000; return d >= 0 && d <= 120; }).sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));
      const total = upcoming.reduce((s, c) => s + c.amount, 0);
      return {
        content: (
          <Answer headline={`₹${Math.round(total).toLocaleString("en-IN")} Cr across ${upcoming.length} expected calls`} sub="Capital calls due in the next ~120 days — keep this liquidity ready.">
            <KVList rows={upcoming.map((c) => ({ k: `${c.fund} · ${fmtDate(c.dueDate)}`, v: `₹${c.amount} Cr`, tone: c.probability === "Confirmed" ? "gain" : "warn" }))} />
          </Answer>
        ),
        sources: ["Manager statements", "Capital-call notices"],
      };
    }

    // Overlap
    if (q.includes("overlap") || (q.includes("both") && q.includes("fund"))) {
      const ov = [...exposureMap.values()].filter((r) => r.direct > 0 && r.viaFunds > 0).sort((a, b) => (b.direct + b.viaFunds) - (a.direct + a.viaFunds));
      return {
        content: (
          <Answer headline={`${ov.length} names overlap`} sub="Held directly AND inside managed schemes — watch for hidden concentration.">
            <KVList rows={ov.slice(0, 6).map((r) => ({ k: `${r.ticker} — ${r.companyName}`, v: `${fmt(r.direct + r.viaFunds)} · ${(((r.direct + r.viaFunds) / nav) * 100).toFixed(1)}% NAV`, tone: "warn" }))} />
          </Answer>
        ),
        sources: ["Holdings feed", "AMFI look-through"],
      };
    }

    // Capital gains / tax
    if (q.includes("capital gain") || q.includes("tax") || q.includes("gains this") || q.includes("realized") || q.includes("harvest")) {
      const realized = pf.holdings.filter((h) => h.status === "Exited").reduce((s, h) => s + pnlBase(h), 0);
      const unreal = active.reduce((s, h) => s + pnlBase(h), 0);
      const ltGain = active.filter((h) => holdingYears(h, ASOF) >= 1 && pnlBase(h) > 0).reduce((s, h) => s + pnlBase(h), 0);
      const stGain = active.filter((h) => holdingYears(h, ASOF) < 1 && pnlBase(h) > 0).reduce((s, h) => s + pnlBase(h), 0);
      const losses = active.filter((h) => pnlBase(h) < 0).reduce((s, h) => s + Math.abs(pnlBase(h)), 0);
      return {
        content: (
          <Answer headline={`Realized ${fmt(realized, { sign: true })} · Unrealized ${fmt(unreal, { sign: true })}`} sub="Financial year 2026-27 (illustrative).">
            <KVList rows={[
              { k: "Long-term unrealized gains", v: fmt(ltGain) },
              { k: "Short-term unrealized gains", v: fmt(stGain) },
              { k: "Harvestable losses available", v: fmt(losses), tone: "loss" },
            ]} />
          </Answer>
        ),
        sources: ["Holdings feed", "Custodian statements"],
      };
    }

    // Recently added
    if (q.includes("last 3 month") || q.includes("last three month") || q.includes("recently added") || q.includes("new position") || (q.includes("added") && q.includes("month")) || q.includes("freshly")) {
      const recent = active.filter((h) => h.purchaseDate && (+ASOF - +new Date(h.purchaseDate)) / 86400000 <= 95).sort((a, b) => +new Date(b.purchaseDate!) - +new Date(a.purchaseDate!));
      return {
        content: (
          <Answer headline={`${recent.length} new position${recent.length === 1 ? "" : "s"} in the last 3 months`} sub="Freshly added across direct equity and managers.">
            {recent.length ? <KVList rows={recent.map((h) => ({ k: `${h.ticker} — ${h.companyName}`, v: `${vehicleOf(h)} · ${fmtDate(h.purchaseDate!)}`, tone: "info" }))} /> : <p className="text-xs text-slate-500">No positions added in the last 3 months.</p>}
          </Answer>
        ),
        sources: ["Holdings feed", "Manager statements"],
      };
    }

    // Allocation vs target (per member)
    const memberHit = FAMILY_TARGETS.find((t) => q.includes(t.member.toLowerCase()) || q.includes(t.member.split(" ")[0].toLowerCase()));
    if (memberHit || q.includes("target") || q.includes("expected") || q.includes("allocation vs")) {
      const member = memberHit?.member ?? FAMILY_TARGETS[0].member;
      const hs = active.filter((h) => (h.familyMember ?? "Glow Ventures LLP") === member);
      const mv = hs.reduce((s, h) => s + mvBase(h), 0);
      const tgt = targetFor(member)?.targets;
      const rows = ALLOCATION_BUCKETS.map((b) => {
        const a = mv > 0 ? (hs.filter((h) => allocationBucketOf(h) === b).reduce((s, h) => s + mvBase(h), 0) / mv) * 100 : 0;
        const t = tgt?.[b] ?? 0;
        return { k: b, v: `${a.toFixed(0)}% vs ${t}% (${(a - t >= 0 ? "+" : "") + (a - t).toFixed(0)} pts)`, tone: (Math.abs(a - t) <= 3 ? "gain" : a - t > 0 ? "warn" : "loss") as Tone };
      });
      return {
        content: (
          <Answer headline={`${member} — actual vs target`} sub={`${fmt(mv)} NAV · ${targetFor(member)?.mandate ?? ""}`}>
            <KVList rows={rows} />
          </Answer>
        ),
        sources: ["Holdings feed", "IC mandate (Notion)"],
      };
    }

    // Single-stock exposure
    const exp = findExposure(q);
    if (exp && (q.includes("exposure") || q.includes("how much") || q.includes("hold") || q.includes("own") || q.includes("position"))) {
      const total = exp.direct + exp.viaFunds;
      const rows = [
        { k: "Direct equity", v: exp.direct > 0 ? fmt(exp.direct) : "—" },
        ...[...exp.managers.entries()].sort((a, b) => b[1] - a[1]).map(([mgr, amt]) => ({ k: `via ${mgr}`, v: fmt(amt), tone: "info" as Tone })),
      ];
      return {
        content: (
          <Answer headline={`${fmt(total)} total — ${((total / nav) * 100).toFixed(1)}% of NAV`} sub={`Your consolidated exposure to ${exp.companyName} (direct + look-through).`}>
            <KVList rows={rows} />
          </Answer>
        ),
        sources: ["Holdings feed", "AMFI look-through", "Annual reports"],
      };
    }

    // Top movers
    if (q.includes("top") || q.includes("best") || q.includes("worst") || q.includes("mover") || q.includes("gainer") || q.includes("loser")) {
      const sorted = [...active].sort((a, b) => b.returnPct - a.returnPct);
      const top = sorted.slice(0, 3);
      const bottom = sorted.slice(-3).reverse();
      return {
        content: (
          <Answer headline="Top movers since cost" sub="Best and worst performers in the active book.">
            <div className="grid gap-3 sm:grid-cols-2">
              <KVList title="Best" rows={top.map((h) => ({ k: h.ticker, v: fmtPct(h.returnPct, { sign: true }), tone: "gain" }))} />
              <KVList title="Worst" rows={bottom.map((h) => ({ k: h.ticker, v: fmtPct(h.returnPct, { sign: true }), tone: "loss" }))} />
            </div>
          </Answer>
        ),
        sources: ["Holdings feed"],
      };
    }

    // In-house vs advisor
    if (q.includes("in-house") || q.includes("in house") || q.includes("advisor") || q.includes("adviser") || q.includes("inhouse")) {
      const split = bucketBy(active, (h) => h.managerType ?? "In-house");
      return {
        content: (
          <Answer headline="In-house vs advisor" sub="Capital and return delivered by each.">
            <KVList rows={split.map((b) => ({ k: `${b.key} · ${(b.weight * 100).toFixed(0)}% of book`, v: `${fmt(b.mv)} · ${fmtPct(b.returnPct, { sign: true })}`, tone: b.returnPct >= 0 ? "gain" : "loss" }))} />
          </Answer>
        ),
        sources: ["Holdings feed"],
      };
    }

    // Vehicle breakdown
    if (q.includes("vehicle") || q.includes("breakdown") || q.includes("mutual fund") || q.includes("aif") || q.includes("pms") || q.includes("direct equity")) {
      const split = bucketBy(active, vehicleOf);
      return {
        content: (
          <Answer headline="Book by vehicle" sub="Consolidated value across how the money is held.">
            <KVList rows={split.map((b) => ({ k: `${b.key} · ${b.count} position${b.count === 1 ? "" : "s"}`, v: `${fmt(b.mv)} · ${(b.weight * 100).toFixed(0)}%` }))} />
          </Answer>
        ),
        sources: ["Holdings feed"],
      };
    }

    // Default snapshot
    const topSector = bucketBy(active, (h) => h.sector)[0];
    return {
      content: (
        <Answer headline={`${fmt(nav)} NAV across ${active.length} active holdings`} sub="Ask me anything about your book — exposure, gains, overlap, allocation, liquidity or what's new.">
          <KVList rows={[
            { k: "Largest sector", v: topSector ? `${topSector.key} · ${(topSector.weight * 100).toFixed(0)}%` : "—" },
            { k: "Vehicles", v: `${new Set(active.map(vehicleOf)).size} types` },
            { k: "Entities", v: `${new Set(active.map((h) => h.familyMember ?? "Glow Ventures LLP")).size}` },
          ]} />
        </Answer>
      ),
      sources: ["Holdings feed"],
    };
  }

  function send(text: string) {
    const t = text.trim();
    if (!t || thinking) return;
    const userId = idRef.current++;
    setMessages((m) => [...m, { id: userId, role: "user", content: t }]);
    setInput("");
    setThinking(true);
    const { content, sources } = answer(t);
    timer.current = window.setTimeout(() => {
      setMessages((m) => [...m, { id: idRef.current++, role: "assistant", content, sources }]);
      setThinking(false);
    }, 560);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <style>{`
        @keyframes msgIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .msg-in { animation: msgIn 240ms cubic-bezier(0.23,1,0.32,1); }
        @keyframes dot { 0%,80%,100% { opacity:.25; transform: translateY(0);} 40% { opacity:1; transform: translateY(-2px);} }
        .typing span { animation: dot 1.1s infinite both; }
        .typing span:nth-child(2){ animation-delay:.15s } .typing span:nth-child(3){ animation-delay:.3s }
        @media (prefers-reduced-motion: reduce){ .msg-in{animation:none} .typing span{animation:none} }
      `}</style>

      <PageHeader
        eyebrow="Intelligence"
        title="Ask Munshot"
        subtitle="A conversational analyst over your entire book — and the notes, PDFs, transcripts and filings flowing into it."
        right={<Pill tone="info">Reads holdings · look-through · notes · filings</Pill>}
      />

      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="msg-in flex gap-3">
              <Avatar />
              <div className="max-w-2xl rounded-xl rounded-tl-sm border border-slate-800 bg-ink-700/40 p-4">
                <div className="text-sm text-slate-200">
                  Hello — I'm <span className="font-semibold text-gold-400">Munshot</span>. Ask me about your consolidated exposure
                  (direct + funds), capital gains, overlap, allocation vs target, liquidity for capital calls, or what's new in the book.
                  I read your holdings, fund look-through, broker notes, annual reports, transcripts and Notion notes.
                </div>
                <div className="mt-3 text-[11px] text-slate-500">Try one of these:</div>
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`msg-in flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && <Avatar />}
              <div
                className={[
                  "max-w-2xl rounded-xl p-4 text-sm",
                  m.role === "user"
                    ? "rounded-tr-sm border border-gold-500/30 bg-gold-500/10 text-slate-100"
                    : "rounded-tl-sm border border-slate-800 bg-ink-700/40 text-slate-200",
                ].join(" ")}
              >
                {m.content}
                {m.sources && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-800/70 pt-2.5">
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500">
                      <FileText className="h-3 w-3" /> Sources
                    </span>
                    {m.sources.map((s) => <Pill key={s}>{s}</Pill>)}
                  </div>
                )}
              </div>
            </div>
          ))}

          {thinking && (
            <div className="msg-in flex gap-3">
              <Avatar />
              <div className="rounded-xl rounded-tl-sm border border-slate-800 bg-ink-700/40 px-4 py-3">
                <div className="typing flex items-center gap-1 text-gold-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-slate-800 p-4">
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {CHIPS.map((c) => (
              <button
                key={c}
                onClick={() => send(c)}
                disabled={thinking}
                className="rounded-full border border-slate-700 bg-ink-800/60 px-2.5 py-1 text-[11px] text-slate-400 transition-colors hover:border-gold-400/40 hover:text-slate-200 active:scale-[0.97] disabled:opacity-50"
              >
                {c}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about exposure, gains, overlap, allocation, liquidity…"
              className="flex-1 rounded-md border border-slate-700 bg-ink-700 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 ring-focus"
            />
            <button type="submit" disabled={thinking || !input.trim()} className="btn-primary px-3 py-2.5 active:scale-[0.97] disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

type Tone = "default" | "gain" | "loss" | "warn" | "info";

function Avatar() {
  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-gradient-to-br from-gold-500 to-gold-600 text-ink-950 shadow-glow">
      <Sparkles className="h-4 w-4" />
    </div>
  );
}

function Answer({ headline, sub, children }: { headline: string; sub?: string; children?: ReactNode }) {
  return (
    <div>
      <div className="text-base font-semibold tabular text-slate-100">{headline}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

function KVList({ title, rows }: { title?: string; rows: { k: string; v: string; tone?: Tone }[] }) {
  return (
    <div>
      {title && <div className="label-xs mb-1.5">{title}</div>}
      <ul className="space-y-1">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-ink-800/40 px-2.5 py-1.5 text-xs">
            <span className="min-w-0 truncate text-slate-400">{r.k}</span>
            <span className={`mono shrink-0 ${r.tone === "gain" ? "text-gain" : r.tone === "loss" ? "text-loss" : r.tone === "warn" ? "text-amber-300" : r.tone === "info" ? "text-sky-300" : "text-slate-200"}`}>{r.v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
