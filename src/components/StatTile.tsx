import { ReactNode } from "react";
import { changeColor } from "@/lib/format";

export function StatTile({
  label,
  value,
  sub,
  delta,
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  delta?: number;
  icon?: ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="label-xs">{label}</div>
        {icon && <div className="text-slate-500">{icon}</div>}
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-100 tabular tracking-tight">{value}</div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {typeof delta === "number" && (
          <span className={`mono ${changeColor(delta)}`}>
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "■"} {Math.abs(delta).toFixed(2)}%
          </span>
        )}
        {sub && <span className="text-slate-400">{sub}</span>}
      </div>
    </div>
  );
}
