import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import clsx from "clsx";

const TYPE_COLOR = {
  DNS_FAILURE:        "text-purple-400",
  TIMEOUT:            "text-slow",
  SERVER_ERROR:       "text-down",
  CONNECTION_REFUSED: "text-down",
  SSL_EXPIRED:        "text-purple-400",
  SLOW_RESPONSE:      "text-slow",
};

export default function IncidentLog({ incidents = [] }) {
  if (!incidents.length) {
    return (
      <div className="card flex flex-col items-center py-10 text-center">
        <CheckCircle2 className="w-10 h-10 text-up mb-2 opacity-50" />
        <p className="text-sm text-slate-400">No incidents yet</p>
        <p className="text-xs text-slate-600 mt-0.5">All systems nominal</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-white mb-3">Recent Incidents</h3>
      <div className="space-y-2">
        {incidents.slice(0, 8).map(inc => (
          <div key={inc.id} className="flex items-start gap-3 bg-surface rounded-lg px-3 py-2.5">
            {inc.is_resolved
              ? <CheckCircle2 className="w-4 h-4 text-up mt-0.5 flex-shrink-0" />
              : <AlertTriangle className="w-4 h-4 text-down mt-0.5 flex-shrink-0 animate-pulse" />
            }
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={clsx("text-xs font-mono font-medium", TYPE_COLOR[inc.failure_type] || "text-slate-300")}>
                  {inc.failure_type || "UNKNOWN"}
                </span>
                <span className="text-[10px] text-slate-600 flex-shrink-0">
                  {formatDistanceToNow(parseISO(inc.started_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">{inc.error_message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
