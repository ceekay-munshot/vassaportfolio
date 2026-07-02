import { NavLink } from "react-router-dom";
import {
  Upload,
  Sunrise,
  LineChart,
  PieChart,
  ShieldAlert,
  FileText,
  Sparkles,
  Users,
  Lock,
  Plug,
} from "lucide-react";
import { usePortfolio } from "@/context/PortfolioContext";

// Tabs reachable even without a portfolio loaded.
const ALWAYS_ACCESSIBLE = new Set(["/upload"]);

// Trimmed to the screens that map to the NV objectives — no duplicate views.
const NAV = [
  { to: "/upload", label: "Upload Portfolio", icon: Upload, group: "Setup" },
  { to: "/monitor", label: "Portfolio Monitor", icon: LineChart, group: "Daily" },
  { to: "/cio", label: "Morning CIO", icon: Sunrise, group: "Daily" },
  { to: "/sectors", label: "Sector Composition", icon: PieChart, group: "Allocation" },
  { to: "/family", label: "Family & Entities", icon: Users, group: "Allocation" },
  { to: "/risk", label: "Risk & Performance", icon: ShieldAlert, group: "Analytics" },
  { to: "/research", label: "Broker Research", icon: FileText, group: "Intelligence" },
  { to: "/recommendations", label: "Recommendations", icon: Sparkles, group: "Action" },
  { to: "/data-sources", label: "Data Sources", icon: Plug, group: "Admin" },
] as const;

export function Sidebar() {
  const { portfolio } = usePortfolio();
  const hasPortfolio = !!portfolio;

  const groups = NAV.reduce<Record<string, typeof NAV[number][]>>((acc, item) => {
    (acc[item.group] = acc[item.group] || []).push(item);
    return acc;
  }, {});

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
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} className="mb-4">
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              {group}
            </div>
            <ul className="space-y-0.5">
              {items.map(({ to, label, icon: Icon }) => {
                const locked = !hasPortfolio && !ALWAYS_ACCESSIBLE.has(to);
                return (
                  <li key={to}>
                    <NavLink
                      to={to}
                      title={locked ? "Upload portfolio first" : undefined}
                      className={({ isActive }) =>
                        [
                          "group flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors",
                          isActive
                            ? "bg-slate-800/80 font-medium text-slate-100"
                            : locked
                              ? "text-slate-600 hover:bg-slate-800/20"
                              : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200",
                        ].join(" ")
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{label}</span>
                      {locked && <Lock className="ml-auto h-3 w-3 shrink-0 text-slate-700" />}
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
