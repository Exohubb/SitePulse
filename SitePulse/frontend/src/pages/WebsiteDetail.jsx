import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Globe, RefreshCw, Clock, TrendingUp,
  AlertTriangle, CheckCircle2, Shield, Zap, Activity
} from "lucide-react";
import { format, parseISO } from "date-fns";
import clsx from "clsx";
import Charts     from "../components/Charts.jsx";
import UptimeBar  from "../components/UptimeBar.jsx";
import { api }    from "../api.js";

// ── Small stat tile ────────────────────────────────────────────────
function StatTile({ label, value, sub, color = "text-white" }) {
  return (
    <div className="bg-surface rounded-xl px-4 py-3 text-center">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={clsx("text-2xl font-bold font-mono", color)}>{value ?? "—"}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Period tabs ────────────────────────────────────────────────────
const PERIODS = [
  { label: "1 Hour",   key: "stats_1h"  },
  { label: "24 Hours", key: "stats_24h" },
  { label: "7 Days",   key: "stats_7d"  },
  { label: "30 Days",  key: "stats_30d" },
];

const PERIOD_HOURS = { stats_1h: 1, stats_24h: 24, stats_7d: 168, stats_30d: 720 };

// ── Log status badge ───────────────────────────────────────────────
function LogBadge({ status }) {
  const s = {
    UP:        "badge-up",
    DOWN:      "badge-down",
    SLOW:      "badge-slow",
    SSL_ERROR: "bg-purple-500/10 text-purple-400 text-xs px-2 py-0.5 rounded-full font-medium",
  };
  return <span className={s[status] || "badge-down"}>{status}</span>;
}

// ══════════════════════════════════════════════════════════════════
export default function WebsiteDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();

  const [data,       setData]       = useState(null);
  const [chart,      setChart]      = useState([]);
  const [logs,       setLogs]       = useState([]);
  const [logFilter,  setLogFilter]  = useState("");     // UP | DOWN | SLOW | ""
  const [period,     setPeriod]     = useState("stats_24h");
  const [loading,    setLoading]    = useState(true);
  const [chartHours, setChartHours] = useState(24);
  const [tab,        setTab]        = useState("logs"); // logs | incidents

  const load = useCallback(async () => {
    try {
      const [dash, chartData, logData] = await Promise.all([
        api.getWebsiteDashboard(id),
        api.getHistory(id, chartHours),
        api.getWebsiteLogs(id, logFilter),
      ]);
      setData(dash);
      setChart(chartData);
      setLogs(logData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id, chartHours, logFilter]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const handleRangeChange = async (hours) => {
    setChartHours(hours);
    const c = await api.getHistory(id, hours);
    setChart(c);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card text-center py-12">
        <p className="text-slate-400">Monitor not found.</p>
        <button onClick={() => navigate("/monitors")} className="btn mt-3 text-xs">Back to Monitors</button>
      </div>
    );
  }

  const { website, thirty_day_bar, incidents } = data;
  const stats    = data[period];
  const statusCfg = {
    UP:      { color: "text-up",   bg: "bg-up/10",   ring: "ring-up/30"   },
    DOWN:    { color: "text-down", bg: "bg-down/10", ring: "ring-down/30" },
    SLOW:    { color: "text-slow", bg: "bg-slow/10", ring: "ring-slow/30" },
    UNKNOWN: { color: "text-slate-400", bg: "bg-slate-700/30", ring: "ring-slate-700" },
  };
  const sc = statusCfg[data.current_status] || statusCfg.UNKNOWN;

  return (
    <div className="space-y-5 pb-20 md:pb-0">

      {/* ── Back + Title ────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate("/monitors")}
          className="btn-ghost p-2 mt-0.5 flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-white">{website.name}</h1>
            <span className={clsx(
              "text-xs px-3 py-1 rounded-full font-medium ring-1",
              sc.color, sc.bg, sc.ring
            )}>
              {data.current_status}
            </span>
          </div>
          <a
            href={website.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-slate-500 font-mono hover:text-brand-400 transition-colors mt-0.5 inline-block"
          >
            {website.url} ↗
          </a>
          {data.last_checked && (
            <p className="text-[10px] text-slate-600 mt-0.5 font-mono">
              Last checked: {format(parseISO(data.last_checked), "MMM dd, HH:mm:ss")}
            </p>
          )}
        </div>

        <button onClick={load} className="btn-ghost p-2 flex-shrink-0" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ── Period Tabs ─────────────────────────────────────────── */}
      <div className="flex gap-1 bg-surface-card border border-surface-muted rounded-lg p-1 w-fit">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={clsx(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              period === p.key ? "bg-brand-500 text-white" : "text-slate-400 hover:text-white"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Stats Grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile
          label="Uptime"
          value={stats ? `${stats.uptime_pct}%` : "—"}
          sub={`${stats?.up ?? 0}/${stats?.total ?? 0} checks`}
          color={stats?.uptime_pct >= 99 ? "text-up" : stats?.uptime_pct >= 90 ? "text-slow" : "text-down"}
        />
        <StatTile label="Avg Response" value={stats?.avg_rt ? `${stats.avg_rt}ms` : "—"} sub="when UP"          color="text-brand-400" />
        <StatTile label="Min Response" value={stats?.min_rt ? `${stats.min_rt}ms` : "—"} sub="fastest check"    color="text-up"        />
        <StatTile label="Max Response" value={stats?.max_rt ? `${stats.max_rt}ms` : "—"} sub="slowest check"    color="text-slow"      />
        <StatTile label="Outages"      value={stats?.down ?? 0}                            sub="failed checks"   color={stats?.down > 0 ? "text-down" : "text-slate-400"} />
        <StatTile label="Slow"         value={stats?.slow ?? 0}                            sub="above threshold" color={stats?.slow > 0 ? "text-slow" : "text-slate-400"} />
      </div>

      {/* ── 30-Day Uptime Bar ────────────────────────────────────── */}
      <UptimeBar
        data={thirty_day_bar}
        uptimePct={data.stats_30d?.uptime_pct}
      />

      {/* ── Response Time Chart ──────────────────────────────────── */}
      <Charts
        data={chart}
        title="Response Time History"
        showRangeSelector={true}
        onRangeChange={handleRangeChange}
      />

      {/* ── Tabs: Logs | Incidents ───────────────────────────────── */}
      <div className="space-y-3">
        {/* Tab selector */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1 bg-surface-card border border-surface-muted rounded-lg p-1">
            <button
              onClick={() => setTab("logs")}
              className={clsx("px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                tab === "logs" ? "bg-brand-500 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              Check Logs <span className="ml-1 text-[10px] opacity-70">({logs.length})</span>
            </button>
            <button
              onClick={() => setTab("incidents")}
              className={clsx("px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                tab === "incidents" ? "bg-brand-500 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              Incidents <span className="ml-1 text-[10px] opacity-70">({incidents.length})</span>
            </button>
          </div>

          {/* Log filter (only shown on logs tab) */}
          {tab === "logs" && (
            <div className="flex gap-1 bg-surface-card border border-surface-muted rounded-lg p-1">
              {["", "UP", "DOWN", "SLOW"].map(f => (
                <button
                  key={f}
                  onClick={async () => {
                    setLogFilter(f);
                    const l = await api.getWebsiteLogs(id, f);
                    setLogs(l);
                  }}
                  className={clsx(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                    logFilter === f ? "bg-surface-muted text-white" : "text-slate-500 hover:text-white"
                  )}
                >
                  {f || "All"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── CHECK LOGS ─────────────────────────────────────────── */}
{tab === "logs" && (
  <div className="card p-0 overflow-hidden">

    {/* Desktop table header — hidden on mobile */}
    <div className="hidden sm:grid grid-cols-12 px-4 py-2.5 border-b border-surface-muted bg-surface">
      <span className="col-span-4 text-[10px] text-slate-500 uppercase tracking-wider">Timestamp</span>
      <span className="col-span-2 text-[10px] text-slate-500 uppercase tracking-wider">Status</span>
      <span className="col-span-2 text-[10px] text-slate-500 uppercase tracking-wider">Response</span>
      <span className="col-span-2 text-[10px] text-slate-500 uppercase tracking-wider">HTTP</span>
      <span className="col-span-2 text-[10px] text-slate-500 uppercase tracking-wider">SSL</span>
    </div>

    <div className="max-h-[420px] overflow-y-auto">
      {logs.length === 0 ? (
        <div className="text-center py-10 text-slate-600 text-sm">No logs found</div>
      ) : (
        logs.map((log) => (
          <div key={log.id}>
            {/* ── MOBILE card layout ────────────────── */}
            <div className={clsx(
              "sm:hidden px-4 py-3 border-b border-surface-muted/40",
              log.status === "DOWN" && "bg-down/5",
              log.status === "SLOW" && "bg-slow/5",
            )}>
              <div className="flex items-center justify-between mb-1">
                <LogBadge status={log.status} />
                <span className="text-[11px] font-mono text-slate-500">
                  {format(parseISO(log.timestamp), "HH:mm:ss")}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                <span>{format(parseISO(log.timestamp), "MMM dd")}</span>
                {log.response_time_ms && (
                  <span className={clsx(
                    log.response_time_ms > 2000 ? "text-slow" :
                    log.response_time_ms > 1000 ? "text-yellow-400" : "text-slate-300"
                  )}>
                    {log.response_time_ms}ms
                  </span>
                )}
                {log.http_status_code && (
                  <span className={log.http_status_code >= 500 ? "text-down" : "text-slate-400"}>
                    HTTP {log.http_status_code}
                  </span>
                )}
                {log.ssl_expiry_days != null && (
                  <span className={log.ssl_expiry_days <= 14 ? "text-slow" : "text-slate-500"}>
                    SSL {log.ssl_expiry_days}d
                  </span>
                )}
              </div>
              {log.error_message && log.status !== "UP" && (
                <p className="text-[10px] text-down/80 font-mono mt-1 truncate">↳ {log.error_message}</p>
              )}
            </div>

            {/* ── DESKTOP table row ─────────────────── */}
            <div className={clsx(
              "hidden sm:grid grid-cols-12 px-4 py-2.5 text-xs border-b border-surface-muted/40 hover:bg-surface-muted/20 transition-colors",
              log.status === "DOWN" && "bg-down/3",
              log.status === "SLOW" && "bg-slow/3",
            )}>
              <span className="col-span-4 font-mono text-slate-400">
                {format(parseISO(log.timestamp), "MMM dd, HH:mm:ss")}
              </span>
              <span className="col-span-2"><LogBadge status={log.status} /></span>
              <span className={clsx(
                "col-span-2 font-mono",
                log.response_time_ms > 2000 ? "text-slow" :
                log.response_time_ms > 1000 ? "text-yellow-400" : "text-slate-300"
              )}>
                {log.response_time_ms ? `${log.response_time_ms}ms` : "—"}
              </span>
              <span className={clsx(
                "col-span-2 font-mono",
                log.http_status_code >= 500 ? "text-down" :
                log.http_status_code >= 400 ? "text-slow" : "text-slate-300"
              )}>
                {log.http_status_code || "—"}
              </span>
              <span className={clsx(
                "col-span-2 font-mono",
                log.ssl_expiry_days != null && log.ssl_expiry_days <= 14 ? "text-slow" : "text-slate-400"
              )}>
                {log.ssl_expiry_days != null ? `${log.ssl_expiry_days}d` : "—"}
              </span>
              {log.error_message && log.status !== "UP" && (
                <div className="col-span-12 text-[10px] text-down/80 font-mono mt-1">
                  ↳ {log.error_message}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  </div>
)}


        {/* ── INCIDENTS TAB ───────────────────────────────────────── */}
        {tab === "incidents" && (
          <div className="space-y-2">
            {incidents.length === 0 ? (
              <div className="card text-center py-10">
                <CheckCircle2 className="w-10 h-10 text-up mx-auto mb-2 opacity-40" />
                <p className="text-slate-400 text-sm">No incidents for this website.</p>
              </div>
            ) : (
              incidents.map(inc => (
                <div key={inc.id} className="card space-y-2 animate-fadein">
                  <div className="flex items-start gap-3">
                    {inc.is_resolved
                      ? <CheckCircle2 className="w-5 h-5 text-up mt-0.5 flex-shrink-0" />
                      : <AlertTriangle className="w-5 h-5 text-down mt-0.5 flex-shrink-0 animate-pulse" />
                    }
                    <div className="flex-1 min-w-0">
                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={clsx(
                          "text-xs font-mono px-2 py-0.5 rounded-full",
                          inc.failure_type?.includes("SERVER") ? "bg-down/10 text-down" :
                          inc.failure_type?.includes("TIMEOUT") ? "bg-slow/10 text-slow" :
                          "bg-purple-500/10 text-purple-400"
                        )}>
                          {inc.failure_type || "UNKNOWN"}
                        </span>
                        {inc.http_status_code && (
                          <span className="text-xs bg-surface text-slate-400 px-2 py-0.5 rounded-full font-mono">
                            HTTP {inc.http_status_code}
                          </span>
                        )}
                        <span className={clsx("text-xs ml-auto", inc.is_resolved ? "text-up" : "text-down")}>
                          {inc.is_resolved ? "✓ RESOLVED" : "⚡ ONGOING"}
                        </span>
                      </div>

                      {/* Error + cause */}
                      <p className="text-sm text-slate-300 mt-1.5">{inc.error_message}</p>
                      {inc.possible_cause && (
                        <p className="text-xs text-slate-500 italic mt-0.5">Cause: {inc.possible_cause}</p>
                      )}

                      {/* Timestamps */}
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-600 font-mono flex-wrap">
                        <span>Started: {format(parseISO(inc.started_at), "MMM dd, HH:mm:ss")}</span>
                        {inc.resolved_at && (
                          <span>Resolved: {format(parseISO(inc.resolved_at), "MMM dd, HH:mm:ss")}</span>
                        )}
                        {inc.duration_seconds && (
                          <span className="text-slate-500">
                            Duration: {Math.floor(inc.duration_seconds / 60)}m {inc.duration_seconds % 60}s
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
