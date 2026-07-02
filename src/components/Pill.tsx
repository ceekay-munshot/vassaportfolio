import { ReactNode } from "react";

type Tone = "default" | "gain" | "loss" | "warn" | "info" | "core" | "satellite";

const TONE: Record<Tone, string> = {
  default: "border-slate-700 bg-slate-800/60 text-slate-300",
  gain: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  loss: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  core: "border-slate-600 bg-slate-700/40 text-slate-200",
  satellite: "border-gold-500/30 bg-gold-500/10 text-gold-400",
};

export function Pill({
  children,
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
