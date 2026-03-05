import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { api } from "../api.js";
import { format, parseISO } from "date-fns";
import clsx from "clsx";

const TYPE_STYLE = {
  DNS_FAILURE:        "bg-purple-500/10 text-purple-400",
  TIMEOUT:            "bg-slow/10 text-slow",
  SERVER_ERROR:       "bg-down/10 text-down",
  CONNECTION_REFUSED: "bg-down/10 text-down",
  SSL_EXPIRED:        "bg-purple-500/10 text-purple-400",
  SLOW_RESPONSE:      "bg-slow/10 text-slow",
};

export default function Incidents() {
  const [incidents, setIncidents] = useState([]);
  const [filter,    setFilter]    = useState("all");
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    api.getIncidents("limit=100").then(setIncidents).finally(() => setLoading(false));
  }, []);

  const shown = incidents.filter(i =>
    filter === "all"      ? true :
    filter === "active"   ? !i.is_resolved :
    filter === "resolved" ?  i.is_resolved : true
  );

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Incidents</h1>
          <p className="text-xs text-slate-500 mt-0.5">{incidents.length} total records</p>
        </div>
        <div className="flex gap-1 bg-surface-card border border-surface-muted rounded-lg p-1 text-xs">
          {["all","active","resolved"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={clsx(
              "px-3 py-1.5 rounded-md capitalize font-medium transition-all",
              filter === f ? "bg-brand-500 text-white" : "text-slate-400 hover:text-white"
            )}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : shown.length === 0 ? (
        <div className="card text-center py-14">
          <CheckCircle2 className="w-12 h-12 text-up mx-auto mb-3 opacity-40" />
          <p className="text-slate-400 text-sm">No {filter !== "all" ? filter : ""} incidents.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map(inc => (
            <div key={inc.id} className="card space-y-2">
              <div className="flex items-start gap-3">
                {inc.is_resolved
                  ? <CheckCircle2 className="w-5 h-5 text-up mt-0.5 flex-shrink-0" />
                  : <AlertTriangle className="w-5 h-5 text-down mt-0.5 flex-shrink-0 animate-pulse" />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={clsx("text-xs font-mono px-2 py-0.5 rounded-full", TYPE_STYLE[inc.failure_type] || "bg-slate-700 text-slate-400")}>
                      {inc.failure_type || "UNKNOWN"}
                    </span>
                    {inc.http_status_code && (
                      <span className="text-xs bg-surface text-slate-400 px-2 py-0.5 rounded-full font-mono">HTTP {inc.http_status_code}</span>
                    )}
                    <span className={clsx("text-xs ml-auto", inc.is_resolved ? "text-up" : "text-down")}>
                      {inc.is_resolved ? "RESOLVED" : "ONGOING"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 mt-1.5">{inc.error_message}</p>
                  {inc.possible_cause && (
                    <p className="text-xs text-slate-500 mt-1 italic">{inc.possible_cause}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-600 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(parseISO(inc.started_at), "MMM dd, HH:mm:ss")}
                    </span>
                    {inc.duration_seconds && (
                      <span>Duration: {Math.floor(inc.duration_seconds/60)}m {inc.duration_seconds%60}s</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
