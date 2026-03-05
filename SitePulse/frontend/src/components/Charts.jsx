import { useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine
} from "recharts";
import clsx from "clsx";

const RANGES = [
  { label: "1H",  hours: 1   },
  { label: "6H",  hours: 6   },
  { label: "24H", hours: 24  },
  { label: "7D",  hours: 168 },
];

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card border border-surface-muted rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1 font-mono">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name === "avg_response_ms" ? "Response" : "Uptime"}:{" "}
          <span className="font-mono">{p.value}{p.name === "avg_response_ms" ? "ms" : "%"}</span>
        </p>
      ))}
    </div>
  );
};

export default function Charts({ data = [], title = "Response Time", showRangeSelector = false, onRangeChange }) {
  const [activeRange, setActiveRange] = useState("24H");

  const handleRange = (r) => {
    setActiveRange(r.label);
    onRangeChange?.(r.hours);
  };

  const downPoints = data.filter(d => d.status === "DOWN").map(d => d.time);

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {showRangeSelector && (
          <div className="flex gap-0.5 sm:gap-1 bg-surface rounded-lg p-1">
            {RANGES.map(r => (
              <button
                key={r.label}
                onClick={() => handleRange(r)}
                className={clsx(
                  "px-2 sm:px-3 py-1 rounded-md text-[11px] sm:text-xs font-mono font-medium transition-all",
                  activeRange === r.label ? "bg-brand-500 text-white" : "text-slate-400 hover:text-white"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-center">
          <div>
            <p className="text-slate-600 text-sm">No data yet</p>
            <p className="text-slate-700 text-xs mt-1">Checks appear after 60s</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Response time */}
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Response Time (ms)</p>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={data} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRT" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} />
                {downPoints.map(t => (
                  <ReferenceLine key={t} x={t} stroke="#ef4444" strokeWidth={1} strokeOpacity={0.5} />
                ))}
                <Area type="monotone" dataKey="avg_response_ms" name="avg_response_ms" stroke="#0ea5e9" strokeWidth={2} fill="url(#gRT)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Uptime % */}
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Uptime per check</p>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={data} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="uptime_pct" name="uptime_pct" fill="#22c55e" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
