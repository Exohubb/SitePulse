import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Pause, Play, ChevronDown, ChevronUp, Shield, Globe, ExternalLink, Clock } from "lucide-react";
import clsx from "clsx";

const CFG = {
  UP:      { dot: "dot-up",   badge: "badge-up",   ring: "ring-1 ring-up/30"     },
  DOWN:    { dot: "dot-down", badge: "badge-down", ring: "ring-1 ring-down/30"   },
  SLOW:    { dot: "dot-slow", badge: "badge-slow", ring: "ring-1 ring-slow/30"   },
  UNKNOWN: { dot: "dot-down", badge: "badge-down", ring: "ring-1 ring-slate-700" },
};

export default function MonitorCard({ monitor, onDelete, onToggle }) {
  const [open, setOpen] = useState(false);
  const navigate        = useNavigate();
  const s  = monitor.last_status || "UNKNOWN";
  const c  = CFG[s] || CFG.UNKNOWN;

  return (
    <div className={clsx("card transition-all duration-200 animate-fadein", c.ring)}>

      {/* ── Main row ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Status dot */}
        <span className={clsx(c.dot, "flex-shrink-0", s === "DOWN" && "animate-pulse_slow")} />

        {/* Name + URL */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate leading-tight">{monitor.name}</p>
          <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
            {monitor.url.replace(/^https?:\/\//, "")}
          </p>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Status badge — hidden on very small screens */}
          <span className={clsx(c.badge, "hidden xs:inline")}>{s}</span>

          {/* Response time — desktop only */}
          {monitor.last_response_time_ms && (
            <span className="text-xs font-mono text-slate-500 hidden md:inline px-1">
              {monitor.last_response_time_ms}ms
            </span>
          )}

          {/* Detail */}
          <button
            onClick={() => navigate(`/monitors/${monitor.id}`)}
            className="btn-ghost p-1.5 text-brand-400 hover:text-brand-300"
            title="View details"
          >
            <ExternalLink className="w-4 h-4" />
          </button>

          {/* Pause/Resume */}
          <button
            onClick={() => onToggle(monitor.id, !monitor.is_active)}
            className="btn-ghost p-1.5"
            title={monitor.is_active ? "Pause" : "Resume"}
          >
            {monitor.is_active
              ? <Pause className="w-4 h-4" />
              : <Play  className="w-4 h-4" />
            }
          </button>

          {/* Delete — desktop only inline, mobile in expand */}
          <button
            onClick={() => onDelete(monitor.id)}
            className="btn-ghost p-1.5 hover:text-down hidden sm:flex"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Expand toggle */}
          <button onClick={() => setOpen(!open)} className="btn-ghost p-1.5">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Status badge on mobile (below name row) */}
      <div className="flex items-center gap-2 mt-1.5 xs:hidden">
        <span className={c.badge}>{s}</span>
        {monitor.last_response_time_ms && (
          <span className="text-[11px] font-mono text-slate-500">
            {monitor.last_response_time_ms}ms
          </span>
        )}
      </div>

      {/* ── Expanded details ────────────────────────────────────── */}
      {open && (
        <div className="mt-3 pt-3 border-t border-surface-muted animate-slidein space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Tile icon={Clock}  label="Interval"  value={`${monitor.interval_seconds}s`} />
            <Tile icon={Globe}  label="Expected"  value={`HTTP ${monitor.expected_status_code}`} />
            <Tile icon={Shield} label="SSL Left"  value={monitor.ssl_expiry_days != null ? `${monitor.ssl_expiry_days}d` : "N/A"} />
            <Tile icon={Clock}  label="Retries"   value={`${monitor.retry_count}×`} />
          </div>

          {/* Mobile delete button */}
          <div className="flex sm:hidden justify-end">
            <button
              onClick={() => onDelete(monitor.id)}
              className="btn-ghost text-xs text-down/70 hover:text-down flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove Monitor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ icon: Icon, label, value }) {
  return (
    <div className="bg-surface rounded-lg px-3 py-2">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="w-3 h-3 text-slate-500" />
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-mono text-slate-200">{value}</p>
    </div>
  );
}
