import clsx from "clsx";

const STYLES = {
  blue:   "from-brand-500/10 border-brand-500/20 text-brand-400",
  green:  "from-up/10   border-up/20   text-up",
  red:    "from-down/10 border-down/20 text-down",
  yellow: "from-slow/10 border-slow/20 text-slow",
};

export default function StatusCard({ title, value, subtitle, icon: Icon, color = "blue" }) {
  return (
    <div className={clsx("card bg-gradient-to-br to-transparent border", STYLES[color])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white font-mono">{value ?? "—"}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="p-2.5 bg-white/5 rounded-lg">
            <Icon className="w-5 h-5 opacity-80" />
          </div>
        )}
      </div>
    </div>
  );
}
