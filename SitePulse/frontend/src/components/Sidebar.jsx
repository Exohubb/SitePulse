import { NavLink } from "react-router-dom";
import { Activity, LayoutDashboard, Globe, AlertTriangle } from "lucide-react";
import clsx from "clsx";

const NAV = [
  { to: "/",          icon: LayoutDashboard, label: "Dashboard" },
  { to: "/monitors",  icon: Globe,           label: "Monitors"  },
  { to: "/incidents", icon: AlertTriangle,   label: "Incidents" },
];

export default function Sidebar() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 h-screen bg-surface-card border-r border-surface-muted fixed left-0 top-0 z-30">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-surface-muted">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">SitePulse</p>
            <p className="text-[10px] text-slate-500 font-mono">Website Monitoring</p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to} to={to} end={to === "/"}
              className={({ isActive }) => clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                isActive
                  ? "bg-brand-500/10 text-brand-400 font-medium"
                  : "text-slate-400 hover:text-white hover:bg-surface-muted"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-surface-muted">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-up rounded-full animate-pulse_slow" />
            <span className="text-xs text-slate-500 font-mono">Worker Active</span>
          </div>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-card border-t border-surface-muted z-30 flex">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to} end={to === "/"}
            className={({ isActive }) => clsx(
              "flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-all",
              isActive ? "text-brand-400" : "text-slate-500"
            )}
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
