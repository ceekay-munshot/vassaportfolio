import { NavLink } from "react-router-dom";
import {
  Upload,
  Sunrise,
  LineChart,
  PieChart,
  ShieldAlert,
  Calculator,
  FileText,
  Sparkles,
  Users,
  Lock,
  Plug,
} from "lucide-react";
// `demo: true` = the screen is still on the inherited demo feed, so it's shown
// but LOCKED (visible for scope, not clickable) until rebuilt on real data.
// Live screens (Portfolio Monitor, Risk & Leverage) are fully navigable.
const NAV = [
  { to: "/upload", label: "Upload Portfolio", icon: Upload, group: "Setup" },
  { to: "/monitor", label: "Portfolio Monitor", icon: LineChart, group: "Daily" },
  { to: "/risk", label: "Risk & Leverage", icon: ShieldAlert, group: "Analytics" },
  { to: "/valuation", label: "Fundamentals", icon: Calculator, group: "Analytics" },
  { to: "/cio", label: "Morning CIO", icon: Sunrise, group: "Daily" },
  { to: "/sectors", label: "Sector Composition", icon: PieChart, group: "Allocation" },
  { to: "/family", label: "Family & Entities", icon: Users, group: "Allocation", demo: true },
  { to: "/research", label: "Broker Research", icon: FileText, group: "Intelligence", demo: true },
  { to: "/recommendations", label: "Recommendations", icon: Sparkles, group: "Action", demo: true },
  { to: "/data-sources", label: "Data Sources", icon: Plug, group: "Admin", demo: true },
] as const;

const GROUP_ORDER = ["Setup", "Daily", "Allocation", "Analytics", "Intelligence", "Action", "Admin"];

export function Sidebar() {
  const groups = NAV.reduce<Record<string, (typeof NAV)[number][]>>((acc, item) => {
    (acc[item.group] = acc[item.group] || []).push(item);
    return acc;
  }, {});
  const orderedGroups = GROUP_ORDER.filter((g) => groups[g]);

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-ink-900">
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-800 px-5">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-gold-500 to-gold-600 text-white shadow-glow">
          <span className="text-[13px] font-bold tracking-tight">NV</span>
        </div>
        <div className="leading-tight">
          <div className="font-display text-[15px] tracking-tight text-slate-100">NV Family Office</div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Portfolio Intelligence</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {orderedGroups.map((group) => (
          <div key={group} className="mb-4">
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              {group}
            </div>
            <ul className="space-y-0.5">
              {groups[group].map(({ to, label, icon: Icon, ...rest }) => {
                const demo = "demo" in rest && rest.demo;
                if (demo) {
                  return (
                    <li key={to}>
                      <div
                        title="Demo — rebuilt on your real data next"
                        className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-slate-600"
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{label}</span>
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-700 px-1.5 py-[1px] text-[9px] font-medium uppercase tracking-wide text-slate-500">
                          <Lock className="h-2.5 w-2.5" /> Demo
                        </span>
                      </div>
                    </li>
                  );
                }
                return (
                  <li key={to}>
                    <NavLink
                      to={to}
                      className={({ isActive }) =>
                        [
                          "group flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors",
                          isActive
                            ? "bg-slate-800/80 font-medium text-slate-100"
                            : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200",
                        ].join(" ")
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-800 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-700 text-xs font-semibold text-slate-200">
            NV
          </div>
          <div className="leading-tight">
            <div className="text-xs font-medium text-slate-200">Nirbhay Vassa</div>
            <div className="text-[10px] text-slate-500">Principal</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
