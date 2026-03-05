import { useState } from "react";
import clsx from "clsx";

const BAR_COLOR = {
  UP:      "bg-up   hover:opacity-80",
  DOWN:    "bg-down hover:opacity-80",
  SLOW:    "bg-slow hover:opacity-80",
  NO_DATA: "bg-surface-muted hover:opacity-60",
};

export default function UptimeBar({ data = [], uptimePct }) {
  const [tooltip, setTooltip] = useState(null);

  // On mobile show last 14 days, desktop full 30
  const visibleData = data;

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">30-Day History</h3>
        <span className={clsx(
          "text-sm font-mono font-bold",
          uptimePct >= 99 ? "text-up" :
          uptimePct >= 90 ? "text-slow" : "text-down"
        )}>
          {uptimePct != null ? `${uptimePct}%` : "—"} uptime
        </span>
      </div>

      {/* Bars */}
      <div className="relative flex gap-px sm:gap-0.5 items-stretch h-8 sm:h-10">
        {visibleData.map((day, i) => (
          <div
            key={day.date}
            className="relative flex-1 group cursor-pointer"
            onMouseEnter={() => setTooltip(i)}
            onMouseLeave={() => setTooltip(null)}
            onTouchStart={() => setTooltip(tooltip === i ? null : i)}
          >
            <div className={clsx(
              "w-full h-full rounded-[2px] transition-opacity duration-150",
              BAR_COLOR[day.status] || BAR_COLOR.NO_DATA
            )} />

            {/* Tooltip */}
            {tooltip === i && (
              <div className={clsx(
                "absolute z-50 bottom-full mb-2 bg-surface-card border border-surface-muted",
                "rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-xl animate-fadein pointer-events-none",
                // Flip to left side on right half of bar
                i > visibleData.length / 2 ? "right-0" : "left-0"
              )}>
                <p className="font-semibold text-white">{day.label}</p>
                <p className={clsx(
                  "font-mono mt-0.5",
                  day.status === "UP"      ? "text-up"   :
                  day.status === "DOWN"    ? "text-down" :
                  day.status === "SLOW"    ? "text-slow" : "text-slate-400"
                )}>
                  {day.uptime_pct != null ? `${day.uptime_pct}% uptime` : "No data"}
                </p>
                {day.total_checks > 0 && (
                  <p className="text-slate-500 mt-0.5">
                    {day.up_checks}/{day.total_checks} checks OK
                  </p>
                )}
                {day.down_checks > 0 && (
                  <p className="text-down mt-0.5">{day.down_checks} failed</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer legend */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-slate-600 font-mono hidden sm:block">
          {data[0]?.label || "30d ago"}
        </span>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {[
            { c: "bg-up",            l: "OK"       },
            { c: "bg-slow",          l: "Degraded" },
            { c: "bg-down",          l: "Outage"   },
            { c: "bg-surface-muted", l: "No data"  },
          ].map(x => (
            <div key={x.l} className="flex items-center gap-1">
              <div className={clsx("w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-sm", x.c)} />
              <span className="text-[10px] text-slate-500">{x.l}</span>
            </div>
          ))}
        </div>

        <span className="text-[10px] text-slate-600 font-mono hidden sm:block">Today</span>
      </div>
    </div>
  );
}
